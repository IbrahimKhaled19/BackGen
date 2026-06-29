import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { TemplateEngine } from "../core/template-engine.js";
import { createPlaceholders } from "../core/placeholders.js";
import { createFieldDefinitions } from "../core/field-mapper.js";
import { createSchemaGenerator } from "../core/schema-generator.js";
import { readManifest } from "../core/manifest.js";
import { registerRoute } from "../core/route-registrar.js";
import { spawn } from "child_process";
import { toPascalCase, toCamelCase } from "../core/string-utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/express");

export interface RelationDefinition {
  name: string;
  type: "belongsTo" | "hasMany";
  target: string;
}

const RESOURCE_TEMPLATES = [
  { template: "src/modules/resource/resource.types.ts.hbs", output: "src/modules/{name}/{name}.types.ts" },
  { template: "src/modules/resource/resource.validation.ts.hbs", output: "src/modules/{name}/{name}.validation.ts" },
  { template: "src/modules/resource/resource.repository.ts.hbs", output: "src/modules/{name}/{name}.repository.ts" },
  { template: "src/modules/resource/resource.service.ts.hbs", output: "src/modules/{name}/{name}.service.ts" },
  { template: "src/modules/resource/resource.controller.ts.hbs", output: "src/modules/{name}/{name}.controller.ts" },
  { template: "src/modules/resource/resource.routes.ts.hbs", output: "src/modules/{name}/{name}.routes.ts" },
  { template: "src/modules/resource/resource.test.ts.hbs", output: "src/modules/{name}/{name}.test.ts" },
];

export interface GenerateOptions {
  fields?: string;
  relations?: string;
  softDelete?: boolean;
}

