import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { readManifest } from "../core/manifest.js";
import { getPlugin } from "../core/plugin-registry.js";
import { PluginInstaller } from "../core/plugin-installer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/express");

export interface SyncOptions {
  yes?: boolean;
}

// V4.6.0 → V4.6.1 middleware migration.
// Detects old flat files (V4.6.0) and moves them to the new subfolders (V4.6.1).
interface MigrationStep {
  from: string;          // path relative to projectDir
  to: string;            // path relative to projectDir
  importFrom: string;    // old import string in app.ts
  importTo: string;      // new import string in app.ts
}

const V460_MIGRATION: MigrationStep[] = [
  {
    from: "src/middleware/request-id.ts",
    to: "src/middleware/observability/request-id.ts",
    importFrom: "./middleware/request-id.js",
    importTo: "./middleware/observability/request-id.js",
  },
  {
    from: "src/middleware/request-timeout.ts",
    to: "src/middleware/observability/request-timeout.ts",
    importFrom: "./middleware/request-timeout.js",
    importTo: "./middleware/observability/request-timeout.js",
  },
  {
    from: "src/middleware/cors-strict.ts",
    to: "src/middleware/security/cors-strict.ts",
    importFrom: "./middleware/cors-strict.js",
    importTo: "./middleware/security/cors-strict.js",
  },
  {
    from: "src/middleware/health.ts",
    to: "src/middleware/observability/health.ts",
    importFrom: "./middleware/health.js",
    importTo: "./middleware/observability/health.js",
  },
  {
    from: "src/middleware/rate-limit.ts",
    to: "src/middleware/security/rate-limit.ts",
    importFrom: "./middleware/rate-limit.js",
    importTo: "./middleware/security/rate-limit.js",
  },
  {
    from: "src/middleware/sanitize.ts",
    to: "src/middleware/security/sanitize.ts",
    importFrom: "./middleware/sanitize.js",
    importTo: "./middleware/security/sanitize.js",
  },
  {
    from: "src/middleware/error.ts",
    to: "src/middleware/core/errors.ts",
    importFrom: "./middleware/error.js",
    importTo: "./middleware/core/errors.js",
  },
  {
    from: "src/middleware/logger.ts",
    to: "src/middleware/core/logger.ts",
    importFrom: "./middleware/logger.js",
    importTo: "./middleware/core/logger.js",
  },
  {
    from: "src/middleware/validate.ts",
    to: "src/middleware/core/validate.ts",
    importFrom: "./middleware/validate.js",
    importTo: "./middleware/core/validate.js",
  },
];

async function exists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

/**
 * Detect which V4.6.0 → V4.6.1 migration steps apply to a project.
 */
async function detectV460Migration(projectDir: string): Promise<MigrationStep[]> {
  const applicable: MigrationStep[] = [];
  for (const step of V460_MIGRATION) {
    if (await exists(path.join(projectDir, step.from))) {
      // Only migrate if destination doesn't already exist (avoid overwriting V4.6.1 files)
      if (!(await exists(path.join(projectDir, step.to)))) {
        applicable.push(step);
      }
    }
  }
  return applicable;
}

/**
 * Apply V4.6.0 → V4.6.1 middleware migration.
 * Returns the number of files moved.
 */
