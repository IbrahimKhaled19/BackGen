import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const packageJson: { version: string } = JSON.parse(
  readFileSync(resolve(__dirname, "../package.json"), "utf-8")
);

export function healthCommand(): void {
  console.log(chalk.blue.bold("\nBackGen - System Health\n"));
  console.log(`${chalk.cyan("Node.js version:")}  ${process.version}`);
  console.log(`${chalk.cyan("Platform:")}         ${process.platform} (${process.arch})`);
  console.log(`${chalk.cyan("BackGen version:")}  ${packageJson.version}`);
  console.log("");
}
