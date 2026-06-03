import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { TemplateEngine } from "../core/template-engine.js";
import { createPlaceholders } from "../core/placeholders.js";
import { createFieldDefinitions } from "../core/field-mapper.js";
import { addModelToSchema } from "../core/prisma-updater.js";
import { registerRoute } from "../core/route-registrar.js";

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
  try {
    await fs.access(path.join(projectDir, "package.json"));
    await fs.access(path.join(projectDir, "prisma", "schema.prisma"));
  } catch {
    console.error(chalk.red("Error: Not in a BackGen project directory."));
    process.exit(1);
  }

  const resourceName = toPascalCase(name);
  const moduleName = toCamelCase(name);

  // Check if module already exists
  const moduleDir = path.join(projectDir, "src", "modules", moduleName);
  try {
    await fs.access(moduleDir);
    console.error(chalk.red(`Error: Resource "${resourceName}" already exists.`));
    process.exit(1);
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

  const fieldDefs = createFieldDefinitions(fields);
  if (fieldDefs.length === 0) {
    console.error(chalk.red("Error: No valid fields provided."));
    process.exit(1);
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
  const engine = new TemplateEngine(TEMPLATES_DIR);

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

    // Add model to Prisma schema
    spinner.text = "Updating Prisma schema...";
    await addModelToSchema(projectDir, resourceName, fieldDefs, relations, options.softDelete ?? false);

    // Register routes in app.ts
    spinner.text = "Registering routes...";
    await registerRoute(projectDir, name);

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

function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ""))
    .replace(/^(.)/, (_, c: string) => c.toUpperCase());
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
