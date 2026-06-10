import inquirer from "inquirer";
import chalk from "chalk";
import {
  listAvailablePlugins,
  getPlugin,
  checkConflicts,
} from "./plugin-registry.js";
import type { BackGenPlugin } from "./plugin.js";

const CATEGORY_LABELS: Record<string, string> = {
  auth: "Authentication",
  payment: "Payment",
  storage: "Storage",
  production: "Production Hardening",
  devops: "DevOps Pipeline",
};

const CATEGORY_ORDER = ["auth", "payment", "storage", "production", "devops"];

function isAuthSingleSelect(cat: string): boolean {
  return cat === "auth";
}

/**
 * Show interactive plugin selection grouped by category.
 * Auth category is single-select (jwt / clerk / none).
 * All others are multi-select (checkbox).
 * Returns ordered list of plugin names (dependencies first).
 */
export async function selectPluginsInteractive(
  orm: string,
  installed: string[] = []
): Promise<string[]> {
  const allPlugins = listAvailablePlugins();

  // Group by category
  const byCategory: Record<string, BackGenPlugin[]> = {};
  for (const p of allPlugins) {
    if (!byCategory[p.category]) byCategory[p.category] = [];
    byCategory[p.category].push(p);
  }

  const selected: string[] = [];

  for (const cat of CATEGORY_ORDER) {
    const plugins = byCategory[cat];
    if (!plugins?.length) continue;
    if (plugins.every((p) => installed.includes(p.name))) continue;

    const label = CATEGORY_LABELS[cat] ?? cat;

    if (isAuthSingleSelect(cat)) {
      // Single-select: pick one auth provider or none
      const choices: Array<{ name: string; value: string; disabled?: string }> = [
        { name: "(none)", value: "" },
      ];
      for (const p of plugins) {
        choices.push({
          name: `${p.name} — ${p.description}`,
          value: p.name,
          disabled: installed.includes(p.name) ? "already installed" : undefined,
        });
      }

      const answer = await inquirer.prompt([
        {
          type: "list",
          name: "auth",
          message: `Select ${label}:`,
          choices,
        },
      ]);

      if (answer.auth) selected.push(answer.auth);
    } else {
      // Multi-select checkbox
      const choices = plugins.map((p) => ({
        name: `${p.name} — ${p.description}`,
        value: p.name,
        disabled: installed.includes(p.name) ? "already installed" : undefined,
      }));

      const answer = await inquirer.prompt([
        {
          type: "checkbox",
          name: "plugins",
          message: `Select ${label} plugins (space to select, enter to confirm):`,
          choices,
        },
      ]);

      selected.push(...answer.plugins);
    }
  }

  return orderByDependencies(normalizeSelection(selected, installed));
}

/**
 * Filter out already-installed, validate conflicts, add implicit deps.
 */
function normalizeSelection(
  selected: string[],
  installed: string[]
): string[] {
  // Remove already installed
  const result = selected.filter((s) => !installed.includes(s));

  // Validate conflicts across selection
  for (const name of result) {
    const conflicts = checkConflicts(name, result.filter((r) => r !== name));
    if (conflicts.length > 0) {
      console.error(
        chalk.red(`Error: "${name}" conflicts with: ${conflicts.join(", ")}`)
      );
      console.log(
        chalk.yellow("Select only one auth provider (jwt or clerk).")
      );
      process.exit(1);
    }
  }

  return result;
}

/**
 * Topological sort by dependencies — plugins with no deps first.
 */
function orderByDependencies(names: string[]): string[] {
  const result: string[] = [];

  function visit(name: string): void {
    if (result.includes(name)) return;

    const plugin = getPlugin(name);
    if (plugin?.requires) {
      for (const dep of plugin.requires) {
        // Only include deps that are in the selection or already installed
        if (names.includes(dep)) visit(dep);
      }
    }

    result.push(name);
  }

  for (const name of names) visit(name);

  return result;
}
