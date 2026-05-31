import chalk from "chalk";
import ora from "ora";
import * as path from "path";
import { PluginInstaller } from "../core/plugin-installer.js";
import { getPlugin } from "../core/plugin-registry.js";
import { getInstalledPlugins } from "../core/manifest.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/express");

export async function removeCommand(pluginName: string): Promise<void> {
  console.log(chalk.blue.bold(`\n🔌 BackGen - Remove Plugin: ${pluginName}\n`));

  const projectDir = process.cwd();

  // Check if plugin exists in registry
  const plugin = getPlugin(pluginName);
  if (!plugin) {
    console.error(chalk.red(`Error: Unknown plugin "${pluginName}".`));
    process.exit(1);
  }

  // Check if installed
  const installed = await getInstalledPlugins(projectDir);
  if (!installed[pluginName]) {
    console.error(chalk.red(`Error: Plugin "${pluginName}" is not installed.`));
    process.exit(1);
  }

  const spinner = ora(`Removing ${pluginName}...`).start();

  try {
    const installer = new PluginInstaller(TEMPLATES_DIR);
    await installer.uninstall(projectDir, plugin);
    spinner.succeed(`${pluginName} removed!`);

    console.log(chalk.green(`\n✨ Plugin "${pluginName}" removed.\n`));
    console.log("Note: Template files were not deleted (safe removal).");
    console.log("To fully remove, delete the module directory manually.\n");
  } catch (error) {
    spinner.fail(`Failed to remove ${pluginName}`);
    throw error;
  }
}
