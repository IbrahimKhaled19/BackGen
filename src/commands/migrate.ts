import chalk from "chalk";
import { spawn } from "child_process";

export async function migrateCommand(name: string | undefined): Promise<void> {
  console.log(chalk.blue.bold("\n🔄 BackGen - Generate Migration\n"));

  const args = ["prisma", "migrate", "dev"];
  if (name) {
    args.push("--name", name);
  }

  console.log(chalk.gray(`  Running: npx ${args.join(" ")}\n`));

  return new Promise((resolve, reject) => {
    const child = spawn("npx", args, { stdio: "inherit", shell: true });
    child.on("close", (code) => {
      if (code === 0) {
        console.log(chalk.green("\n✨ Migration created successfully!\n"));
        resolve();
      } else {
        reject(new Error(`Migration failed with code ${code}`));
      }
    });
    child.on("error", reject);
  });
}
