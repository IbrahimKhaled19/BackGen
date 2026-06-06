import * as fs from "fs/promises";
import * as path from "path";
import { FieldDefinition } from "./field-mapper.js";
import type { RelationDefinition } from "../commands/generate.js";
import type { SchemaGenerator } from "./schema-generator.js";

function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function generateModelBlock(
  name: string,
  fields: FieldDefinition[],
  relations: RelationDefinition[],
  softDelete: boolean
): string {
  const lines: string[] = [];
  lines.push(`model ${name} {`);
  lines.push(`  id        String   @id @default(uuid())`);

  for (const field of fields) {
    const { prismaType } = getPrismaType(field.type);
    lines.push(`  ${field.name} ${prismaType}`);
  }

  for (const rel of relations) {
    if (rel.type === "belongsTo") {
      lines.push(`  ${rel.name}    ${rel.target} @relation(fields: [${rel.name}Id], references: [id])`);
      lines.push(`  ${rel.name}Id String`);
    } else if (rel.type === "hasMany") {
      const child = toCamelCase(rel.target) + (rel.target.endsWith("s") ? "es" : "s");
      lines.push(`  ${child} ${rel.target}[]`);
    }
  }

  if (softDelete) {
    lines.push(`  deletedAt DateTime?`);
  }

  lines.push(`  createdAt DateTime @default(now())`);
  lines.push(`  updatedAt DateTime @updatedAt`);
  lines.push(`}`);
  return lines.join("\n");
}

export function getPrismaType(type: string): { prismaType: string; zodType: string; tsType: string } {
  const mapping: Record<string, { prismaType: string; zodType: string; tsType: string }> = {
    string: { prismaType: "String", zodType: "z.string()", tsType: "string" },
    number: { prismaType: "Float", zodType: "z.number()", tsType: "number" },
    boolean: { prismaType: "Boolean", zodType: "z.boolean()", tsType: "boolean" },
    date: { prismaType: "DateTime", zodType: "z.coerce.date()", tsType: "Date" },
  };
  return mapping[type] ?? { prismaType: "String", zodType: "z.string()", tsType: "string" };
}

export class PrismaSchemaGenerator implements SchemaGenerator {
  getSchemaPath(projectDir: string): string {
    return path.join(projectDir, "prisma", "schema.prisma");
  }

  async generate(projectDir: string): Promise<void> {
    const { spawn } = await import("child_process");
    return new Promise((resolve, reject) => {
      const child = spawn("npx", ["prisma", "generate"], {
        cwd: projectDir,
        stdio: "inherit",
        shell: true,
      });
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`prisma generate exited with code ${code}`));
      });
      child.on("error", reject);
    });
  }

  async addModel(
    projectDir: string,
    resourceName: string,
    fields: FieldDefinition[],
    relations: RelationDefinition[] = [],
    softDelete: boolean = false
  ): Promise<void> {
    const schemaPath = this.getSchemaPath(projectDir);
    let schema = await fs.readFile(schemaPath, "utf-8");

    // Check if model already exists
    if (schema.includes(`model ${resourceName}`)) {
      throw new Error(`Model ${resourceName} already exists in schema`);
    }

    const modelBlock = generateModelBlock(resourceName, fields, relations, softDelete);

    // Find the last closing brace and append after it
    const lastBrace = schema.lastIndexOf("}");
    if (lastBrace === -1) {
      throw new Error("Invalid Prisma schema: no closing brace found");
    }

    schema = schema.slice(0, lastBrace + 1) + "\n\n" + modelBlock + "\n";

    // Add inverse relation fields to target models
    for (const rel of relations) {
      if (rel.type === "belongsTo") {
        const inverseFieldName = toCamelCase(resourceName) + "s";
        const inverseLine = `  ${inverseFieldName} ${resourceName}[]`;

        const modelRegex = new RegExp(`(model ${rel.target} \\{[\\s\\S]*?)(\\n\\})`);
        const match = schema.match(modelRegex);
        if (match) {
          const modelContent = match[1];
          if (!modelContent.includes(`${inverseFieldName} ${resourceName}[]`)) {
            schema = schema.replace(
              match[0],
              `${modelContent}\n${inverseLine}${match[2]}`
            );
          }
        }
      }
    }

    await fs.writeFile(schemaPath, schema, "utf-8");
  }
}
