import type { BackGenPlugin } from "./plugin.js";
import { ciGithubPlugin } from "../plugins/ci-github/index.js";
import { codeqlPlugin } from "../plugins/codeql/index.js";
import { dependabotPlugin } from "../plugins/dependabot/index.js";
import { jwtPlugin } from "../plugins/jwt/index.js";
import { stripePlugin } from "../plugins/stripe/index.js";
import { s3Plugin } from "../plugins/s3/index.js";
import { clerkPlugin } from "../plugins/clerk/index.js";
import { hardeningPlugin } from "../plugins/hardening/index.js";
import { ratelimitPlugin } from "../plugins/ratelimit/index.js";
import { sanitizePlugin } from "../plugins/sanitize/index.js";
import { dockerRegistryPlugin } from "../plugins/docker-registry/index.js";
import { releasePlugin } from "../plugins/release/index.js";

const PLUGINS: Record<string, BackGenPlugin> = {
  "ci-github": ciGithubPlugin,
  codeql: codeqlPlugin,
  "dependabot": dependabotPlugin,
  "docker-registry": dockerRegistryPlugin,
  release: releasePlugin,
  jwt: jwtPlugin,
  stripe: stripePlugin,
  s3: s3Plugin,
  clerk: clerkPlugin,
  hardening: hardeningPlugin,
  ratelimit: ratelimitPlugin,
  sanitize: sanitizePlugin,
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

export function checkRequirements(pluginName: string, installed: string[], orm?: string): string[] {
  const plugin = PLUGINS[pluginName];
  if (!plugin?.requires) return [];
  return plugin.requires.filter((r) => !installed.includes(r) && r !== orm);
}
