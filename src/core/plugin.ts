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

/** A file edit a plugin made, recorded so uninstall can undo exactly it */
export interface AppliedMutation {
  /** Path relative to the project root */
  file: string;
  operation: FileMutation["operation"];
  /** The exact text this plugin inserted — removed again on uninstall */
  inserted: string;
}

export interface PluginMetadata {
  version: string;
  installedAt: string;
  source: "core" | "community";
  /** Absolute paths of files touched during install */
  files?: string[];
  /** File edits made during install, undone precisely on uninstall */
  mutations?: AppliedMutation[];
  /**
   * Previous content of files the plugin overwrote (absolute path → content).
   * Restored on uninstall instead of deleting them.
   */
  overwrites?: Record<string, string>;
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
