import { readFileSync } from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import type { PluginMetadata, AppliedMutation } from "./plugin.js";

// ── Ownership tracking ────────────────────────────────────────

export type FileOwner = "framework" | "framework-editable" | "shared" | "user";

export interface FileMetadata {
  owner: FileOwner;
  /** BackGen version that last generated/updated this file (absent for user-owned files) */
  version?: string;
}

/** Shorthand used by init.ts ownership register — version optional for user-owned files */
export type FileEntry = FileMetadata;

// ── Manifest ───────────────────────────────────────────────────

export interface ProjectManifest {
  version: string;
  generatedVersion: string;
  project: {
    name: string;
    framework: string;
    database: string;
    orm: string;
    preset?: string;
  };
  plugins: Record<string, PluginMetadata>;
  /** Ownership register for every generated file */
  files: Record<string, FileMetadata>;
}

const MANIFEST_FILE = ".backgenrc.json";

/**
 * Read the project manifest from .backgenrc.json.
 * Applies backward-compat defaults for pre-V5 (missing orm) and pre-V6.1 (missing generatedVersion/files).
 * Returns null if no manifest exists.
 */
export async function readManifest(projectDir: string): Promise<ProjectManifest | null> {
  try {
    const filePath = path.join(projectDir, MANIFEST_FILE);
    const content = await fs.readFile(filePath, "utf-8");
    const manifest = JSON.parse(content) as ProjectManifest;
    // Backward compat: pre-V5 manifests have no orm field
    if (!manifest.project.orm) {
      manifest.project.orm = "prisma";
    }
    // Backward compat: pre-V6.1 manifests have no generatedVersion or files
    if (!manifest.generatedVersion) {
      manifest.generatedVersion = "0.0.0";
    }
    if (!manifest.files) {
      manifest.files = {};
    }
    return manifest;
  } catch {
    return null;
  }
}

/**
 * Write the project manifest to .backgenrc.json.
 */
export async function writeManifest(projectDir: string, manifest: ProjectManifest): Promise<void> {
  const filePath = path.join(projectDir, MANIFEST_FILE);
  await fs.writeFile(filePath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
}

/**
 * Create a new manifest object for a project.
 * Preserves backward compat with version "1.3.0".
 * @param files - Ownership register entries, keyed by relative file path
 */
export function createManifest(
  projectName: string,
  orm: string = "prisma",
  preset?: string,
  version?: string,
  files?: Record<string, FileEntry>
): ProjectManifest {
  return {
    version: "1.3.0",
    generatedVersion: version ?? getBackgenVersion(),
    project: {
      name: projectName,
      framework: "express",
      database: "postgresql",
      orm,
      ...(preset ? { preset } : {}),
    },
    plugins: {},
    files: files ?? {},
  };
}

/**
 * Register a plugin in the manifest, recording version, install date, tracked files,
 * and the exact file edits made during install (undone precisely on uninstall).
 * @param files - Absolute paths of files created during install (for cleanup on uninstall)
 * @param mutations - File edits made during install (for revert on uninstall)
 * @param overwrites - Previous content of files the plugin overwrote (restored on uninstall)
 */
export async function addPluginToManifest(
  projectDir: string,
  pluginName: string,
  pluginVersion: string,
  source: "core" | "community" = "core",
  files?: string[],
  mutations?: AppliedMutation[],
  overwrites?: Record<string, string>
): Promise<void> {
  const manifest = (await readManifest(projectDir)) ?? createManifest(path.basename(projectDir));
  manifest.plugins[pluginName] = {
    version: pluginVersion,
    installedAt: new Date().toISOString().split("T")[0],
    source,
    ...(files && files.length > 0 ? { files } : {}),
    ...(mutations && mutations.length > 0 ? { mutations } : {}),
    ...(overwrites && Object.keys(overwrites).length > 0 ? { overwrites } : {}),
  };
  await writeManifest(projectDir, manifest);
}

/**
 * Remove a plugin from the manifest.
 */
export async function removePluginFromManifest(
  projectDir: string,
  pluginName: string
): Promise<void> {
  const manifest = await readManifest(projectDir);
  if (!manifest) return;
  delete manifest.plugins[pluginName];
  await writeManifest(projectDir, manifest);
}

/**
 * Get all installed plugins from the manifest.
 */
export async function getInstalledPlugins(projectDir: string): Promise<Record<string, PluginMetadata>> {
  const manifest = await readManifest(projectDir);
  return manifest?.plugins ?? {};
}

// ── Ownership helpers ──────────────────────────────────────────

/** Read BackGen's own version from package.json */
export function getBackgenVersion(): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkgPath = path.resolve(__dirname, "../../package.json");
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** Update ownership of an existing file in the manifest */
export async function updateFileOwnership(
  projectDir: string,
  relativePath: string,
  owner: FileOwner,
  version?: string
): Promise<void> {
  const manifest = await readManifest(projectDir);
  if (!manifest) return;
  const normalized = relativePath.replace(/\\/g, "/");
  manifest.files[normalized] = version ? { owner, version } : { owner };
  await writeManifest(projectDir, manifest);
}
