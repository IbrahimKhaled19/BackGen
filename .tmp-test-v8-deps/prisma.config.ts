import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const PLACEHOLDER_URL = "postgresql://user:password@localhost:5432/placeholder";

function readDatabaseUrl(): string {
  try {
    return env("DATABASE_URL");
  } catch {
    // DATABASE_URL not set yet. Use a placeholder so `prisma generate` and
    // config validation can run before the user has filled in .env.
    // Real connection happens at PrismaClient() runtime.
    return PLACEHOLDER_URL;
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: readDatabaseUrl(),
  },
});
