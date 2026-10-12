import chalk from "chalk";
import inquirer from "inquirer";
import * as path from "path";
import { listBackups, getLatestBackup, restoreBackup } from "../core/backup.js";

/**
 * Options for the rollback command.
 */
interface RollbackOptions {
  yes?: boolean;
}

/**
 * Roll back a project to the most recent pre-upgrade backup.
 *
 * Lists available backups, asks for confirmation, then restores the latest
 * one. Restoring overwrites `.backgenrc.json` and every tracked file, so the
 * confirmation is mandatory unless --yes is passed.
 */
export async function rollbackCommand(options: RollbackOptions = {}): Promise<void> {
  console.log(chalk.blue.bold("\n↩ BackGen Rollback\n"));

  const projectDir = process.cwd();

  // List available backups
  const backups = await listBackups(projectDir);

  if (backups.length === 0) {
    console.log(chalk.yellow("\n  No backups found in .backgen/backups/"));
    console.log(chalk.gray("  Run `backgen upgrade` to create a backup before upgrading."));
    return;
  }

  console.log(chalk.cyan(`\n  Available backups:\n`));
  for (const b of backups) {
    console.log(`    ${chalk.bold(b)}`);
  }
  console.log("");

  // Use latest backup
  const latest = await getLatestBackup(projectDir);
  if (!latest) {
    console.log(chalk.yellow("\n  No valid backup found."));
    return;
  }

  const backupName = path.basename(latest);
  const version = backupName.replace("pre-", "");

  // Confirm — this overwrites the working tree and the manifest.
  if (!options.yes) {
    const { proceed } = await inquirer.prompt([
      {
        type: "confirm",
        name: "proceed",
        message: `Overwrite the project with ${backupName} (pre-${version})? This discards current changes.`,
        default: false,
      },
    ]);

    if (!proceed) {
      console.log(chalk.yellow("  Rollback cancelled."));
      return;
    }
  }

  // Restore
  try {
    console.log(chalk.cyan(`  Restoring from ${backupName}...`));
    await restoreBackup(projectDir, latest);
    console.log(chalk.green.bold(`\n  ✓ Rolled back to pre-${version} state\n`));
    console.log(
      chalk.gray(
        "  Note: plugins added after this backup are no longer in .backgenrc.json.\n" +
          "  Run `backgen sync` to reconcile the manifest with the files on disk.\n"
      )
    );
  } catch (err) {
    console.error(chalk.red(`\n  Rollback failed: ${err}`));
    process.exit(1);
  }
}