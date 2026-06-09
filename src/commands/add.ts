import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import * as path from "path";
import { PluginInstaller } from "../core/plugin-installer.js";
import {
  getPlugin,
  listAvailablePlugins,
  getPluginsByCategory,
  getCategories,
  checkConflicts,
  checkRequirements,
} from "../core/plugin-registry.js";
import { getInstalledPlugins, readManifest } from "../core/manifest.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/express");

/**
 * Install one or more plugins into the project.
 * If pluginName is omitted, shows an interactive multi-select picker.
 * Supports "devops" shorthand to install all devops-category plugins at once.
 */
export async function addCommand(pluginName: string | undefined): Promise<void> {
  console.log(chalk.blue.bold("\n🔌 BackGen - Add Plugin\n"));

  const projectDir = process.cwd();
  const installed = await getInstalledPlugins(projectDir);

  // If no plugin specified, show interactive multi-select
  if (!pluginName) {
    const categories = getCategories();
    const choices: Array<{ name: string; value: string; disabled?: string }> = [];

    for (const cat of categories) {
      const plugins = getPluginsByCategory(cat);
      for (const p of plugins) {
        const isInstalled = !!installed[p.name];
        choices.push({
          name: `${p.name} (${cat}) — ${p.description}`,
          value: p.name,
          disabled: isInstalled ? "already installed" : undefined,
        });
      }
    }

    if (choices.length === 0) {
      console.error(chalk.red("No plugins available."));
      process.exit(1);
    }

    const answer = await inquirer.prompt([
      {
        type: "checkbox",
        name: "plugins",
        message: "Select plugins to install (space to select, enter to confirm):",
        choices,
      },
    ]);

    if (answer.plugins.length === 0) {
      console.log(chalk.yellow("No plugins selected."));
      return;
    }

    // Validate conflicts across selected plugins before installing
    const selected = answer.plugins as string[];
    for (const name of selected) {
      const plugin = getPlugin(name);
      if (!plugin?.conflicts) continue;
      const conflictWith = plugin.conflicts.filter((c) => selected.includes(c));
      if (conflictWith.length > 0) {
        console.error(chalk.red(`Error: "${name}" conflicts with: ${conflictWith.join(", ")}`));
        console.log(chalk.yellow("Select only one auth provider (jwt or clerk)."));
        process.exit(1);
      }
    }

    // Install each selected plugin
    for (const name of selected) {
      await installPlugin(projectDir, name, installed);
    }
    return;
  }

  // "devops" shorthand — install all devops plugins at once
  if (pluginName === "devops") {
    const devopsPlugins = getPluginsByCategory("devops");
    const toInstall = devopsPlugins.filter((p) => !installed[p.name]);

    if (toInstall.length === 0) {
      console.log(chalk.yellow("All devops plugins are already installed."));
      return;
    }

    console.log(chalk.cyan(`Installing ${toInstall.length} devops plugins:\n`));
    for (const p of toInstall) {
      console.log(chalk.cyan(`  • ${p.name} — ${p.description}`));
    }
    console.log();

    for (const p of toInstall) {
      await installPlugin(projectDir, p.name, installed);
    }
    return;
  }

  // Single plugin specified via argument
  await installPlugin(projectDir, pluginName, installed);
}

async function installPlugin(
  projectDir: string,
  pluginName: string,
  installed: Record<string, { version: string; installedAt: string; source: string }>
): Promise<void> {
  const plugin = getPlugin(pluginName);
  if (!plugin) {
    console.error(chalk.red(`Error: Unknown plugin "${pluginName}".`));
    console.log("\nAvailable plugins:");
    for (const p of listAvailablePlugins()) {
      console.log(chalk.cyan(`  ${p.name}`) + ` (${p.category}) — ${p.description}`);
    }
    process.exit(1);
  }

  if (!plugin.available) {
    console.error(chalk.red(`Error: Plugin "${pluginName}" is not available yet.`));
    process.exit(1);
  }

  if (installed[pluginName]) {
    console.error(chalk.red(`Error: Plugin "${pluginName}" is already installed.`));
    process.exit(1);
  }

  // Check conflicts
  const conflicts = checkConflicts(pluginName, Object.keys(installed));
  if (conflicts.length > 0) {
    console.error(chalk.red(`Error: Plugin "${pluginName}" conflicts with: ${conflicts.join(", ")}`));
    console.log(chalk.yellow(`Remove them first: ${conflicts.map((c) => `backgen remove ${c}`).join(", ")}`));
    process.exit(1);
  }

  // Check requirements
  const missing = checkRequirements(pluginName, Object.keys(installed));
  if (missing.length > 0) {
    console.error(chalk.red(`Error: Plugin "${pluginName}" requires: ${missing.join(", ")}`));
    console.log(chalk.yellow(`Install them first: ${missing.map((r) => `backgen add ${r}`).join(", ")}`));
    process.exit(1);
  }

  // Install
  const spinner = ora(`Installing ${pluginName}...`).start();

  try {
    const manifest = await readManifest(projectDir);
    const orm = manifest?.project?.orm ?? "prisma";
    const installer = new PluginInstaller(TEMPLATES_DIR, orm);
    await installer.install(projectDir, plugin);
    spinner.succeed(`${pluginName} installed!`);

    if (plugin.env) {
      console.log("  Env vars added to .env.example:");
      for (const key of Object.keys(plugin.env)) {
        console.log(chalk.cyan(`    ${key}`));
      }
    }

    // Update installed map for subsequent conflict/requirement checks
    installed[pluginName] = {
      version: plugin.version,
      installedAt: new Date().toISOString().split("T")[0],
      source: "core",
    };
  } catch (error) {
    spinner.fail(`Failed to install ${pluginName}`);
    throw error;
  }
}
