import * as fs from "fs/promises";
import * as path from "path";
import type { PluginMetadata } from "./plugin.js";

export interface ProjectManifest {
  version: string;
  project: {
    name: string;
    framework: string;
    database: string;
    orm: string;
    preset?: string;
  };
  plugins: Record<string, PluginMetadata>;
}

const MANIFEST_FILE = ".backgenrc.json";

export async function readManifest(projectDir: string): Promise<ProjectManifest | null> {
  try {
    const filePath = path.join(projectDir, MANIFEST_FILE);
    const content = await fs.readFile(filePath, "utf-8");
    const manifest = JSON.parse(content) as ProjectManifest;
    // Backward compat: pre-V5 manifests have no orm field
    if (!manifest.project.orm) {
      manifest.project.orm = "prisma";
    }
    return manifest;
  } catch {
    return null;
  }
}

export async function writeManifest(projectDir: string, manifest: ProjectManifest): Promise<void> {
  const filePath = path.join(projectDir, MANIFEST_FILE);
  await fs.writeFile(filePath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
}

export function createManifest(projectName: string, orm: string = "prisma", preset?: string): ProjectManifest {
  return {
    version: "1.2.0",
    project: {
      name: projectName,
      framework: "express",
      database: "postgresql",
      orm,
      ...(preset ? { preset } : {}),
    },
    plugins: {},
  };
}

export async function addPluginToManifest(
  projectDir: string,
  pluginName: string,
  pluginVersion: string,
  source: "core" | "community" = "core"
): Promise<void> {
  const manifest = (await readManifest(projectDir)) ?? createManifest(path.basename(projectDir));
  manifest.plugins[pluginName] = {
    version: pluginVersion,
    installedAt: new Date().toISOString().split("T")[0],
    source,
  };
  await writeManifest(projectDir, manifest);
}

export async function removePluginFromManifest(
  projectDir: string,
  pluginName: string
): Promise<void> {
  const manifest = await readManifest(projectDir);
  if (!manifest) return;
  delete manifest.plugins[pluginName];
  await writeManifest(projectDir, manifest);
}

export async function getInstalledPlugins(projectDir: string): Promise<Record<string, PluginMetadata>> {
  const manifest = await readManifest(projectDir);
  return manifest?.plugins ?? {};
}