export async function migrateV460Middleware(
  projectDir: string,
  options: { yes?: boolean } = {}
): Promise<number> {
  const steps = await detectV460Migration(projectDir);
  if (steps.length === 0) return 0;

  console.log(chalk.yellow.bold("\n⚠ V4.6.0 → V4.6.1 middleware migration needed\n"));
  console.log(chalk.gray("BackGen will move these files to the new V4.6.1 subfolders:\n"));
  for (const s of steps) {
    console.log(`  ${chalk.red(s.from)}  →  ${chalk.green(s.to)}`);
  }
  console.log("");

  let proceed = options.yes === true;
  if (!proceed) {
    const answer = await inquirer.prompt([
      {
        type: "confirm",
        name: "proceed",
        message: "Proceed with migration? (old files will be deleted)",
        default: false,
      },
    ]);
    proceed = answer.proceed === true;
  }

  if (!proceed) {
    console.log(chalk.yellow("Migration skipped. Run `backgen sync --yes` to apply non-interactively."));
    return 0;
  }

  const spinner = ora("Migrating middleware files...").start();
  let moved = 0;

  for (const s of steps) {
    const fromPath = path.join(projectDir, s.from);
    const toPath = path.join(projectDir, s.to);
    try {
      await fs.mkdir(path.dirname(toPath), { recursive: true });
      let content = await fs.readFile(fromPath, "utf-8");
      // Subfolder files need ../../ for utils/services/config (was ../ in flat layout)
      // Idempotent: skip if already normalized
      if (
        !content.includes('"../../utils/') &&
        !content.includes('"../../services/') &&
        !content.includes('"../../config/')
      ) {
        content = content.replace(
          /from "\.\.\/(utils|services|config)\//g,
          'from "../../$1/'
        );
      }
      await fs.writeFile(toPath, content, "utf-8");
      await fs.unlink(fromPath);
      moved++;
    } catch (err) {
      spinner.warn(`Failed to move ${s.from}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Rewrite app.ts imports
  const appTsPath = path.join(projectDir, "src", "app.ts");
  if (await exists(appTsPath)) {
    try {
      let appContent = await fs.readFile(appTsPath, "utf-8");
      let rewritten = false;
      for (const s of steps) {
        if (appContent.includes(s.importFrom)) {
          appContent = appContent.replaceAll(s.importFrom, s.importTo);
          rewritten = true;
        }
      }
      if (rewritten) {
        await fs.writeFile(appTsPath, appContent, "utf-8");
      }
    } catch (err) {
      spinner.warn(`Failed to update app.ts imports: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  spinner.succeed(`Migrated ${moved} middleware file(s) to V4.6.1 layout.`);
  return moved;
}

export async function syncCommand(options: SyncOptions = {}): Promise<void> {
  console.log(chalk.blue.bold("\n🔄 BackGen - Sync Project\n"));

  const projectDir = process.cwd();
  const manifest = await readManifest(projectDir);

  if (!manifest) {
    console.error(chalk.red("Error: No .backgenrc.json found. Run `backgen init` first."));
    process.exit(1);
  }

  // V4.6.0 → V4.6.1 migration: must run BEFORE plugin sync, since plugin sync
  // checks for src/middleware/<plugin>.ts (old path) and would reinstall old files.
  await migrateV460Middleware(projectDir, { yes: options.yes });

  const installer = new PluginInstaller(TEMPLATES_DIR);
  let synced = 0;
  let skipped = 0;

  for (const [pluginName] of Object.entries(manifest.plugins)) {
    const plugin = getPlugin(pluginName);
    if (!plugin) {
      console.log(chalk.yellow(`⚠ ${pluginName} — unknown plugin, skipping`));
      skipped++;
      continue;
    }

    // Determine install location: production plugins (no module dir) live in src/middleware
    const moduleDir = path.join(projectDir, "src", "modules", pluginName === "jwt" ? "auth" : pluginName);
    const middlewareFile = path.join(projectDir, "src", "middleware", `${pluginName === "ratelimit" ? "rate-limit" : pluginName === "hardening" ? "request-id" : pluginName === "sanitize" ? "sanitize" : pluginName}.ts`);

    let exists = false;
    try { await fs.access(moduleDir); exists = true; } catch { /* no module dir */ }
    if (!exists) {
      try { await fs.access(middlewareFile); exists = true; } catch { /* no middleware file */ }
    }

    if (exists) {
      console.log(chalk.green(`✓ ${pluginName} — synced`));
      synced++;
    } else {
      const spinner = ora(`Reinstalling ${pluginName}...`).start();
      try {
        await installer.install(projectDir, plugin);
        spinner.succeed(`${pluginName} reinstalled`);
        synced++;
      } catch {
        spinner.fail(`Failed to reinstall ${pluginName}`);
        skipped++;
      }
    }
  }

  console.log("");
  if (synced > 0) {
    console.log(chalk.green(`Synced ${synced} plugin(s).`));
  }
  if (skipped > 0) {
    console.log(chalk.yellow(`Skipped ${skipped} plugin(s).`));
  }
  if (synced === 0 && skipped === 0) {
    console.log(chalk.green("All plugins in sync."));
  }

  // Re-apply preset if set in manifest. Picks up auth-skipped resources
  // (e.g. Membership/Invitation in saas-core) after `add jwt`/`add clerk`.
  if (manifest.project.preset) {
    const { getPreset } = await import("../presets/registry.js");
    const { generateCommand } = await import("./generate.js");
    const preset = getPreset(manifest.project.preset);
    if (preset) {
      const hasAuth = !!(manifest.plugins.jwt || manifest.plugins.clerk);
      const referencesUser = (relations?: string[]) =>
        relations?.some((rel) => rel.endsWith(":User")) ?? false;
      let added = 0;
      for (const resource of preset.resources) {
        if (referencesUser(resource.relations) && !hasAuth) continue;
        const moduleDir = path.join(projectDir, "src", "modules", resource.name.toLowerCase());
        try {
          await fs.access(moduleDir);
          continue; // already exists
        } catch {
          // missing — add it
        }
        try {
          process.chdir(projectDir);
          await generateCommand(resource.name, resource.fields, {
            relations: resource.relations?.join(","),
            softDelete: resource.softDelete,
          });
          added++;
        } catch {
          console.log(chalk.yellow(`  ⚠ ${resource.name} could not be added`));
        }
      }
      if (added > 0) {
        console.log(chalk.green(`Preset "${manifest.project.preset}": ${added} resource(s) synced.`));
        // Re-run prisma generate to pick up new models
        const { spawn } = await import("child_process");
        await new Promise<void>((resolve) => {
          const child = spawn("npx", ["prisma", "generate"], { cwd: projectDir, stdio: "inherit", shell: true });
          child.on("close", () => resolve());
          child.on("error", () => resolve());
        });
      }
    }
  }
  console.log("");
}
