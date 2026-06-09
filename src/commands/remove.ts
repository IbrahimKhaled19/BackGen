import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import * as path from "path";
import { PluginInstaller } from "../core/plugin-installer.js";
import { getPlugin, getPluginsByCategory } from "../core/plugin-registry.js";
import { getInstalledPlugins, readManifest } from "../core/manifest.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/express");

/**
 * Remove one or more plugins from the project.
 * If pluginName is omitted, shows an interactive multi-select picker.
 * Supports "devops" shorthand to remove all devops-category plugins at once.
 */
export async function removeCommand(pluginName: string | undefined): Promise<void> {
  console.log(chalk.blue.bold("\n🔌 BackGen - Remove Plugin\n"));

  const projectDir = process.cwd();
  const installed = await getInstalledPlugins(projectDir);

  if (!pluginName) {
    const installedNames = Object.keys(installed);

    if (installedNames.length === 0) {
      console.log(chalk.yellow("No plugins installed."));
      return;
    }

    const choices = installedNames.map((name) => ({
      name,
      value: name,
    }));

    const answer = await inquirer.prompt([
      {
        type: "checkbox",
        name: "plugins",
        message: "Select plugins to remove (space to select, enter to confirm):",
        choices,
      },
    ]);

    if (answer.plugins.length === 0) {
      console.log(chalk.yellow("No plugins selected."));
      return;
    }

    for (const name of answer.plugins) {
      await removePlugin(projectDir, name, installed);
    }
    return;
  }

  // "devops" shorthand — remove all devops plugins
  if (pluginName === "devops") {
    const devopsPlugins = getPluginsByCategory("devops");
    const toRemove = devopsPlugins.filter((p) => installed[p.name]);

    if (toRemove.length === 0) {
      console.log(chalk.yellow("No devops plugins are installed."));
      return;
    }

    console.log(chalk.cyan(`Removing ${toRemove.length} devops plugins:\n`));
    for (const p of toRemove) {
      console.log(chalk.cyan(`  • ${p.name}`));
    }
    console.log();

    for (const p of toRemove) {
      await removePlugin(projectDir, p.name, installed);
    }
    return;
  }

  await removePlugin(projectDir, pluginName, installed);
}

async function removePlugin(
  projectDir: string,
  pluginName: string,
  installed: Record<string, { version: string; installedAt: string; source: string }>
): Promise<void> {
  const plugin = getPlugin(pluginName);
  if (!plugin) {
    console.error(chalk.red(`Error: Unknown plugin "${pluginName}".`));
    process.exit(1);
  }

  if (!installed[pluginName]) {
    console.error(chalk.red(`Error: Plugin "${pluginName}" is not installed.`));
    process.exit(1);
  }

  const spinner = ora(`Removing ${pluginName}...`).start();

  try {
    const manifest = await readManifest(projectDir);
    const orm = manifest?.project?.orm ?? "prisma";
    const installer = new PluginInstaller(TEMPLATES_DIR, orm);
    await installer.uninstall(projectDir, plugin);
    spinner.succeed(`${pluginName} removed!`);
  } catch (error) {
    spinner.fail(`Failed to remove ${pluginName}`);
    throw error;
  }
}
