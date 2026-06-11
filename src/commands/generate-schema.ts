import chalk from "chalk";
import * as path from "path";
import { parseAndValidateYaml, parseSchemaObject, fieldsToFieldStrings, relationsToRelationDefs, } from "../core/yaml-schema.js";
import type { ParsedSchema } from "../core/yaml-schema.js";
import { getPlugin, listAvailablePlugins } from "../core/plugin-registry.js";
import { PluginInstaller } from "../core/plugin-installer.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/express");

// ── CLI entry point ────────────────────────────────────────────────

export async function generateSchemaCommand(filePath: string, options: { out?: string }): Promise<void> {
  console.log(chalk.blue.bold("\n🔌 BackGen - Generate from Schema\n"));

  const schema = await parseAndValidateYaml(filePath);

  // Resolve output directory
  const outputDir = options.out
    ? path.resolve(process.cwd(), options.out)
    : path.resolve(process.cwd(), schema.project.name);

  await generateProjectFromSchema(schema, outputDir);
}

// ── Core engine API (reusable by MCP / web / VS Code) ──────────────

export async function generateProjectFromSchema(schema: ParsedSchema, projectDir: string): Promise<void> {
  const { initCommand } = await import("./init.js");
  const { generateCommand } = await import("./generate.js");

  // 1. Validate plugins against registry
  if (schema.plugins.length > 0) {
    const available = listAvailablePlugins().map((p) => p.name);
    const unknown = schema.plugins.filter((p) => !available.includes(p));
    if (unknown.length > 0) {
      console.error(chalk.red(`Unknown plugin(s): ${unknown.join(", ")}`));
      console.log(chalk.cyan("Available:"), available.join(", "));
      process.exit(1);
    }
    console.log(chalk.green(`✓ ${schema.plugins.length} plugin(s) validated`));
  }

  // 2. Scaffold project
  // initCommand creates a subdir at cwd/<projectName>, so we cwd to parent
  const origCwd = process.cwd();
  const parentDir = path.dirname(projectDir);
  const dirName = path.basename(projectDir);

  try {
    process.chdir(parentDir);
    await initCommand(dirName, {
      defaults: true,
      orm: schema.project.orm,
      skipInstall: true,
    });
  } finally {
    process.chdir(origCwd);
  }

  const actualProjectDir = path.resolve(parentDir, dirName);
  console.log(chalk.green(`✓ Project scaffolded at ${actualProjectDir}`));

  // 3. Install plugins BEFORE resources (plugins may influence resource generation)
  if (schema.plugins.length > 0) {
    console.log(chalk.cyan(`\nInstalling ${schema.plugins.length} plugin(s)...\n`));
    const installer = new PluginInstaller(TEMPLATES_DIR, schema.project.orm);
    const { succeeded, failed } = await installer.installBulk(actualProjectDir, schema.plugins);
    if (succeeded.length > 0) {
      console.log(chalk.green(`  ✓ ${succeeded.length} plugin(s) installed`));
    }
    if (failed.length > 0) {
      console.error(chalk.red(`  ✘ ${failed.length} plugin(s) failed: ${failed.join(", ")}`));
      process.exit(1);
    }
  }

  // 4. Generate resources
  const resourceNames = Object.keys(schema.resources);
  if (resourceNames.length > 0) {
    console.log(chalk.cyan(`\nGenerating ${resourceNames.length} resource(s)...\n`));
    for (const name of resourceNames) {
      const resource = schema.resources[name];
      const fieldStrs = fieldsToFieldStrings(resource.fields);
      const relDefs = relationsToRelationDefs(resource.relations);

      // generateCommand reads process.cwd() to find the project
      process.chdir(actualProjectDir);
      try {
        await generateCommand(name, fieldStrs, {
          relations: relDefs.length > 0
            ? relDefs.map((r) => `${r.name}:${r.target}`).join(",")
            : undefined,
          softDelete: resource.softDelete,
        });
        console.log(chalk.green(`  ✓ ${name}`));
      } catch (err: any) {
        // Model may already exist from a plugin (e.g. jwt creates User)
        if (err?.message?.includes?.("already exists in schema")) {
          console.log(chalk.yellow(`  ⚠ ${name} (model exists — CRUD files generated)`));
        } else {
          throw err;
        }
      } finally {
        process.chdir(origCwd);
      }
    }
  }

  // 5. Install npm dependencies
  console.log(chalk.cyan("\nInstalling dependencies...\n"));
  const { execSync } = await import("child_process");
  execSync("npm install", { cwd: actualProjectDir, stdio: "inherit" });

  // 6. Prisma generate if applicable
  if (schema.project.orm === "prisma") {
    console.log(chalk.cyan("\nGenerating Prisma client...\n"));
    try {
      execSync("npx prisma generate", { cwd: actualProjectDir, stdio: "inherit" });
    } catch {
      console.log(chalk.yellow("  ⚠ prisma generate skipped"));
    }
  }

  console.log(chalk.green.bold(`\n✨ Project "${schema.project.name}" generated successfully!\n`));
  console.log(chalk.cyan(`  cd ${path.relative(origCwd, actualProjectDir)}`));
  console.log(chalk.cyan("  cp .env.example .env"));
  console.log(chalk.cyan("  # Edit .env with your database URL"));
  console.log(chalk.cyan("  npm run dev\n"));
}
