import chalk from "chalk";
import * as fs from "fs/promises";
import * as path from "path";
import { execSync } from "child_process";
import { readManifest, writeManifest } from "../core/manifest.js";
import type { FileOwner } from "../core/manifest.js";
import type { ProjectManifest } from "../core/manifest.js";

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  fix?: string;
}

interface DoctorOptions {
  fix?: boolean;
}

export async function doctorCommand(options: DoctorOptions = {}): Promise<void> {
  console.log(chalk.blue.bold("\n🩺 BackGen - Project Health Check\n"));

  const projectDir = process.cwd();
  const checks: CheckResult[] = [];

  // Run all checks
  checks.push(await checkNodeVersion());
  checks.push(await checkNpm());
  checks.push(await checkProjectDir(projectDir));
  checks.push(await checkEnvFile(projectDir));
  checks.push(await checkDatabaseUrl(projectDir));
  const manifest = await readManifest(projectDir);
  const orm = manifest?.project?.orm ?? "prisma";
  checks.push(await checkSchemaFile(projectDir, orm));
  checks.push(await checkDependencies(projectDir));

  // V6.1: Ownership integrity checks
  if (manifest) {
    checks.push(await checkFileIntegrity(projectDir, manifest.files));
    checks.push(await checkOwnershipIntegrity(projectDir, manifest.files));
  } else {
    checks.push({
      name: "File integrity",
      passed: true,
      message: "No manifest — skipping file integrity check",
    });
    checks.push({
      name: "Ownership integrity",
      passed: true,
      message: "No manifest — skipping ownership check",
    });
  }

  // Print results
  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    if (check.passed) {
      console.log(chalk.green(`✓ ${check.name}`));
      passed++;
    } else {
      console.log(chalk.red(`✗ ${check.name}`));
      console.log(chalk.gray(`  ${check.message}`));
      if (check.fix) {
        console.log(chalk.yellow(`  Fix: ${check.fix}`));
      }
      failed++;
    }
  }

  console.log("");
  if (failed === 0) {
    console.log(chalk.green.bold(`All ${passed} checks passed!`));
  } else {
    console.log(chalk.red.bold(`${failed} of ${passed + failed} check(s) failed.`));
  }

  // V6.5: --fix flag — reconcile manifest vs disk
  if (options.fix && manifest) {
    await applyOwnershipFix(projectDir, manifest);
  }

  console.log("");
}

async function checkNodeVersion(): Promise<CheckResult> {
  const version = process.version;
  const major = parseInt(version.slice(1).split(".")[0]);

  return {
    name: `Node.js ${version}`,
    passed: major >= 18,
    message: major < 18 ? `Node.js 18+ required, found ${version}` : "",
    fix: major < 18 ? "Upgrade Node.js to 18 or later" : undefined,
  };
}

async function checkNpm(): Promise<CheckResult> {
  try {
    const version = execSync("npm --version", { encoding: "utf-8" }).trim();
    return {
      name: `npm ${version}`,
      passed: true,
      message: "",
    };
  } catch {
    return {
      name: "npm",
      passed: false,
      message: "npm not found",
      fix: "Install Node.js (includes npm)",
    };
  }
}

async function checkProjectDir(dir: string): Promise<CheckResult> {
  try {
    await fs.access(path.join(dir, "package.json"));
    return {
      name: "Project directory",
      passed: true,
      message: "",
    };
  } catch {
    return {
      name: "Project directory",
      passed: false,
      message: "Not in a BackGen project directory (package.json not found)",
      fix: "Navigate to a BackGen project directory",
    };
  }
}

async function checkEnvFile(dir: string): Promise<CheckResult> {
  try {
    await fs.access(path.join(dir, ".env"));
    return {
      name: ".env file",
      passed: true,
      message: "",
    };
  } catch {
    return {
      name: ".env file",
      passed: false,
      message: ".env file not found",
      fix: "cp .env.example .env",
    };
  }
}

async function checkDatabaseUrl(dir: string): Promise<CheckResult> {
  try {
    const envContent = await fs.readFile(path.join(dir, ".env"), "utf-8");
    const hasDbUrl = envContent.includes("DATABASE_URL=");

    return {
      name: "DATABASE_URL",
      passed: hasDbUrl,
      message: hasDbUrl ? "" : "DATABASE_URL not set in .env",
      fix: hasDbUrl ? undefined : 'Add DATABASE_URL="postgresql://..." to .env',
    };
  } catch {
    return {
      name: "DATABASE_URL",
      passed: false,
      message: "Cannot read .env file",
    };
  }
}

async function checkSchemaFile(dir: string, orm: string): Promise<CheckResult> {
  const schemaPaths: Record<string, string> = {
    prisma: path.join(dir, "prisma", "schema.prisma"),
    drizzle: path.join(dir, "src", "db", "schema"),
    mongoose: path.join(dir, "src", "models"),
  };
  const labels: Record<string, string> = {
    prisma: "Prisma schema",
    drizzle: "Drizzle schema files",
    mongoose: "Mongoose models",
  };
  const schemaPath = schemaPaths[orm] ?? schemaPaths.prisma;
  try {
    await fs.access(schemaPath);
    return {
      name: labels[orm] ?? "Schema",
      passed: true,
      message: "",
    };
  } catch {
    return {
      name: labels[orm] ?? "Schema",
      passed: false,
      message: `${schemaPath} not found`,
      fix: "Run BackGen init to generate project",
    };
  }
}

async function checkDependencies(dir: string): Promise<CheckResult> {
  try {
    await fs.access(path.join(dir, "node_modules"));
    return {
      name: "Dependencies",
      passed: true,
      message: "",
    };
  } catch {
    return {
      name: "Dependencies",
      passed: false,
      message: "node_modules not found",
      fix: "Run npm install",
    };
  }
}

