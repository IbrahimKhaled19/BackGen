import type { TemplateEngine } from "./template-engine.js";

export interface FileMutation {
  file: string;
  operation: "append" | "prepend" | "replace";
  marker?: string;
  content: string;
}

export interface InstallContext {
  projectDir: string;
  projectName: string;
  engine: TemplateEngine;
  mutate(mutations: FileMutation[]): Promise<void>;
}

export interface PluginMetadata {
  version: string;
  installedAt: string;
  source: "core" | "community";
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

  install(ctx: InstallContext): Promise<void>;
  uninstall?(ctx: InstallContext): Promise<void>;
}
