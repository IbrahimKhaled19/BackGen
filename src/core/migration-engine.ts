import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import type { Migration, MigrationContext } from "./migration.js";
import { compareVersions } from "./migration.js";
import { readManifest, writeManifest, getInstalledPlugins } from "./manifest.js";
import type { BackGenPlugin } from "./plugin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve the core migrations directory (dist/migrations/).
 */
function migrationsDir(): string {
  return path.resolve(__dirname, "../migrations");
}

/**
 * Resolve the plugins directory (dist/plugins/).
 */
function pluginsDir(): string {
  return path.resolve(__dirname, "../plugins");
}

/**
 * Load all core migration modules from the migrations directory.
 */
export async function loadMigrations(): Promise<Migration[]> {
  const dir = migrationsDir();
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }

  const migrations: Migration[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(".js") && !entry.endsWith(".mjs")) continue;
    if (entry.endsWith(".d.ts") || entry.endsWith(".d.mts")) continue;

    try {
      const mod = await import(pathToFileURL(path.resolve(dir, entry)).href);
      if (mod.from && mod.to && typeof mod.up === "function") {
        migrations.push({
          from: String(mod.from),
          to: String(mod.to),
          description: mod.description ?? "",
          up: mod.up,
        });
      }
    } catch (err) {
      console.error(`Failed to load migration ${entry}:`, err);
    }
  }

  // Sort by from-version ascending, then to-version ascending
  migrations.sort((a, b) => {
    const c = compareVersions(a.from, b.from);
    if (c !== 0) return c;
    return compareVersions(a.to, b.to);
  });

  return migrations;
}

/**
 * Determine which migrations are pending for the given current version.
 * A migration is pending when:
 *   currentVersion >= from  AND  currentVersion < to
 */
export function getPendingMigrations(
  migrations: Migration[],
  currentVersion: string
): Migration[] {
  return migrations.filter((m) => {
    return (
      compareVersions(currentVersion, m.from) >= 0 &&
      compareVersions(currentVersion, m.to) < 0
    );
  });
}

/**
 * Apply a single core migration and update the manifest.
 */
export async function applyMigration(
  projectDir: string,
  migration: Migration,
  logger: (msg: string) => void
): Promise<void> {
  const manifest = await readManifest(projectDir);
  if (!manifest) {
    throw new Error("No manifest found — are you in a BackGen project?");
  }

  logger(`Applying ${migration.from} → ${migration.to}: ${migration.description}`);

  await migration.up(projectDir, manifest);

  // Update generatedVersion after migration
  manifest.generatedVersion = migration.to;
  await writeManifest(projectDir, manifest);

  logger(`✓ Upgraded to ${migration.to}`);
}

// ── Plugin Migrations ─────────────────────────────────────────────

export interface PluginMigrationEntry {
  pluginName: string;
  from: string;
  to: string;
  description: string;
  up: (ctx: MigrationContext) => Promise<void>;
}

/**
 * Load pending plugin migrations for all installed plugins.
 * Scans each installed plugin's module for its `migrations` array.
 */
export async function loadPluginMigrations(
  projectDir: string
): Promise<PluginMigrationEntry[]> {
  const installed = await getInstalledPlugins(projectDir);
  const entries: PluginMigrationEntry[] = [];
  const dir = pluginsDir();

  for (const [name, meta] of Object.entries(installed)) {
    try {
      const mod = await import(pathToFileURL(path.resolve(dir, name, "index.js")).href);
      const plugin = Object.values(mod).find(
        (v): v is BackGenPlugin =>
          typeof v === "object" &&
          v !== null &&
          "name" in v &&
          "install" in v &&
          "migrations" in v
      );
      if (!plugin?.migrations) continue;

      const currentVersion = meta.version;
      for (const m of plugin.migrations) {
        if (
          compareVersions(currentVersion, m.from) >= 0 &&
          compareVersions(currentVersion, m.to) < 0
        ) {
          entries.push({
            pluginName: name,
            from: m.from,
            to: m.to,
            description: m.description,
            up: m.up,
          });
        }
      }
    } catch (err) {
      console.error(`Failed to load plugin migrations for ${name}:`, err);
    }
  }

  // Sort by plugin name, then from-version, then to-version
  entries.sort((a, b) => {
    if (a.pluginName !== b.pluginName) return a.pluginName.localeCompare(b.pluginName);
    const c = compareVersions(a.from, b.from);
    if (c !== 0) return c;
    return compareVersions(a.to, b.to);
  });

  return entries;
}

/**
 * Apply a single plugin migration and update the plugin's version in manifest.
 */
export async function applyPluginMigration(
  projectDir: string,
  migration: PluginMigrationEntry,
  logger: (msg: string) => void
): Promise<void> {
  const manifest = await readManifest(projectDir);
  if (!manifest) {
    throw new Error("No manifest found — are you in a BackGen project?");
  }

  logger(
    `[${migration.pluginName}] ${migration.from} → ${migration.to}: ${migration.description}`
  );

  await migration.up({ projectDir, manifest });

  // Ensure plugin entry exists, then bump version
  manifest.plugins[migration.pluginName] ??= {
    version: migration.to,
    installedAt: new Date().toISOString().split("T")[0],
    source: "core",
  };
  manifest.plugins[migration.pluginName].version = migration.to;
  await writeManifest(projectDir, manifest);

  logger(`✓ [${migration.pluginName}] Upgraded to ${migration.to}`);
}

/**
 * Run all pending core + plugin migrations for a project.
 * Returns the total number of migrations applied.
 */
export async function runPendingMigrations(
  projectDir: string,
  logger: (msg: string) => void
): Promise<number> {
  const manifest = await readManifest(projectDir);
  if (!manifest) {
    throw new Error("No .backgenrc.json found — are you in a BackGen project?");
  }

  const currentVersion = manifest.generatedVersion;
  const allMigrations = await loadMigrations();
  const pending = getPendingMigrations(allMigrations, currentVersion);

  if (pending.length === 0) {
    logger(`Already at latest version (${currentVersion}). Nothing to upgrade.`);
    return 0;
  }

  logger(`Found ${pending.length} pending migration(s) from ${currentVersion}:\n`);

  for (let i = 0; i < pending.length; i++) {
    const m = pending[i];
    logger(`  ${i + 1}. ${m.from} → ${m.to}  ${m.description}`);
  }

  for (const migration of pending) {
    await applyMigration(projectDir, migration, logger);
  }

  return pending.length;
}
