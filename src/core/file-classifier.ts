import type { FileOwner } from "./manifest.js";

/**
 * Generated files whose ownership is decided by exact path rather than by the
 * prefix rules below. This is the single source of truth — `init`, `doctor`
 * and `sync` all read it, so a new generated file is registered once.
 */
export const KNOWN_FILES: Record<string, FileOwner> = {
  // App & Server
  "src/app.ts": "shared",
  "src/server.ts": "framework",
  // Config
  "src/config/env.ts": "framework-editable",
  "src/config/database.ts": "framework-editable",
  "src/config/swagger.ts": "framework-editable",
  "src/middleware/auth.ts": "framework",
  // Utils
  "src/utils/api-error.ts": "framework",
  "src/utils/async-handler.ts": "framework",
  "src/utils/response.ts": "framework",
  // Middleware (core)
  "src/middleware/core/errors.ts": "framework",
  "src/middleware/core/logger.ts": "framework",
  "src/middleware/core/validate.ts": "framework",
  // Middleware (security)
  "src/middleware/security/cors-strict.ts": "framework",
  "src/middleware/security/sanitize.ts": "framework",
  // Middleware (observability)
  "src/middleware/observability/request-id.ts": "framework",
  "src/middleware/observability/request-timeout.ts": "framework",
  "src/middleware/observability/health.ts": "framework",
  // Middleware (root)
  "src/middleware/graceful-shutdown.ts": "framework",
  // Services
  "src/services/logger.service.ts": "framework",
  // Config files
  "package.json": "shared",
  "tsconfig.json": "framework-editable",
  ".env.example": "shared",
  ".gitignore": "shared",
  ".dockerignore": "shared",
  ".npmrc": "shared",
  "README.md": "shared",
  "vitest.config.ts": "framework-editable",
  "eslint.config.js": "framework-editable",
  // Docker
  "Dockerfile": "shared",
  "docker-compose.yml": "shared",
  "docker-compose.prod.yml": "shared",
  "Caddyfile": "shared",
  // ORM
  "prisma/schema.prisma": "user",
  "prisma.config.ts": "framework-editable",
  "drizzle.config.ts": "framework-editable",
  "src/db/schema/index.ts": "user",
  "src/models/index.ts": "user",
};

/** Directories whose contents are user-owned and must never be overwritten */
export const USER_OWNED_DIRS = ["prisma/seeds/", "src/db/schema/", "src/models/"];

/**
 * Classify a generated file path by ownership.
 *
 * Determines which files BackGen can overwrite during upgrade
 * vs. which belong to the user and must never be touched.
 */
export function classifyFile(outputPath: string, _orm: string): FileOwner {
  const normalized = outputPath.replace(/\\/g, "/");

  // Exact paths are authoritative — check them before the prefix rules
  const known = KNOWN_FILES[normalized];
  if (known) return known;

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
