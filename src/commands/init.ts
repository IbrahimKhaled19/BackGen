import chalk from "chalk";

export interface InitOptions {
  resume?: boolean;
}

export async function initCommand(
  projectName: string | undefined,
  _options: InitOptions
): Promise<void> {
  console.log(chalk.blue("BackGen Init - Coming soon"));
  if (projectName) {
    console.log(`Project: ${projectName}`);
  }
}
