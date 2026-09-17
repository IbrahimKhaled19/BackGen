import cors from "cors";
import { env } from "../../config/env.js";

// Env-driven CORS: empty = allow all (dev), set = strict allowlist (prod).
// Set CORS_ALLOWED_ORIGINS="http://app.example.com,http://admin.example.com" in prod.
const allowed = env.CORS_ALLOWED_ORIGINS
  ? env.CORS_ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
  : [];

if (allowed.length === 0) {
  console.warn("[cors] CORS_ALLOWED_ORIGINS not set — defaulting to same-origin. Set it in production to allow specific origins.");
}

export const corsStrict = allowed.length > 0
  ? cors({ origin: allowed, credentials: true })
  : cors({ origin: false });
