import chalk from "chalk";

export async function generateCommand(
  name: string,
  _fields: string[]
): Promise<void> {
  console.log(chalk.blue(`BackGen Generate Resource: ${name} - Coming soon`));
}
