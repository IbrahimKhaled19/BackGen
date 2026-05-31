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
import { getInstalledPlugins } from "../core/manifest.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/express");

export async function addCommand(pluginName: string | undefined): Promise<void> {
  console.log(chalk.blue.bold("\n🔌 BackGen - Add Plugin\n"));

  const projectDir = process.cwd();

  // If no plugin specified, show interactive selector
  if (!pluginName) {
    const categories = getCategories();
    const choices: Array<{ name: string; value: string }> = [];

    for (const cat of categories) {
      const plugins = getPluginsByCategory(cat);
      for (const p of plugins) {
        choices.push({
          name: `${p.name} (${cat}) — ${p.description}`,
          value: p.name,
        });
      }
    }

    if (choices.length === 0) {
      console.error(chalk.red("No plugins available."));
      process.exit(1);
    }

    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "plugin",
        message: "Select a plugin to install:",
        choices,
      },
    ]);
    pluginName = answer.plugin;
  }

  // Get plugin
  const plugin = getPlugin(pluginName!);
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

  // Check if already installed
  const installed = await getInstalledPlugins(projectDir);
  if (installed[pluginName!]) {
    console.error(chalk.red(`Error: Plugin "${pluginName}" is already installed.`));
    process.exit(1);
  }

  // Check conflicts
  const conflicts = checkConflicts(pluginName!, Object.keys(installed));
  if (conflicts.length > 0) {
    console.error(chalk.red(`Error: Plugin "${pluginName}" conflicts with: ${conflicts.join(", ")}`));
    console.log(chalk.yellow(`Remove them first: ${conflicts.map((c) => `backgen remove ${c}`).join(", ")}`));
    process.exit(1);
  }

  // Check requirements
  const missing = checkRequirements(pluginName!, Object.keys(installed));
  if (missing.length > 0) {
    console.error(chalk.red(`Error: Plugin "${pluginName}" requires: ${missing.join(", ")}`));
    console.log(chalk.yellow(`Install them first: ${missing.map((r) => `backgen add ${r}`).join(", ")}`));
    process.exit(1);
  }

  // Install
  const spinner = ora(`Installing ${pluginName}...`).start();

  try {
    const installer = new PluginInstaller(TEMPLATES_DIR);
    await installer.install(projectDir, plugin);
    spinner.succeed(`${pluginName} installed!`);

    console.log(chalk.green(`\n✨ Plugin "${pluginName}" added!\n`));

    if (plugin.env) {
      console.log("Environment variables added to .env.example:");
      for (const key of Object.keys(plugin.env)) {
        console.log(chalk.cyan(`  ${key}`));
      }
      console.log("");
    }

    console.log("Next steps:");
    console.log(chalk.cyan("  # Edit .env with your credentials"));
    console.log(chalk.cyan("  npm run typecheck"));
    console.log(chalk.cyan("  npm run dev\n"));
  } catch (error) {
    spinner.fail(`Failed to install ${pluginName}`);
    throw error;
  }
}
