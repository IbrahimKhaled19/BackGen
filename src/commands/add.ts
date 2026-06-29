import chalk from "chalk";
import ora from "ora";
import * as path from "path";
import { PluginInstaller } from "../core/plugin-installer.js";
import {
  getPlugin,
  listAvailablePlugins,
  checkConflicts,
  checkRequirements,
} from "../core/plugin-registry.js";
import { getInstalledPlugins, readManifest } from "../core/manifest.js";
import { selectPluginsInteractive } from "../core/plugin-selector.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/express");

export async function addCommand(pluginName: string | undefined): Promise<void> {
  console.log(chalk.blue.bold("\n\uD83D\uDD0C BackGen - Add Plugin\n"));

  const projectDir = process.cwd();
  const installed = await getInstalledPlugins(projectDir);
  const manifest = await readManifest(projectDir);
  const orm = manifest?.project?.orm ?? "prisma";

  // Interactive multi-select — uses plugin-selector
  if (!pluginName) {
    const selected = await selectPluginsInteractive(orm, Object.keys(installed));
    if (selected.length === 0) {
      console.log(chalk.yellow("No plugins selected."));
      return;
    }

    console.log();
    const installer = new PluginInstaller(TEMPLATES_DIR, orm);
    const { succeeded, failed } = await installer.installBulk(projectDir, selected);

    if (succeeded.length > 0) {
      console.log(chalk.green(`\u2714 ${succeeded.length} plugin(s) installed successfully.`));
    }
    if (failed.length > 0) {
      console.log(chalk.red(`\u2718 ${failed.length} plugin(s) failed: ${failed.join(", ")}`));
    }
    return;
  }

  // "devops" shorthand — install all devops-category plugins
  if (pluginName === "devops") {
    const { getPluginsByCategory } = await import("../core/plugin-registry.js");
    const devopsPlugins = getPluginsByCategory("devops");
    const toInstall = devopsPlugins.filter((p) => !installed[p.name]);

    if (toInstall.length === 0) {
      console.log(chalk.yellow("All devops plugins are already installed."));
      return;
    }

    console.log(chalk.cyan(`Installing ${toInstall.length} devops plugins:\n`));
    for (const p of toInstall) {
      console.log(chalk.cyan(`  \u2022 ${p.name} \u2014 ${p.description}`));
    }
    console.log();

    const installer = new PluginInstaller(TEMPLATES_DIR, orm);
    const names = toInstall.map((p) => p.name);
    const { succeeded, failed } = await installer.installBulk(projectDir, names);

    if (succeeded.length > 0) {
      console.log(chalk.green(`\u2714 ${succeeded.length} devops plugin(s) installed.`));
    }
    if (failed.length > 0) {
      console.log(chalk.red(`\u2718 ${failed.length} plugin(s) failed: ${failed.join(", ")}`));
    }
    return;
  }

  // Single plugin specified via argument
  const plugin = getPlugin(pluginName);
  if (!plugin) {
    console.error(chalk.red(`Error: Unknown plugin "${pluginName}".`));
    console.log("\nAvailable plugins:");
    for (const p of listAvailablePlugins()) {
      console.log(chalk.cyan(`  ${p.name}`) + ` (${p.category}) \u2014 ${p.description}`);
    }
    return;
  }

  if (!plugin.available) {
    throw new Error(`Plugin "${pluginName}" is not available yet.`);
  }

  if (installed[pluginName]) {
    throw new Error(`Plugin "${pluginName}" is already installed.`);
  }

  // Check conflicts
  const conflicts = checkConflicts(pluginName, Object.keys(installed));
  if (conflicts.length > 0) {
    console.error(chalk.red(`Error: Plugin "${pluginName}" conflicts with: ${conflicts.join(", ")}`));
    throw new Error('Operation cancelled');
  }

  // Check requirements
  const missing = checkRequirements(pluginName, Object.keys(installed), orm);
  if (missing.length > 0) {
    console.error(chalk.red(`Error: Plugin "${pluginName}" requires: ${missing.join(", ")}`));
    throw new Error('Operation cancelled');
  }

  // Install single plugin with spinner
  const spinner = ora(`Installing ${pluginName}...`).start();
  try {
    const installer = new PluginInstaller(TEMPLATES_DIR, orm);
    await installer.install(projectDir, plugin);
    spinner.succeed(`${pluginName} installed!`);

    if (plugin.env) {
      console.log("  Env vars added to .env.example:");
      for (const key of Object.keys(plugin.env)) {
        console.log(chalk.cyan(`    ${key}`));
      }
    }
  } catch (error) {
    spinner.fail(`Failed to install ${pluginName}`);
    throw error;
  }
}
