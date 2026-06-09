import chalk from "chalk";
import { readManifest } from "../core/manifest.js";
import { createBackup } from "../core/backup.js";
import {
  loadMigrations,
  getPendingMigrations,
  applyMigration,
  loadPluginMigrations,
  applyPluginMigration,
} from "../core/migration-engine.js";

/**
 * Options for the upgrade command.
 */
interface UpgradeOptions {
  yes?: boolean;
}

/**
 * Upgrade a generated project to the latest template version.
 * Loads pending core + plugin migrations, creates a backup, and applies migrations sequentially.
 * @param options.yes - Skip confirmation prompt
 */
export async function upgradeCommand(options: UpgradeOptions): Promise<void> {
  console.log(chalk.blue.bold(`\n↑ BackGen Upgrade\n`));

  const projectDir = process.cwd();

  // Verify project
  const manifest = await readManifest(projectDir);
  if (!manifest) {
    console.error(chalk.red("No .backgenrc.json found — are you in a BackGen project?"));
    console.log(chalk.yellow("Run `backgen init` to create a new project."));
    process.exit(1);
  }

  const currentVersion = manifest.generatedVersion;

  console.log(chalk.gray(`  Project version: ${currentVersion}`));

  // Load pending core + plugin migrations
  const coreMigrations = await loadMigrations();
  const corePending = getPendingMigrations(coreMigrations, currentVersion);

  const pluginPending = await loadPluginMigrations(projectDir);

  const totalPending = corePending.length + pluginPending.length;

  if (totalPending === 0) {
    console.log(chalk.yellow("\n  No applicable migrations found."));
    console.log(chalk.gray("  The migration engine checks for scripts in dist/migrations/."));
    return;
  }

  // Show pending core migrations
  if (corePending.length > 0) {
    console.log(chalk.cyan(`\n  ${corePending.length} pending core migration(s):\n`));
    for (const m of corePending) {
      console.log(`    ${chalk.bold(m.from)} ${chalk.gray("→")} ${chalk.bold(m.to)}  ${m.description}`);
    }
  }

  // Show pending plugin migrations
  if (pluginPending.length > 0) {
    console.log(chalk.cyan(`\n  ${pluginPending.length} pending plugin migration(s):\n`));
    for (const m of pluginPending) {
      console.log(
        `    ${chalk.bold(`[${m.pluginName}]`)} ${chalk.bold(m.from)} ${chalk.gray("→")} ${chalk.bold(m.to)}  ${m.description}`
      );
    }
  }
  console.log("");

  // Confirm
  if (!options.yes) {
    console.log(chalk.yellow("  It is recommended to back up your project before upgrading."));
    console.log(chalk.gray("  (A backup will be created automatically in .backgen/backups/)\n"));
  }

  // Create backup automatically
  console.log(chalk.cyan("  Creating backup..."));
  await createBackup(projectDir);

  // Apply core migrations
  for (const migration of corePending) {
    try {
      console.log(chalk.cyan(`\n  Applying ${migration.from} → ${migration.to}...`));
      await applyMigration(projectDir, migration, (msg) => {
        console.log(`    ${msg}`);
      });
    } catch (err) {
      console.error(chalk.red(`\n  Migration failed: ${err}`));
      console.log(chalk.yellow("  Restore from backup in .backgen/backups/"));
      console.log(chalk.yellow("  Run `backgen rollback` to revert."));
      process.exit(1);
    }
  }

  // Apply plugin migrations
  for (const migration of pluginPending) {
    try {
      console.log(chalk.cyan(`\n  [${migration.pluginName}] ${migration.from} → ${migration.to}...`));
      await applyPluginMigration(projectDir, migration, (msg) => {
        console.log(`    ${msg}`);
      });
    } catch (err) {
      console.error(chalk.red(`\n  Plugin migration failed: ${err}`));
      console.log(chalk.yellow("  Restore from backup in .backgen/backups/"));
      console.log(chalk.yellow("  Run `backgen rollback` to revert."));
      process.exit(1);
    }
  }

  console.log(chalk.green.bold(`\n  ✓ Upgrade complete\n`));
}