// ── Ownership integrity (V6.1) ─────────────────────────────────

/** Known generated files with their ownership classification */
const KNOWN_FILES: Record<string, FileOwner> = {
  // App & Server
  "src/app.ts": "shared",
  "src/server.ts": "framework",
  // Config
  "src/config/env.ts": "framework-editable",
  "src/config/database.ts": "framework-editable",
  "src/config/swagger.ts": "framework-editable",
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
  "README.md": "shared",
  "vitest.config.ts": "framework-editable",
  "eslint.config.js": "framework-editable",
  // Docker
  "Dockerfile": "shared",
  "docker-compose.yml": "shared",
  // ORM
  "prisma/schema.prisma": "user",
  "prisma.config.ts": "framework-editable",
  "drizzle.config.ts": "framework-editable",
  "src/db/schema/index.ts": "user",
  "src/models/index.ts": "user",
};

/** Check that files registered in manifest actually exist on disk */
async function checkFileIntegrity(
  dir: string,
  files: Record<string, { owner: FileOwner; version?: string }>
): Promise<CheckResult> {
  const trackedCount = Object.keys(files).length;
  if (trackedCount === 0) {
    return {
      name: "File integrity",
      passed: true,
      message: "No files tracked in manifest",
    };
  }

  const missing: string[] = [];

  for (const [filePath, meta] of Object.entries(files)) {
    try {
      await fs.access(path.join(dir, filePath));
    } catch {
      missing.push(`${filePath} (${meta.owner})`);
    }
  }

  if (missing.length === 0) {
    return {
      name: "File integrity",
      passed: true,
      message: `${trackedCount} files tracked, all present on disk`,
    };
  }

  return {
    name: "File integrity",
    passed: false,
    message: `${missing.length} of ${trackedCount} tracked file(s) missing:\n  ${missing.join("\n  ")}`,
    fix: "Run `backgen upgrade` to regenerate missing files",
  };
}

/** Check that generated files on disk are properly registered in the manifest */
async function checkOwnershipIntegrity(
  dir: string,
  files: Record<string, { owner: FileOwner; version?: string }>
): Promise<CheckResult> {
  const untracked: string[] = [];

  for (const relPath of Object.keys(KNOWN_FILES)) {
    const absPath = path.join(dir, relPath);
    try {
      await fs.access(absPath);
      // File exists — check it's in manifest
      if (!files[relPath]) {
        untracked.push(relPath);
      }
    } catch {
      // File doesn't exist on disk — skip
    }
  }

  // Also check for ORM-specific paths that match a directory pattern
  const ormPatterns = ["prisma/seeds/", "src/db/schema/", "src/models/"];
  for (const pattern of ormPatterns) {
    const patternDir = path.join(dir, pattern);
    try {
      const entries = await fs.readdir(patternDir);
      for (const entry of entries) {
        const relPath = pattern + entry;
        if (!files[relPath]) {
          untracked.push(relPath);
        }
      }
    } catch {
      // Directory doesn't exist — skip
    }
  }

  if (untracked.length === 0) {
    return {
      name: "Ownership integrity",
      passed: true,
      message: "All generated files tracked in manifest",
    };
  }

  return {
    name: "Ownership integrity",
    passed: false,
    message: `${untracked.length} untracked generated file(s) found:\n  ${untracked.join("\n  ")}`,
    fix: "Run `backgen sync` to register untracked files",
  };
}

// ── V6.5: Ownership Fix ────────────────────────────────────────

/**
 * Reconcile manifest vs disk:
 *   - Add entries for known generated files found on disk but not in manifest
 *   - Remove stale entries for files in manifest that no longer exist on disk
 *   - Only skips user-owned files for stale removal
 */
async function applyOwnershipFix(
  projectDir: string,
  manifest: ProjectManifest
): Promise<void> {
  console.log(chalk.cyan("\n  Applying ownership fixes..."));

  let added = 0;
  let removed = 0;
  const files = manifest.files;

  // 1. Register known files found on disk but missing from manifest
  for (const [relPath, owner] of Object.entries(KNOWN_FILES)) {
    try {
      await fs.access(path.join(projectDir, relPath));
      if (!files[relPath]) {
        files[relPath] = {
          owner,
          version: owner !== "user" ? manifest.generatedVersion : undefined,
        };
        added++;
      }
    } catch {
      // Not on disk — skip
    }
  }

  // 2. Scan ORM-specific directories for untracked user files
  const ormDirs = ["prisma/seeds", "src/db/schema", "src/models"];
  for (const dir of ormDirs) {
    try {
      const entries = await fs.readdir(path.join(projectDir, dir));
      for (const entry of entries) {
        const relPath = dir + "/" + entry;
        if (!files[relPath]) {
          files[relPath] = { owner: "user" };
          added++;
        }
      }
    } catch {
      // Directory doesn't exist — skip
    }
  }

  // 3. Remove stale entries (files in manifest but gone from disk)
  for (const [relPath, meta] of Object.entries(files)) {
    if (meta.owner === "user") continue; // never remove user entries
    try {
      await fs.access(path.join(projectDir, relPath));
    } catch {
      delete files[relPath];
      removed++;
    }
  }

  if (added === 0 && removed === 0) {
    console.log(chalk.gray("  Nothing to fix."));
    return;
  }

  await writeManifest(projectDir, manifest);

  console.log(chalk.green(`  ✓ Registered ${added} untracked file(s)`));
  if (removed > 0) {
    console.log(chalk.yellow(`  ~ Removed ${removed} stale entry(ies)`));
  }
}
