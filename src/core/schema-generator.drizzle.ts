import * as fs from "fs/promises";
import * as path from "path";
import { FieldDefinition } from "./field-mapper.js";
import type { RelationDefinition } from "../commands/generate.js";
import type { SchemaGenerator } from "./schema-generator.js";

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
}

function drizzleColumnType(type: string): string {
  const mapping: Record<string, string> = {
    string: "text",
    number: "doublePrecision",
    boolean: "boolean",
    date: "timestamp",
    datetime: "timestamp",
  };
  return mapping[type] ?? "text";
}

export class DrizzleSchemaGenerator implements SchemaGenerator {
  getSchemaPath(projectDir: string): string {
    return path.join(projectDir, "src", "db", "schema");
  }

  async addModel(
    projectDir: string,
    resourceName: string,
    fields: FieldDefinition[],
    relations: RelationDefinition[] = [],
    softDelete: boolean = false
  ): Promise<void> {
    const schemaDir = this.getSchemaPath(projectDir);
    await fs.mkdir(schemaDir, { recursive: true });

    const tableName = toSnakeCase(resourceName);
    const fileName = `${tableName}.ts`;
    const filePath = path.join(schemaDir, fileName);

    // Check if file already exists
    try {
      await fs.access(filePath);
      throw new Error(`Schema file for ${resourceName} already exists at ${filePath}`);
    } catch (e: unknown) {
      if (e instanceof Error && e.message?.includes("already exists")) throw e;
    }

    const lines: string[] = [];
    lines.push(`import { pgTable, uuid, text, timestamp, boolean, doublePrecision, integer, primaryKey } from "drizzle-orm/pg-core";`);
    lines.push("");

    const idName = `${tableName}Id`;
    lines.push(`export const ${resourceName} = pgTable("${tableName}", {`);
    lines.push(`  id: uuid("${idName}").defaultRandom().primaryKey(),`);

    for (const field of fields) {
      const col = drizzleColumnType(field.type);
      lines.push(`  ${field.name}: ${col}("${field.name}"),`);
    }

    for (const rel of relations) {
      if (rel.type === "belongsTo") {
        lines.push(`  ${rel.name}Id: uuid("${toSnakeCase(rel.name)}_id"),`);
      }
    }

    if (softDelete) {
      lines.push(`  deletedAt: timestamp("deleted_at"),`);
    }

    lines.push(`  createdAt: timestamp("created_at").defaultNow().notNull(),`);
    lines.push(`  updatedAt: timestamp("updated_at").defaultNow().notNull(),`);
    lines.push(`});`);

    // Add relations
    for (const rel of relations) {
      if (rel.type === "belongsTo") {
        lines.push("");
        lines.push(`export const ${resourceName}${rel.target}Relation = relations(${resourceName}, ({ one }) => ({`);
        lines.push(`  ${rel.name}: one(${rel.target}, {`);
        lines.push(`    fields: [${resourceName}.${rel.name}Id],`);
        lines.push(`    references: [${rel.target}.id],`);
        lines.push(`  }),`);
        lines.push(`}));`);
      } else if (rel.type === "hasMany") {
        lines.push("");
        lines.push(`export const ${resourceName}${rel.target}Relation = relations(${resourceName}, ({ many }) => ({`);
        lines.push(`  ${toSnakeCase(rel.target)}s: many(${rel.target}),`);
        lines.push(`}));`);
      }
    }

    await fs.writeFile(filePath, lines.join("\n") + "\n", "utf-8");

    // Update index.ts barrel export
    await this.updateIndex(schemaDir, resourceName, tableName);
  }

  private async updateIndex(schemaDir: string, resourceName: string, tableName: string): Promise<void> {
    const indexPath = path.join(schemaDir, "index.ts");
    const exportLine = `export { ${resourceName} } from "./${tableName}.js";`;

    try {
      const existing = await fs.readFile(indexPath, "utf-8");
      if (!existing.includes(exportLine)) {
        await fs.writeFile(indexPath, existing.trimEnd() + "\n" + exportLine + "\n", "utf-8");
      }
    } catch {
      await fs.writeFile(indexPath, exportLine + "\n", "utf-8");
    }
  }
}
