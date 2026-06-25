import chalk from "chalk";
import * as fs from "fs/promises";
import * as path from "path";
import { randomBytes } from "crypto";

/**
 * Rotate JWT secrets in the project's .env file.
 *
 * Generates cryptographically secure 256-bit random hex values for both
 * `JWT_SECRET` and `JWT_REFRESH_SECRET`. Creates a backup of the current
 * `.env` as `.env.backup`, then writes the old values as comments alongside
 * the new secrets. All existing tokens are immediately invalidated on next
 * server restart.
 */
export async function rotateCommand(): Promise<void> {
  console.log(chalk.blue.bold("\n🔄 BackGen - Rotate Secrets\n"));

  const projectDir = process.cwd();
  const envPath = path.join(projectDir, ".env");
  const backupPath = path.join(projectDir, ".env.backup");

  // Validate .env exists
  try {
    await fs.access(envPath);
  } catch {
    console.log(chalk.red("✗ .env not found. Run from project root."));
    process.exit(1);
  }

  // Generate cryptographically random secrets (256-bit hex)
  const newJwtSecret = randomBytes(32).toString("hex");
  const newRefreshSecret = randomBytes(32).toString("hex");

  // Backup current .env
  await fs.copyFile(envPath, backupPath);
  console.log(chalk.gray(`  Backup → .env.backup`));

  // Read and rotate
  const lines = (await fs.readFile(envPath, "utf-8")).split("\n");
  const rotated: string[] = [];

  for (const line of lines) {
    if (/^JWT_SECRET=/.test(line)) {
      rotated.push(`# Previous: ${line.trim()}`);
      rotated.push(`JWT_SECRET=${newJwtSecret}`);
    } else if (/^JWT_REFRESH_SECRET=/.test(line)) {
      rotated.push(`# Previous: ${line.trim()}`);
      rotated.push(`JWT_REFRESH_SECRET=${newRefreshSecret}`);
    } else {
      rotated.push(line);
    }
  }

  await fs.writeFile(envPath, rotated.join("\n"), "utf-8");

  console.log(chalk.green("✓ Secrets rotated!\n"));
  console.log("  What happened:");
  console.log("    • JWT_SECRET       → new 256-bit random value");
  console.log("    • JWT_REFRESH_SECRET → new 256-bit random value");
  console.log("    • Old .env saved to .env.backup\n");
  console.log(chalk.yellow("  ⚠ All existing tokens invalidated. Users must re-login.\n"));
  console.log(chalk.gray("  To rollback: cp .env.backup .env && restart server\n"));
}
