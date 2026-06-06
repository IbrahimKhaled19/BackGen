import chalk from "chalk";
import { spawn } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { readManifest } from "../core/manifest.js";

export async function migrateCommand(name: string | undefined): Promise<void> {
  console.log(chalk.blue.bold("\n🔄 BackGen - Generate Migration\n"));

  const projectDir = process.cwd();
  const manifest = await readManifest(projectDir);
  const orm = manifest?.project?.orm ?? "prisma";

  if (orm === "mongoose") {
    console.log(chalk.yellow("\nMongoose does not use traditional migrations.\n"));
    console.log(chalk.gray("Schema changes are applied directly to models in src/models/.\n"));
    const changelogDir = path.join(projectDir, "migrations");
    await fs.mkdir(changelogDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await fs.writeFile(
      path.join(changelogDir, `${name ?? "migration"}-${timestamp}.md`),
      `# Migration: ${name ?? "unnamed"}\nDate: ${new Date().toISOString()}\n\nModel changes tracked via Mongoose schema changes in src/models/\n`,
      "utf-8"
    );
    console.log(chalk.green(`Changelog written to migrations/\n`));
    return;
  }

  const args = orm === "drizzle"
    ? ["drizzle-kit", "generate", ...(name ? ["--name", name] : [])]
    : ["prisma", "migrate", "dev", ...(name ? ["--name", name] : [])];

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
