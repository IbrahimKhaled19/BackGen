import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import * as fs from "fs/promises";
import * as path from "path";
import { TemplateEngine } from "../core/template-engine.js";
import { createPlaceholders } from "../core/placeholders.js";
import { createFieldDefinitions } from "../core/field-mapper.js";
import { addModelToSchema } from "../core/prisma-updater.js";
import { registerRoute } from "../core/route-registrar.js";

const TEMPLATES_DIR = path.resolve(import.meta.dirname, "../../templates/express");

const RESOURCE_TEMPLATES = [
  { template: "src/modules/resource/resource.types.ts.hbs", output: "src/modules/{name}/{name}.types.ts" },
  { template: "src/modules/resource/resource.validation.ts.hbs", output: "src/modules/{name}/{name}.validation.ts" },
  { template: "src/modules/resource/resource.repository.ts.hbs", output: "src/modules/{name}/{name}.repository.ts" },
  { template: "src/modules/resource/resource.service.ts.hbs", output: "src/modules/{name}/{name}.service.ts" },
  { template: "src/modules/resource/resource.controller.ts.hbs", output: "src/modules/{name}/{name}.controller.ts" },
  { template: "src/modules/resource/resource.routes.ts.hbs", output: "src/modules/{name}/{name}.routes.ts" },
  { template: "src/modules/resource/resource.test.ts.hbs", output: "src/modules/{name}/{name}.test.ts" },
];

export async function generateCommand(
  name: string,
  fields: string[]
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

  // Collect fields if not provided
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

  const placeholders = createPlaceholders(name);
  const engine = new TemplateEngine(TEMPLATES_DIR);

  const context = {
    ...placeholders,
    fields: fieldDefs,
    projectName: path.basename(projectDir),
  };

  const spinner = ora("Generating resource files...").start();

  try {
    // Create module directory
    await fs.mkdir(moduleDir, { recursive: true });

    // Generate all resource files
    for (const { template, output } of RESOURCE_TEMPLATES) {
      const outputPath = path.join(projectDir, output.replace("{name}", moduleName));
      await engine.renderToFile(template, context, outputPath);
    }

    // Add model to Prisma schema
    spinner.text = "Updating Prisma schema...";
    await addModelToSchema(projectDir, resourceName, fieldDefs);

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
    console.log("\nNext steps:");
    console.log(chalk.cyan("  npm run db:push    # Update database"));
    console.log(chalk.cyan("  npm run dev        # Start server\n"));
  } catch (error) {
    spinner.fail("Generation failed");
    throw error;
  }
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
