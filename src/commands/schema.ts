import chalk from "chalk";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  parseAndValidateYaml,
  fieldsToFieldStrings,
  relationsToRelationDefs,
} from "../core/yaml-schema.js";
import { readManifest } from "../core/manifest.js";
import { PluginInstaller } from "../core/plugin-installer.js";
import { getPlugin } from "../core/plugin-registry.js";
import { generateCommand } from "./generate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/express");

export interface SchemaCommandOptions {
  init?: boolean;
  skipInstall?: boolean;
}

/**
 * `backgen generate schema <file>`
 *
 * Reads a backgen.yaml / .yml file and:
 * 1. (Optional) Scaffolds a new project via init if --init flag is set
 * 2. Installs all plugins listed in the schema
 * 3. Generates all resources defined in the schema
 */
export async function schemaCommand(
  schemaFile: string,
  options: SchemaCommandOptions
): Promise<void> {
  const projectDir = process.cwd();

  console.log(chalk.blue.bold("\n📐 BackGen - Schema-First Generation\n"));

  // Parse schema
  const spinner = (await import("ora")).default;
  const parseSpinner = spinner("Parsing schema file...").start();
  let schema: Awaited<ReturnType<typeof parseAndValidateYaml>>;
  try {
    schema = await parseAndValidateYaml(schemaFile);
    parseSpinner.succeed(`Schema valid: ${Object.keys(schema.resources ?? {}).length} resource(s), ${schema.plugins.length} plugin(s)`);
  } catch (err) {
    parseSpinner.fail("Schema parse failed");
    console.error(chalk.red(`\n${(err as Error).message}`));
    process.exit(1);
  }

  // Check project context
  const manifest = await readManifest(projectDir);
  if (!manifest) {
    if (options.init) {
      console.log(chalk.cyan("\nNo BackGen project found. Scaffolding new project...\n"));
      const { initCommand } = await import("../commands/init.js");
      await initCommand(schema.project.name, {
        defaults: true,
        skipInstall: options.skipInstall,
        orm: schema.project.orm,
      });
      const newManifest = await readManifest(projectDir);
      if (!newManifest) {
        console.error(chalk.red("Init completed but manifest not found. Aborting."));
        process.exit(1);
      }
    } else {
      console.error(
        chalk.red("Error: No BackGen project found. Run from a project directory or use --init.")
      );
      console.log(chalk.yellow(`  backgen generate schema ${schemaFile} --init`));
      process.exit(1);
    }
  }

  const orm = manifest?.project?.orm ?? schema.project.orm ?? "prisma";

  // Install plugins
  if (schema.plugins.length > 0) {
    const installed = manifest?.plugins ?? {};
    const toInstall = schema.plugins.filter((p) => !installed[p]);

    if (toInstall.length > 0) {
      console.log(chalk.cyan(`\nInstalling ${toInstall.length} plugin(s)...`));
      const installer = new PluginInstaller(TEMPLATES_DIR, orm);

      for (const pluginName of toInstall) {
        const plugin = getPlugin(pluginName);
        if (!plugin) {
          console.log(chalk.yellow(`  ⚠ Unknown plugin "${pluginName}" — skipping`));
          continue;
        }
        try {
          const pSpinner = spinner(`Installing ${pluginName}...`).start();
          await installer.install(projectDir, plugin);
          pSpinner.succeed(`${pluginName} installed`);
        } catch (err) {
          console.log(chalk.red(`  ✘ ${pluginName} failed: ${(err as Error).message}`));
        }
      }
    } else {
      console.log(chalk.gray("\nAll plugins already installed."));
    }
  }

  // Generate resources
  const resourceEntries = Object.entries(schema.resources ?? {});
  if (resourceEntries.length > 0) {
    console.log(chalk.cyan(`\nGenerating ${resourceEntries.length} resource(s)...\n`));
    const hasAuth = manifest?.plugins?.jwt || manifest?.plugins?.clerk;

    for (const [resName, resource] of resourceEntries) {
      try {
        // Check for auth requirements (relation targeting "User")
        const needsAuth = Object.values(resource.relations).some(
          (target) => target === "User"
        );

        if (needsAuth && !hasAuth) {
          console.log(
            chalk.yellow(
              `  ⚠ Skipping ${resName} (references User; install jwt/clerk plugin first)`
            )
          );
          continue;
        }

        const rSpinner = spinner(`Generating ${resName}...`).start();

        const fieldStrings = fieldsToFieldStrings(resource.fields);
        const relDefs = relationsToRelationDefs(resource.relations);
        const relString = relDefs.length > 0
          ? relDefs.map((r) => `${r.name}:${r.target}`).join(",")
          : undefined;

        await generateCommand(resName, fieldStrings, {
          relations: relString,
          softDelete: resource.softDelete,
        });

        rSpinner.succeed(`${resName} generated`);
      } catch (err) {
        console.log(chalk.red(`  ✘ ${resName} failed: ${(err as Error).message}`));
      }
    }
  }

  console.log(chalk.green.bold("\n✨ Schema generation complete!\n"));

  // Run prisma generate if applicable (non-fatal)
  if (orm === "prisma" && !options.skipInstall) {
    try {
      const { spawn } = await import("child_process");
      console.log(chalk.gray("  Running prisma generate...\n"));
      await new Promise<void>((resolve, reject) => {
        const child = spawn("npx", ["prisma", "generate"], {
          cwd: projectDir,
          stdio: "inherit",
          shell: true,
        });
        child.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`prisma generate exited with code ${code}`));
        });
        child.on("error", reject);
      });
    } catch (err) {
      console.log(chalk.yellow(`  ⚠ prisma generate failed (non-fatal): ${(err as Error).message}`));
      console.log(chalk.yellow("  Run `npx prisma generate` manually.\n"));
    }
  }
}
