import * as fs from "fs/promises";
import * as path from "path";
import { FieldDefinition } from "./field-mapper.js";
import type { RelationDefinition } from "../commands/generate.js";

export async function addModelToSchema(
  projectDir: string,
  resourceName: string,
  fields: FieldDefinition[],
  relations: RelationDefinition[] = []
): Promise<void> {
  const schemaPath = path.join(projectDir, "prisma", "schema.prisma");
  const schema = await fs.readFile(schemaPath, "utf-8");

  // Check if model already exists
  if (schema.includes(`model ${resourceName}`)) {
    throw new Error(`Model ${resourceName} already exists in schema`);
  }

  const modelBlock = generateModelBlock(resourceName, fields, relations);

  // Find the last closing brace and append after it
  const lastBrace = schema.lastIndexOf("}");
  if (lastBrace === -1) {
    throw new Error("Invalid Prisma schema: no closing brace found");
  }

  const updatedSchema = schema.slice(0, lastBrace + 1) + "\n\n" + modelBlock + "\n";

  await fs.writeFile(schemaPath, updatedSchema, "utf-8");
}

function generateModelBlock(
  resourceName: string,
  fields: FieldDefinition[],
  relations: RelationDefinition[]
): string {
  const fieldLines = fields
    .map((f) => `  ${f.name} ${f.prismaType}`)
    .join("\n");

  const relationLines = relations
    .map((r) => {
      if (r.type === "belongsTo") {
        const foreignKey = `${r.name}Id`;
        return `  ${foreignKey} String\n  ${r.name} ${r.target} @relation(fields: [${foreignKey}], references: [id], onDelete: Cascade)`;
      }
      // hasMany — inverse side, no FK here
      return `  ${r.name} ${r.target}[]`;
    })
    .join("\n");

  const allFields = [fieldLines, relationLines].filter(Boolean).join("\n");

  return `model ${resourceName} {
  id String @id @default(uuid())
${allFields}
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`;
}
