import * as fs from "fs/promises";
import * as path from "path";
import { FieldDefinition } from "./field-mapper.js";

export async function addModelToSchema(
  projectDir: string,
  resourceName: string,
  fields: FieldDefinition[]
): Promise<void> {
  const schemaPath = path.join(projectDir, "prisma", "schema.prisma");
  const schema = await fs.readFile(schemaPath, "utf-8");

  // Check if model already exists
  if (schema.includes(`model ${resourceName}`)) {
    throw new Error(`Model ${resourceName} already exists in schema`);
  }

  const modelBlock = generateModelBlock(resourceName, fields);

  // Find the last model definition and append after it
  const lastModelEnd = schema.lastIndexOf("}");
  if (lastModelEnd === -1) {
    throw new Error("Invalid Prisma schema: no model definitions found");
  }

  const updatedSchema = schema.slice(0, lastModelEnd + 1) + "\n\n" + modelBlock + "\n";

  await fs.writeFile(schemaPath, updatedSchema, "utf-8");
}

function generateModelBlock(resourceName: string, fields: FieldDefinition[]): string {
  const fieldLines = fields
    .map((f) => `  ${f.name} ${f.prismaType}`)
    .join("\n");

  return `model ${resourceName} {
  id String @id @default(uuid())
${fieldLines}
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`;
}
