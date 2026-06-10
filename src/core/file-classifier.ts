import type { FileOwner } from "./manifest.js";

/**
 * Classify a generated file path by ownership.
 *
 * Determines which files BackGen can overwrite during upgrade
 * vs. which belong to the user and must never be touched.
 */
export function classifyFile(outputPath: string, _orm: string): FileOwner {
  const normalized = outputPath.replace(/\\/g, "/");

  // ── User-owned (never touch) ──────────────────────────────────
  if (isUserCode(normalized)) return "user";

  // ── Framework (safe to overwrite) ─────────────────────────────
  if (isFramework(normalized)) return "framework";

  // ── Framework-editable (smart merge) ──────────────────────────
  if (isFrameworkEditable(normalized)) return "framework-editable";

  // ── Shared (generated skeleton, user extends) ─────────────────
  if (isShared(normalized)) return "shared";

  // ORM-specific user code
  if (normalized === "prisma/schema.prisma") return "user";
  if (normalized.startsWith("prisma/seeds/")) return "user";
  if (normalized.startsWith("src/db/schema/")) return "user";
  if (normalized.startsWith("src/models/")) return "user";

  // Fallback: framework
  return "framework";
}

function isUserCode(path: string): boolean {
  if (path.startsWith("src/modules/")) return true;
  if (path.startsWith("tests/") && path.endsWith(".test.ts")) return true;
  if (path.startsWith("src/middleware/tenant.ts")) return true;
  if (path.startsWith("src/middleware/rbac.ts")) return true;
  return false;
}

function isFramework(path: string): boolean {
  // Core server entry
  if (path === "src/server.ts") return true;

  // Middleware (all subdirs)
  if (path.startsWith("src/middleware/core/") && path.endsWith(".ts")) return true;
  if (path.startsWith("src/middleware/security/") && path.endsWith(".ts")) return true;
  if (path.startsWith("src/middleware/observability/") && path.endsWith(".ts")) return true;
  if (path === "src/middleware/graceful-shutdown.ts") return true;

  // Services
  if (path.startsWith("src/services/") && path.endsWith(".ts")) return true;

  // Utils
  if (path.startsWith("src/utils/") && path.endsWith(".ts")) return true;

  return false;
}

function isFrameworkEditable(path: string): boolean {
  if (path.startsWith("src/config/") && path.endsWith(".ts")) return true;
  if (path === "package.json") return true;
  if (path === "tsconfig.json") return true;
  if (path === ".env.example") return true;
  if (path === ".gitignore") return true;
  if (path === "vitest.config.ts") return true;
  if (path === "eslint.config.js") return true;
  if (path === "prisma.config.ts") return true;
  if (path === "drizzle.config.ts") return true;
  return false;
}

function isShared(path: string): boolean {
  if (path === "src/app.ts") return true;
  if (path === "Dockerfile") return true;
  if (path === "docker-compose.yml") return true;
  if (path === ".dockerignore") return true;
  if (path === "README.md") return true;
  return false;
}
