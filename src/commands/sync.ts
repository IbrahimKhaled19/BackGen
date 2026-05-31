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

    // Check if plugin module directory exists
    const moduleDir = path.join(projectDir, "src", "modules", pluginName === "jwt" ? "auth" : pluginName);
    try {
      await fs.access(moduleDir);
      console.log(chalk.green(`✓ ${pluginName} — synced`));
      synced++;
    } catch {
      // Module missing, reinstall
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
  console.log("");
}
