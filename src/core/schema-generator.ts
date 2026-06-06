import { FieldDefinition } from "./field-mapper.js";
import type { RelationDefinition } from "../commands/generate.js";
import { PrismaSchemaGenerator } from "./schema-generator.prisma.js";
import { DrizzleSchemaGenerator } from "./schema-generator.drizzle.js";
import { MongooseSchemaGenerator } from "./schema-generator.mongoose.js";

export interface SchemaGenerator {
  addModel(
    projectDir: string,
    resourceName: string,
    fields: FieldDefinition[],
    relations?: RelationDefinition[],
    softDelete?: boolean
  ): Promise<void>;

  getSchemaPath(projectDir: string): string;

  generate?(projectDir: string): Promise<void>;
  initSchema?(projectDir: string): Promise<void>;
}

export function createSchemaGenerator(orm: string): SchemaGenerator {
  switch (orm) {
    case "drizzle":
      return new DrizzleSchemaGenerator();
    case "mongoose":
      return new MongooseSchemaGenerator();
    case "prisma":
    default:
      return new PrismaSchemaGenerator();
  }
}
