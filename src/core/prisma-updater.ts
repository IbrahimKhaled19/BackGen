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
  let schema = await fs.readFile(schemaPath, "utf-8");

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

  schema = schema.slice(0, lastBrace + 1) + "\n\n" + modelBlock + "\n";

  // Add inverse relation fields to target models
  // For each belongsTo relation (e.g., Appointment belongsTo Patient),
  // add `appointments Appointment[]` to the Patient model
  for (const rel of relations) {
    if (rel.type === "belongsTo") {
      const inverseFieldName = toCamelCase(resourceName) + "s";
      const inverseLine = `  ${inverseFieldName} ${resourceName}[]`;

      // Find the target model and add the inverse field before its closing brace
      const modelRegex = new RegExp(`(model ${rel.target} \\{[\\s\\S]*?)(\\n\\})`);
      const match = schema.match(modelRegex);
      if (match) {
        const modelContent = match[1];
        // Only add if not already present
        if (!modelContent.includes(`${inverseFieldName} ${resourceName}[]`)) {
          schema = schema.replace(
            match[0],
            modelContent + "\n" + inverseLine + "\n}"
          );
        }
      }
    }
  }

  await fs.writeFile(schemaPath, schema, "utf-8");
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

function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}
