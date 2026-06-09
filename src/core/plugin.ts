import type { TemplateEngine } from "./template-engine.js";
import type { MigrationContext } from "./migration.js";

export interface PluginMigration {
  from: string;
  to: string;
  description: string;
  up: (ctx: MigrationContext) => Promise<void>;
}

export interface FileMutation {
  file: string;
  operation: "append" | "prepend" | "replace";
  marker?: string;
  content: string;
}

export interface InstallContext {
  projectDir: string;
  projectName: string;
  orm: string;
  engine: TemplateEngine;
  mutate(mutations: FileMutation[]): Promise<void>;
  /** Register files created via direct fs calls (outside engine/mutate) for cleanup on uninstall */
  trackFile?(file: string): void;
}

export interface PluginMetadata {
  version: string;
  installedAt: string;
  source: "core" | "community";
  /** Absolute paths of files created during install */
  files?: string[];
  /** Original content of files before mutation, keyed by absolute path */
  fileSnapshots?: Record<string, string>;
}

export interface BackGenPlugin {
  name: string;
  category: string;
  description: string;
  version: string;
  available: boolean;

  dependencies?: string[];
  devDependencies?: string[];
  requires?: string[];
  conflicts?: string[];

  env?: Record<string, string>;

  templates: string[];

  migrations?: PluginMigration[];

  install(ctx: InstallContext): Promise<void>;
  uninstall?(ctx: InstallContext): Promise<void>;
}
