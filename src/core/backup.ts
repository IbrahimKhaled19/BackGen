import * as fs from "fs/promises";
import * as path from "path";
import { readManifest, type ProjectManifest } from "./manifest.js";

/**
 * Create a backup of all manifest-tracked files to `.backgen/backups/pre-<version>/`.
 */
export async function createBackup(projectDir: string): Promise<void> {
  const manifest = await readManifest(projectDir);
  if (!manifest) throw new Error("No manifest found — are you in a BackGen project?");

  const version = manifest.generatedVersion;
  const backupDir = path.join(projectDir, ".backgen", "backups", `pre-${version}`);

  const files = Object.keys(manifest.files);
  if (files.length === 0) return;

  await fs.mkdir(backupDir, { recursive: true });

  // Backup manifest too
  await fs.copyFile(
    path.join(projectDir, ".backgenrc.json"),
    path.join(backupDir, ".backgenrc.json")
  );

  let count = 0;
  for (const relPath of files) {
    const src = path.join(projectDir, relPath);
    const dest = path.join(backupDir, relPath);
    try {
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(src, dest);
      count++;
    } catch {
      // File doesn't exist on disk — skip
    }
  }

  console.log(`  Backup created: .backgen/backups/pre-${version}/ (${count} files)`);
}

/**
 * Find the most recent backup directory for a project.
 */
export async function getLatestBackup(projectDir: string): Promise<string | null> {
  const backupsDir = path.join(projectDir, ".backgen", "backups");
  try {
    const entries = await fs.readdir(backupsDir);
    const preDirs = entries.filter((e) => e.startsWith("pre-"));
    if (preDirs.length === 0) return null;

    let latest: string | null = null;
    let latestMtime = 0;
    for (const entry of preDirs) {
      const stat = await fs.stat(path.join(backupsDir, entry));
      if (stat.mtimeMs > latestMtime) {
        latestMtime = stat.mtimeMs;
        latest = entry;
      }
    }

    return latest ? path.join(backupsDir, latest) : null;
  } catch {
    return null;
  }
}

/**
 * List all available backup names for a project, newest first.
 */
export async function listBackups(projectDir: string): Promise<string[]> {
  const backupsDir = path.join(projectDir, ".backgen", "backups");
  try {
    const entries = await fs.readdir(backupsDir);
    return entries.filter((e) => e.startsWith("pre-")).sort().reverse();
  } catch {
    return [];
  }
}

/**
 * Restore project files and manifest from a backup directory.
 */
export async function restoreBackup(
  projectDir: string,
  backupDir: string
): Promise<void> {
  const manifestPath = path.join(backupDir, ".backgenrc.json");

  let backupManifest: ProjectManifest;
  try {
    const content = await fs.readFile(manifestPath, "utf-8");
    backupManifest = JSON.parse(content) as ProjectManifest;
  } catch {
    throw new Error("Invalid backup — no .backgenrc.json found");
  }

  // Restore manifest first
  await fs.copyFile(manifestPath, path.join(projectDir, ".backgenrc.json"));

  // Restore each tracked file
  const files = Object.keys(backupManifest.files);
  for (const relPath of files) {
    const src = path.join(backupDir, relPath);
    const dest = path.join(projectDir, relPath);
    try {
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(src, dest);
    } catch {
      // File not in backup — skip
    }
  }
}
