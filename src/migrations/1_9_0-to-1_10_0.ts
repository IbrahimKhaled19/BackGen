import type { ProjectManifest, FileOwner } from "../core/manifest.js";
import * as fs from "fs/promises";
import * as path from "path";

export const from = "1.9.0";
export const to = "1.10.0";
export const description =
  "Populate ownership register for all known generated files";

/**
 * Known generated files and their ownership classification.
 * Matches the OWNERSHIP map in init.ts.
 */
const KNOWN_FILES: Record<string, FileOwner> = {
  "src/app.ts": "shared",
  "src/server.ts": "framework",
  "src/config/env.ts": "framework-editable",
  "src/config/database.ts": "framework-editable",
  "src/config/swagger.ts": "framework-editable",
  "src/utils/api-error.ts": "framework",
  "src/utils/async-handler.ts": "framework",
  "src/utils/response.ts": "framework",
  "src/middleware/core/errors.ts": "framework",
  "src/middleware/core/logger.ts": "framework",
  "src/middleware/core/validate.ts": "framework",
  "src/middleware/security/cors-strict.ts": "framework",
  "src/middleware/security/sanitize.ts": "framework",
  "src/middleware/observability/request-id.ts": "framework",
  "src/middleware/observability/request-timeout.ts": "framework",
  "src/middleware/observability/health.ts": "framework",
  "src/middleware/graceful-shutdown.ts": "framework",
  "src/services/logger.service.ts": "framework",
  "package.json": "shared",
  "tsconfig.json": "framework-editable",
  ".env.example": "shared",
  ".gitignore": "shared",
  "README.md": "shared",
  "vitest.config.ts": "framework-editable",
  "eslint.config.js": "framework-editable",
  "prisma/schema.prisma": "user",
  "prisma.config.ts": "framework-editable",
  "drizzle.config.ts": "framework-editable",
  "src/db/schema/index.ts": "framework",
  "src/models/index.ts": "framework",
};

export async function up(
  projectDir: string,
  manifest: ProjectManifest
): Promise<void> {
  // Only populate if files field is empty (no prior ownership tracking)
  if (Object.keys(manifest.files).length > 0) return;

  const files: ProjectManifest["files"] = {};

  for (const [relPath, owner] of Object.entries(KNOWN_FILES)) {
    try {
      await fs.access(path.join(projectDir, relPath));
      files[relPath] = { owner };
    } catch {
      // File doesn't exist — skip
    }
  }

  // ORM-specific patterns (directory scans)
  const ormDirs: Array<{ prefix: string; owner: FileOwner }> = [
    { prefix: "prisma/seeds/", owner: "user" },
    { prefix: "src/db/schema/", owner: "user" },
    { prefix: "src/models/", owner: "user" },
  ];

  for (const { prefix, owner } of ormDirs) {
    try {
      const entries = await fs.readdir(path.join(projectDir, prefix));
      for (const entry of entries) {
        files[prefix + entry] = { owner };
      }
    } catch {
      // Directory doesn't exist — skip
    }
  }

  // Docker files
  const dockerFiles = ["Dockerfile", "docker-compose.yml"];
  for (const f of dockerFiles) {
    try {
      await fs.access(path.join(projectDir, f));
      files[f] = { owner: "shared" };
    } catch {
      // Doesn't exist
    }
  }

  manifest.files = files;
}
