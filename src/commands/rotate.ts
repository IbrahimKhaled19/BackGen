import chalk from "chalk";
import * as fs from "fs/promises";
import * as path from "path";
import { randomBytes } from "crypto";

/**
 * Rotate JWT secrets in the project's .env file.
 *
 * Generates cryptographically secure 256-bit random hex values for both
 * `JWT_SECRET` and `JWT_REFRESH_SECRET`, saves a timestamped backup of the
 * current `.env`, then overwrites the values in place.
 *
 * The previous values are NOT written back into `.env` as comments — a
 * comment is still a secret sitting in a file that people commit, paste into
 * bug reports and ship in Docker build contexts.
 */
export async function rotateCommand(): Promise<void> {
  console.log(chalk.blue.bold("\n🔄 BackGen - Rotate Secrets\n"));

  const projectDir = process.cwd();
  const envPath = path.join(projectDir, ".env");

  // Validate .env exists
  try {
    await fs.access(envPath);
  } catch {
    console.log(chalk.red("✗ .env not found. Run from project root."));
    process.exit(1);
  }

  // Generate cryptographically random secrets (256-bit hex)
  const newSecrets: Record<string, string> = {
    JWT_SECRET: randomBytes(32).toString("hex"),
    JWT_REFRESH_SECRET: randomBytes(32).toString("hex"),
  };

  // Timestamped backup so repeated rotations never overwrite each other
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(projectDir, `.env.backup-${stamp}`);
  await fs.copyFile(envPath, backupPath);
  console.log(chalk.gray(`  Backup → ${path.basename(backupPath)}`));

  // Read and rotate — replace the line, never keep the old value around
  const lines = (await fs.readFile(envPath, "utf-8")).split("\n");
  const rotated: string[] = [];
  const replaced = new Set<string>();

  for (const line of lines) {
    const match = /^([A-Z0-9_]+)=/.exec(line);
    const key = match?.[1];
    if (key && key in newSecrets) {
      rotated.push(`${key}=${newSecrets[key]}`);
      replaced.add(key);
    } else {
      rotated.push(line);
    }
  }

  const missing = Object.keys(newSecrets).filter((k) => !replaced.has(k));
  if (missing.length > 0) {
    console.log(
      chalk.yellow(
        `  ⚠ ${missing.join(", ")} not found in .env — add ${missing.join(", ")}=<64-hex-chars> by hand.`
      )
    );
  }

  await fs.writeFile(envPath, rotated.join("\n"), "utf-8");

  console.log(chalk.green("✓ Secrets rotated!\n"));
  console.log("  What happened:");
  console.log(`    • ${Object.keys(newSecrets).join(", ")} → new 256-bit random values`);
  console.log(`    • Old .env saved to ${path.basename(backupPath)}\n`);
  console.log(chalk.yellow("  ⚠ All existing tokens invalidated. Users must re-login.\n"));
  console.log(
    chalk.gray(
      `  To rollback: cp ${path.basename(backupPath)} .env && restart server\n`
    )
  );
  console.log(
    chalk.gray(
      "  Delete the backup once you are happy — it contains the live secrets.\n"
    )
  );
}