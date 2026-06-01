import type { BackGenPlugin } from "./plugin.js";
import { jwtPlugin } from "../plugins/jwt/index.js";
import { stripePlugin } from "../plugins/stripe/index.js";
import { s3Plugin } from "../plugins/s3/index.js";
import { clerkPlugin } from "../plugins/clerk/index.js";

const PLUGINS: Record<string, BackGenPlugin> = {
  jwt: jwtPlugin,
  stripe: stripePlugin,
  s3: s3Plugin,
  clerk: clerkPlugin,
};

export function getPlugin(name: string): BackGenPlugin | undefined {
  return PLUGINS[name];
}

export function listPlugins(): BackGenPlugin[] {
  return Object.values(PLUGINS);
}

export function listAvailablePlugins(): BackGenPlugin[] {
  return Object.values(PLUGINS).filter((p) => p.available);
}

export function getPluginsByCategory(category: string): BackGenPlugin[] {
  return Object.values(PLUGINS).filter((p) => p.category === category && p.available);
}

export function getCategories(): string[] {
  const categories = new Set(
    Object.values(PLUGINS)
      .filter((p) => p.available)
      .map((p) => p.category)
  );
  return [...categories];
}

export function checkConflicts(pluginName: string, installed: string[]): string[] {
  const plugin = PLUGINS[pluginName];
  if (!plugin?.conflicts) return [];
  return plugin.conflicts.filter((c) => installed.includes(c));
}

export function checkRequirements(pluginName: string, installed: string[]): string[] {
  const plugin = PLUGINS[pluginName];
  if (!plugin?.requires) return [];
  return plugin.requires.filter((r) => !installed.includes(r));
}
