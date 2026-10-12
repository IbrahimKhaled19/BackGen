import chalk from "chalk";
import ora from "ora";
import * as fs from "fs/promises";
import * as path from "path";
import { readManifest } from "../core/manifest.js";
import {
  parseFieldsFromTypes,
  renderFieldDefaults,
  resourceNameFor,
  moduleNameFor,
  typesFileFor,
} from "../core/module-helpers.js";

export async function seedCommand(resource: string, count: number): Promise<void> {
  console.log(chalk.blue.bold(`\n🌱 BackGen - Generate Seed: ${resource} (${count} records)\n`));

  const projectDir = process.cwd();
  const resourceName = resourceNameFor(resource);
  const moduleName = moduleNameFor(resource);

  // Read the resource types to get fields
  const typesPath = typesFileFor(projectDir, resource);
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

  // Generate seed file
  const spinner = ora("Generating seed file...").start();

  try {
    // Determine seed dir per ORM
    const seedDirs: Record<string, string> = {
      prisma: path.join(projectDir, "prisma", "seeds"),
      drizzle: path.join(projectDir, "src", "db", "seeds"),
      mongoose: path.join(projectDir, "src", "seeds"),
    };
    const seedsDir = seedDirs[orm] ?? seedDirs.prisma;
    await fs.mkdir(seedsDir, { recursive: true });

    const seedContent = generateSeedContent(resourceName, moduleName, fields, count, orm);
    const seedPath = path.join(seedsDir, `${moduleName}.ts`);
    await fs.writeFile(seedPath, seedContent, "utf-8");

    spinner.succeed("Seed file generated!");

    console.log(chalk.green(`\n✨ Seed file created!\n`));
    console.log(`  ${path.relative(projectDir, seedPath)}`);
    console.log("\nRun with:");
    console.log(chalk.cyan(`  npx tsx ${path.relative(projectDir, seedPath)}\n`));
  } catch (error) {
    spinner.fail("Seed generation failed");
    throw error;
  }
}

function generateSeedContent(
  resourceName: string,
  moduleName: string,
  fields: ReturnType<typeof parseFieldsFromTypes>,
  count: number,
  orm: string = "prisma"
): string {
  const fieldDefaults = renderFieldDefaults(fields, "seed");

  if (orm === "drizzle") {
    return `import { db } from "../config/database.js";
import { ${moduleName} } from "../db/schema/${moduleName}.js";

async function main() {
  console.log("Seeding ${moduleName}...");

  for (let i = 1; i <= ${count}; i++) {
    await db.insert(${moduleName}).values({
${fieldDefaults}
    });
  }

  console.log("Seeded ${count} ${resourceName} records.");
}

main().catch(console.error);
`;
  }

  if (orm === "mongoose") {
    return `import { ${resourceName} } from "../models/${moduleName}.model.js";

async function main() {
  console.log("Seeding ${moduleName}...");

  for (let i = 1; i <= ${count}; i++) {
    await ${resourceName}.create({
${fieldDefaults}
    });
  }

  console.log("Seeded ${count} ${resourceName} records.");
}

main().catch(console.error);
`;
  }

  // Prisma (default)
  return `import { prisma } from "../config/database.js";

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