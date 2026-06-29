import * as fs from "fs/promises";
import * as path from "path";
import { FieldDefinition } from "./field-mapper.js";
import type { RelationDefinition } from "../commands/generate.js";
import type { SchemaGenerator } from "./schema-generator.js";
import { toCamelCase } from "./string-utils.js";

function generateModelBlock(
  name: string,
  fields: FieldDefinition[],
  relations: RelationDefinition[],
  softDelete: boolean
): string {
  const lines: string[] = [];
  lines.push(`model ${name} {`);

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

/**
 * Find the exact closing-brace line of a Prisma model using brace-depth counting.
 * Correctly handles nested braces in @@index(), @@unique(), and custom attributes.
 */
function findModelCloseBraceLine(schema: string, modelName: string): number | null {
  const lines = schema.split("\n");
  let inModel = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inModel) {
      if (line.trimStart().startsWith(`model ${modelName} {`)) {
        inModel = true;
        braceDepth = 0;
        for (const ch of line) {
          if (ch === "{") braceDepth++;
          else if (ch === "}") braceDepth--;
        }
        if (braceDepth === 0) return i;
      }
      continue;
    }

    for (const ch of line) {
      if (ch === "{") braceDepth++;
      else if (ch === "}") braceDepth--;
    }

    if (braceDepth === 0) return i;
  }

  return null;
}

/**
 * Find the last closing brace at depth 0 in the schema.
 * Uses character-level brace-depth counting, not regex.
 */
function findSchemaEnd(schema: string): number | null {
  let depth = 0;
  let lastCloseAtDepth0 = -1;

  for (let i = 0; i < schema.length; i++) {
    const ch = schema[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) lastCloseAtDepth0 = i;
    }
  }

  return lastCloseAtDepth0 >= 0 ? lastCloseAtDepth0 : null;
}

export class PrismaSchemaGenerator implements SchemaGenerator {
  getSchemaPath(projectDir: string): string {
    return path.join(projectDir, "prisma", "schema.prisma");
  }

  async generate(projectDir: string): Promise<void> {
    const { spawn } = await import("child_process");
    return new Promise((resolve, reject) => {
      // shell:true needed for Windows PATH resolution of npx
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

    if (schema.includes(`model ${resourceName}`)) {
      throw new Error(`Model ${resourceName} already exists in schema`);
    }

    const modelBlock = generateModelBlock(resourceName, fields, relations, softDelete);

    const endIdx = findSchemaEnd(schema);
    if (endIdx === null) {
      throw new Error("Invalid Prisma schema: no closing brace found");
    }

    schema = schema.slice(0, endIdx + 1) + "\n\n" + modelBlock + "\n";

    for (const rel of relations) {
      if (rel.type === "belongsTo") {
        const inverseFieldName = toCamelCase(resourceName) + "s";

        const closeLine = findModelCloseBraceLine(schema, rel.target);
        if (closeLine !== null) {
          const lines = schema.split("\n");

          let alreadyExists = false;
          for (let j = closeLine - 1; j >= 0; j--) {
            const l = lines[j].trim();
            if (l.startsWith(`model ${rel.target} {`)) break;
            if (l.includes(`${inverseFieldName} ${resourceName}[]`)) {
              alreadyExists = true;
              break;
            }
          }

          if (!alreadyExists) {
            const indent = lines[closeLine].match(/^\s*/)?.[0] ?? "";
            const inverseLine = `  ${inverseFieldName} ${resourceName}[]`;
            lines[closeLine] = `${inverseLine}
${indent}}`;
            schema = lines.join("\n");
          }
        }
      }
    }

    await fs.writeFile(schemaPath, schema, "utf-8");
  }
}
