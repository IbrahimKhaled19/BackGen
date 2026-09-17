import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  // V4.6.1 base hardening defaults
  BODY_SIZE_LIMIT: z.string().default("1mb"),
  REQUEST_TIMEOUT_MS: z.coerce.number().default(30000),
  CORS_ALLOWED_ORIGINS: z.string().default(""),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  REDIS_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
