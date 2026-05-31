import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { getFeature, listAvailableFeatures } from "../core/feature-registry.js";
import { installFeature, isFeatureInstalled } from "../core/feature-installer.js";

export async function addCommand(featureName: string | undefined): Promise<void> {
  console.log(chalk.blue.bold("\n🔧 BackGen - Add Feature\n"));

  const projectDir = process.cwd();

  // If no feature specified, show interactive selector
  if (!featureName) {
    const features = listAvailableFeatures();

    if (features.length === 0) {
      console.error(chalk.red("No features available."));
      process.exit(1);
    }

    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "feature",
        message: "Select a feature to add:",
        choices: features.map((f) => ({
          name: `${f.name} - ${f.description}`,
          value: f.name,
        })),
      },
    ]);
    featureName = answer.feature;
  }

  // Check if feature exists
  const feature = getFeature(featureName!);
  if (!feature) {
    console.error(chalk.red(`Error: Unknown feature "${featureName}".`));
    console.log("\nAvailable features:");
    for (const f of listAvailableFeatures()) {
      console.log(chalk.cyan(`  ${f.name}`) + ` - ${f.description}`);
    }
    process.exit(1);
  }

  // Check if feature is available in MVP
  if (!feature.available) {
    console.error(chalk.red(`Error: Feature "${featureName}" is not available in MVP.`));
    console.log(chalk.yellow("\nComing soon in future releases."));
    process.exit(1);
  }

  // Check if already installed
  if (await isFeatureInstalled(projectDir, featureName!)) {
    console.error(chalk.red(`Error: Feature "${featureName}" is already installed.`));
    process.exit(1);
  }

  const spinner = ora(`Installing ${featureName}...`).start();

  try {
    await installFeature(projectDir, feature);
    spinner.succeed(`${featureName} installed successfully!`);

    console.log(chalk.green(`\n✨ Feature "${featureName}" added!\n`));
    console.log("Next steps:");
    console.log(chalk.cyan("  npm run db:push    # Update database"));
    console.log(chalk.cyan("  npm run dev        # Start server\n"));
  } catch (error) {
    spinner.fail(`Failed to install ${featureName}`);
    throw error;
  }
}
