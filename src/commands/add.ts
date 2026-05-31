import chalk from "chalk";

export async function addCommand(feature: string): Promise<void> {
  console.log(chalk.blue(`BackGen Add Feature: ${feature} - Coming soon`));
}