export async function generateCommand(
  name: string,
  positionalFields: string[],
  options: GenerateOptions
): Promise<void> {
  console.log(chalk.blue.bold(`\n📦 BackGen - Generate Resource: ${name}\n`));

  const projectDir = process.cwd();

  // Check we're in a BackGen project
  let orm = "prisma";
  try {
    await fs.access(path.join(projectDir, "package.json"));
    const manifest = await readManifest(projectDir);
    orm = manifest?.project?.orm ?? "prisma";
    // Verify schema directory exists for this ORM
    const schemaGen = createSchemaGenerator(orm);
    const schemaPath = schemaGen.getSchemaPath(projectDir);
    try {
      await fs.access(schemaPath);
    } catch {
      // For Prisma it's a file, for others a directory — try stat
      await fs.stat(schemaPath);
    }
  } catch {
    throw new Error("Not in a BackGen project directory (no package.json or schema found)");
  }

  const resourceName = toPascalCase(name);
  const moduleName = toCamelCase(name);

  // Check if module already exists
  const moduleDir = path.join(projectDir, "src", "modules", moduleName);
  try {
    await fs.access(moduleDir);
    throw new Error(`Resource "${resourceName}" already exists.`);
  } catch {
    // Directory doesn't exist, good
  }

  // Collect fields
  let fields = positionalFields;
  if (options.fields) {
    fields = options.fields.split(",").map((f) => f.trim());
  }
  if (fields.length === 0) {
    const answer = await inquirer.prompt([
      {
        type: "input",
        name: "fields",
        message: "Enter fields (name:type, comma-separated):",
        validate: (input: string) => {
          const fieldDefs = input.split(",").map((f) => f.trim());
          for (const field of fieldDefs) {
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*(string|number|boolean|date)$/.test(field)) {
              return `Invalid field: "${field}". Format: name:type (string, number, boolean, date)`;
            }
          }
          return true;
        },
      },
    ]);
    fields = answer.fields.split(",").map((f: string) => f.trim());
  }

  const fieldDefs = createFieldDefinitions(fields, orm);
  if (fieldDefs.length === 0) {
    throw new Error("No valid fields provided.");
  }

  // Collect relations
  let relations: RelationDefinition[] = [];
  if (options.relations) {
    relations = parseRelations(options.relations);
  } else if (positionalFields.length > 0 || options.fields) {
    // Non-interactive mode — skip relation prompt
    relations = [];
  } else {
    // Only ask interactively if fields were also collected interactively
    const { addRelations } = await inquirer.prompt([
      {
        type: "confirm",
        name: "addRelations",
        message: "Add relations to other models?",
        default: false,
      },
    ]);
    if (addRelations) {
      const answer = await inquirer.prompt([
        {
          type: "input",
          name: "relations",
          message: "Enter relations (name:Type, comma-separated):",
          validate: (input: string) => {
            if (!input.trim()) return true;
            const rels = input.split(",").map((r) => r.trim());
            for (const rel of rels) {
              if (!/^[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*[A-Z][a-zA-Z0-9_]*$/.test(rel)) {
                return `Invalid relation: "${rel}". Format: name:Type (e.g., doctor:Doctor)`;
              }
            }
            return true;
          },
        },
      ]);
      if (answer.relations.trim()) {
        relations = parseRelations(answer.relations);
      }
    }
  }

  const placeholders = createPlaceholders(name);
  const ormTemplatesDir = path.resolve(TEMPLATES_DIR, "..", `express.${orm}`);
  const engine = new TemplateEngine(TEMPLATES_DIR, ormTemplatesDir);

  const context = {
    ...placeholders,
    fields: fieldDefs,
    relations,
    hasRelations: relations.length > 0,
    softDelete: options.softDelete ?? false,
    projectName: path.basename(projectDir),
  };

  const spinner = ora("Generating resource files...").start();

  try {
    // Create module directory
    await fs.mkdir(moduleDir, { recursive: true });

    // Generate all resource files
    for (const { template, output } of RESOURCE_TEMPLATES) {
      const outputPath = path.join(projectDir, output.replaceAll("{name}", moduleName));
      await engine.renderToFile(template, context, outputPath);
    }

    // Add model to schema
    spinner.text = `Updating ${orm} schema...`;
    const schemaGen = createSchemaGenerator(orm);
    await schemaGen.addModel(projectDir, resourceName, fieldDefs, relations, options.softDelete ?? false);

    // Register routes in app.ts
    spinner.text = "Registering routes...";
    await registerRoute(projectDir, name);

    // Run drizzle-kit generate for Drizzle projects (non-fatal)
    if (orm === "drizzle") {
      spinner.text = "Running drizzle-kit generate...";
      try {
        await new Promise<void>((resolve, reject) => {
          const child = spawn("npx", ["drizzle-kit", "generate"], { cwd: projectDir, stdio: "inherit", shell: true });
          child.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`drizzle-kit generate exited with code ${code}`));
          });
          child.on("error", reject);
        });
      } catch (err) {
        console.log(chalk.yellow(`  ⚠ drizzle-kit generate failed (non-fatal): ${(err as Error).message}`));
        console.log(chalk.yellow("  Run `npx drizzle-kit generate` manually after dependencies are installed."));
      }
    }

    spinner.succeed("Resource generated successfully!");

    console.log(chalk.green(`\n✨ Resource "${resourceName}" created!\n`));
    console.log("Files created:");
    console.log(chalk.cyan(`  src/modules/${moduleName}/`));
    console.log(`    ${moduleName}.types.ts`);
    console.log(`    ${moduleName}.validation.ts`);
    console.log(`    ${moduleName}.repository.ts`);
    console.log(`    ${moduleName}.service.ts`);
    console.log(`    ${moduleName}.controller.ts`);
    console.log(`    ${moduleName}.routes.ts`);
    console.log(`    ${moduleName}.test.ts`);

    if (relations.length > 0) {
      console.log("\nRelations:");
      for (const rel of relations) {
        console.log(chalk.cyan(`  ${rel.name} → ${rel.target} (${rel.type})`));
      }
    }

    console.log("\nNext steps:");
    console.log(chalk.cyan("  npm run db:push    # Update database"));
    console.log(chalk.cyan("  npm run dev        # Start server\n"));
  } catch (error) {
    spinner.fail("Generation failed");
    throw error;
  }
}

function parseRelations(input: string): RelationDefinition[] {
  return input
    .split(",")
    .map((r) => r.trim())
    .filter((r) => r.length > 0)
    .map((r) => {
      const [name, target] = r.split(":").map((s) => s.trim());
      // Default: belongsTo for singular, hasMany for plural
      const type: "belongsTo" | "hasMany" = target.endsWith("s") ? "hasMany" : "belongsTo";
      return { name, type, target: toPascalCase(target) };
    });
}

