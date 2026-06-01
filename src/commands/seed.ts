import chalk from "chalk";
import ora from "ora";
import * as fs from "fs/promises";
import * as path from "path";

export async function seedCommand(resource: string, count: number): Promise<void> {
  console.log(chalk.blue.bold(`\n🌱 BackGen - Generate Seed: ${resource} (${count} records)\n`));

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

  // Parse fields from types file
  const fields = parseFieldsFromTypes(typesContent);

  // Generate seed file
  const spinner = ora("Generating seed file...").start();

  try {
    const seedsDir = path.join(projectDir, "prisma", "seeds");
    await fs.mkdir(seedsDir, { recursive: true });

    const seedContent = generateSeedContent(resourceName, moduleName, fields, count);
    const seedPath = path.join(seedsDir, `${moduleName}.ts`);
    await fs.writeFile(seedPath, seedContent, "utf-8");

    spinner.succeed("Seed file generated!");

    console.log(chalk.green(`\n✨ Seed file created!\n`));
    console.log(`  prisma/seeds/${moduleName}.ts`);
    console.log("\nRun with:");
    console.log(chalk.cyan("  npx tsx prisma/seeds/" + moduleName + ".ts\n"));
  } catch (error) {
    spinner.fail("Seed generation failed");
    throw error;
  }
}

function parseFieldsFromTypes(content: string): Array<{ name: string; type: string }> {
  const fields: Array<{ name: string; type: string }> = [];
  const seen = new Set<string>();
  const lines = content.split("\n");

  // Only parse the main interface (skip Create/Update/Input)
  let inMainInterface = false;
  for (const line of lines) {
    if (line.match(/^export interface \w+ \{/)) {
      inMainInterface = true;
      continue;
    }
    if (inMainInterface && line.match(/^\}/)) {
      break; // End of main interface
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

function generateSeedContent(
  resourceName: string,
  moduleName: string,
  fields: Array<{ name: string; type: string }>,
  count: number
): string {
  const fieldDefaults = fields
    .map((f) => {
      switch (f.type) {
        case "string":
          return `      ${f.name}: \`${f.name}-\${i}\``;
        case "number":
          return `      ${f.name}: Math.floor(Math.random() * 100)`;
        case "boolean":
          return `      ${f.name}: i % 2 === 0`;
        case "Date":
          return `      ${f.name}: new Date()`;
        default:
          return `      ${f.name}: ""`;
      }
    })
    .join(",\n");

  return `import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding ${moduleName}...");

  for (let i = 1; i <= ${count}; i++) {
    await prisma.${moduleName}.create({
      data: {
${fieldDefaults}
      }
    });
  }

  console.log("Seeded ${count} ${resourceName} records.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
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
