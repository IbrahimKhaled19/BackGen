import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill in DATABASE_URL.");
}

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
