import chalk from "chalk";
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
 * Lists available backups, restores the latest, recreates .backgenrc.json.
 * @param options.yes - Skip confirmation prompt
 */
export async function rollbackCommand(options: RollbackOptions): Promise<void> {
  console.log(chalk.blue.bold(`\n↩ BackGen Rollback\n`));

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

  if (!options.yes) {
    console.log(
      chalk.yellow(
        `  This will restore project files to pre-${version} state.`
      )
    );
    console.log(chalk.gray("  Use --yes to skip this warning.\n"));
  }

  // Restore
  try {
    console.log(chalk.cyan(`  Restoring from ${backupName}...`));
    await restoreBackup(projectDir, latest);
    console.log(chalk.green.bold(`\n  ✓ Rolled back to pre-${version} state\n`));
  } catch (err) {
    console.error(chalk.red(`\n  Rollback failed: ${err}`));
    process.exit(1);
  }
}
