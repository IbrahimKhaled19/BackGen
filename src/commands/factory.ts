import chalk from "chalk";
import ora from "ora";
import * as fs from "fs/promises";
import * as path from "path";
import { readManifest } from "../core/manifest.js";

export async function factoryCommand(resource: string): Promise<void> {
  console.log(chalk.blue.bold(`\n🏭 BackGen - Generate Factory: ${resource}\n`));

  const projectDir = process.cwd();
  const resourceName = toPascalCase(resource);
  const moduleName = toCamelCase(resource);

  // Read the resource types to get fields
  const typesPath = path.join(projectDir, "src", "modules", moduleName, `${moduleName}.types.ts`);
  let typesContent: string;
  try {
    typesContent = await fs.readFile(typesPath, "utf-8");
  } catch {
    console.error(chalk.red(`Error: Resource "${resourceName}" not found. Generate it first.`));
    process.exit(1);
  }

  // Read ORM from manifest
  let orm = "prisma";
  try {
    const manifest = await readManifest(projectDir);
    orm = manifest?.project?.orm ?? "prisma";
  } catch {
    // default to prisma
  }

  // Parse fields from types file
  const fields = parseFieldsFromTypes(typesContent);

  // Generate factory file
  const spinner = ora("Generating factory...").start();

  try {
    const factoriesDir = path.join(projectDir, "src", "factories");
    await fs.mkdir(factoriesDir, { recursive: true });

    const factoryContent = generateFactoryContent(resourceName, moduleName, fields, orm);
    const factoryPath = path.join(factoriesDir, `${moduleName}.factory.ts`);
    await fs.writeFile(factoryPath, factoryContent, "utf-8");

    spinner.succeed("Factory generated!");

    console.log(chalk.green(`\n✨ Factory created!\n`));
    console.log(`  src/factories/${moduleName}.factory.ts`);
    console.log("\nUsage:");
    console.log(chalk.cyan(`  import { create${resourceName} } from "../factories/${moduleName}.factory.js";`));
    console.log(chalk.cyan(`  const ${moduleName} = await create${resourceName}();\n`));
  } catch (error) {
    spinner.fail("Factory generation failed");
    throw error;
  }
}

function parseFieldsFromTypes(content: string): Array<{ name: string; type: string }> {
  const fields: Array<{ name: string; type: string }> = [];
  const seen = new Set<string>();
  const lines = content.split("\n");

  let inMainInterface = false;
  for (const line of lines) {
    if (line.match(/^export interface \w+ \{/)) {
      inMainInterface = true;
      continue;
    }
    if (inMainInterface && line.match(/^\}/)) {
      break;
    }
    if (inMainInterface) {
      const match = line.match(/^\s+(\w+)\s*:\s*(string|number|boolean|Date)/);
      if (match && match[1] !== "id" && match[1] !== "createdAt" && match[1] !== "updatedAt" && !seen.has(match[1])) {
        seen.add(match[1]);
        fields.push({ name: match[1], type: match[2] });
      }
    }
  }

  return fields;
}

function generateFactoryContent(
  resourceName: string,
  moduleName: string,
  fields: Array<{ name: string; type: string }>,
  orm: string = "prisma"
): string {
  const overrides = fields
    .map((f) => `  ${f.name}?: ${f.type === "Date" ? "Date" : f.type};`)
    .join("\n");

  const defaults = fields
    .map((f) => {
      switch (f.type) {
        case "string":
          return `    ${f.name}: overrides.${f.name} ?? "${f.name}-test"`;
        case "number":
          return `    ${f.name}: overrides.${f.name} ?? 1`;
        case "boolean":
          return `    ${f.name}: overrides.${f.name} ?? true`;
        case "Date":
          return `    ${f.name}: overrides.${f.name} ?? new Date()`;
        default:
          return `    ${f.name}: overrides.${f.name} ?? ""`;
      }
    })
    .join(",\n");

  if (orm === "drizzle") {
    return `import { db } from "../config/database.js";
import { ${moduleName} } from "../db/schema/${moduleName}.js";

interface ${resourceName}Overrides {
${overrides}
}

export async function create${resourceName}(overrides: ${resourceName}Overrides = {}) {
  const [row] = await db.insert(${moduleName}).values({
${defaults}
  }).returning();
  return row;
}

export async function create${resourceName}List(count: number, overrides: ${resourceName}Overrides = {}) {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push(await create${resourceName}(overrides));
  }
  return items;
}
`;
  }

  if (orm === "mongoose") {
    return `import { ${resourceName} } from "../models/${moduleName}.model.js";

interface ${resourceName}Overrides {
${overrides}
}

export async function create${resourceName}(overrides: ${resourceName}Overrides = {}) {
  return ${resourceName}.create({
${defaults}
  });
}

export async function create${resourceName}List(count: number, overrides: ${resourceName}Overrides = {}) {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push(await create${resourceName}(overrides));
  }
  return items;
}
`;
  }

  // Prisma (default)
  return `import { prisma } from "../config/database.js";

interface ${resourceName}Overrides {
${overrides}
}

export async function create${resourceName}(overrides: ${resourceName}Overrides = {}) {
  return prisma.${moduleName}.create({
    data: {
${defaults}
    }
  });
}

export async function create${resourceName}List(count: number, overrides: ${resourceName}Overrides = {}) {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push(await create${resourceName}(overrides));
  }
  return items;
}
`;
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
