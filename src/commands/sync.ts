import chalk from "chalk";
import ora from "ora";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { readManifest } from "../core/manifest.js";
import { getPlugin } from "../core/plugin-registry.js";
import { PluginInstaller } from "../core/plugin-installer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/express");

export async function syncCommand(): Promise<void> {
  console.log(chalk.blue.bold("\n🔄 BackGen - Sync Project\n"));

  const projectDir = process.cwd();
  const manifest = await readManifest(projectDir);

  if (!manifest) {
    console.error(chalk.red("Error: No .backgenrc.json found. Run `backgen init` first."));
    process.exit(1);
  }

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
