import * as fs from "fs/promises";
import * as path from "path";
import { FieldDefinition } from "./field-mapper.js";
import type { RelationDefinition } from "../commands/generate.js";
import type { SchemaGenerator } from "./schema-generator.js";

function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function mongooseType(type: string): string {
  const mapping: Record<string, string> = {
    string: "String",
    number: "Number",
    boolean: "Boolean",
    date: "Date",
    datetime: "Date",
  };
  return mapping[type] ?? "String";
}

export class MongooseSchemaGenerator implements SchemaGenerator {
  getSchemaPath(projectDir: string): string {
    return path.join(projectDir, "src", "models");
  }

  async addModel(
    projectDir: string,
    resourceName: string,
    fields: FieldDefinition[],
    relations: RelationDefinition[] = [],
    softDelete: boolean = false
  ): Promise<void> {
    const modelsDir = this.getSchemaPath(projectDir);
    await fs.mkdir(modelsDir, { recursive: true });

    const modelName = toPascalCase(resourceName);
    const fileName = `${resourceName}.model.ts`;
    const filePath = path.join(modelsDir, fileName);

    // Check if file already exists
    try {
      await fs.access(filePath);
      throw new Error(`Model file for ${resourceName} already exists at ${filePath}`);
    } catch (e: unknown) {
      if (e instanceof Error && e.message?.includes("already exists")) throw e;
    }

    const lines: string[] = [];
    lines.push(`import mongoose, { Schema, Document } from "mongoose";`);
    lines.push("");
    lines.push(`export interface I${modelName} extends Document {`);
    lines.push(`  _id: string;`);

    for (const field of fields) {
      lines.push(`  ${field.name}: ${field.tsType};`);
    }

    for (const rel of relations) {
      if (rel.type === "belongsTo") {
        lines.push(`  ${rel.name}: mongoose.Types.ObjectId;`);
      }
    }

    if (softDelete) {
      lines.push(`  deletedAt?: Date;`);
    }

    lines.push(`  createdAt: Date;`);
    lines.push(`  updatedAt: Date;`);
    lines.push(`}`);
    lines.push("");

    lines.push(`const ${modelName}Schema = new Schema<I${modelName}>({`);

    for (const field of fields) {
      const mType = mongooseType(field.type);
      lines.push(`  ${field.name}: { type: ${mType} },`);
    }

    for (const rel of relations) {
      if (rel.type === "belongsTo") {
        lines.push(`  ${rel.name}: { type: Schema.Types.ObjectId, ref: "${toPascalCase(rel.target)}" },`);
      }
    }

    if (softDelete) {
      lines.push(`  deletedAt: { type: Date, default: null },`);
    }

    lines.push(`}, {`);
    lines.push(`  timestamps: true,`);
    lines.push(`});`);

    // Add soft delete filter plugin
    if (softDelete) {
      lines.push("");
      lines.push(`${modelName}Schema.pre("find", function () {`);
      lines.push(`  this.where({ deletedAt: null });`);
      lines.push(`});`);
    }

    lines.push("");
    lines.push(`export const ${modelName} = mongoose.model<I${modelName}>("${modelName}", ${modelName}Schema);`);

    await fs.writeFile(filePath, lines.join("\n") + "\n", "utf-8");

    // Update index.ts barrel export
    await this.updateIndex(modelsDir, modelName, resourceName);
  }

  private async updateIndex(modelsDir: string, modelName: string, resourceName: string): Promise<void> {
    const indexPath = path.join(modelsDir, "index.ts");
    const exportLine = `export { ${modelName} } from "./${resourceName}.model.js";`;

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
