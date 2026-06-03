import { Command } from "commander";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const packageJson = JSON.parse(readFileSync(resolve(__dirname, "../package.json"), "utf-8"));

export const program = new Command();

program
  .name("backgen")
  .description("Generate production-ready backend projects in minutes")
  .version(packageJson.version);

program
  .command("init [project-name]")
  .description("Generate a new backend project")
  .option("--resume", "Resume a previously failed generation")
  .option("--defaults", "Use default options (non-interactive)")
  .option("--skip-install", "Skip npm install and prisma generate")
  .option("--preset <preset>", "Domain preset (healthcare, saas, ecommerce, crm, lms)")
  .action(async (projectName: string | undefined, options: { resume?: boolean; defaults?: boolean; skipInstall?: boolean; preset?: string }) => {
    const { initCommand } = await import("./commands/init.js");
    await initCommand(projectName, options);
  });

// Generate command with subcommands
const generate = program
  .command("generate")
  .alias("g")
  .description("Generate resources, migrations, seeds, and factories");

generate
  .command("resource <name> [fields...]")
  .description("Generate a CRUD resource module")
  .option("--fields <fields>", 'Fields as "name:string,price:number"')
  .option("--relations <relations>", 'Relations as "doctor:Doctor,patient:Patient"')
  .option("--soft-delete", "Add deletedAt field and tombstone semantics")
  .action(async (name: string, fields: string[], options: { fields?: string; relations?: string; softDelete?: boolean }) => {
    const { generateCommand } = await import("./commands/generate.js");
    await generateCommand(name, fields, options);
  });

generate
  .command("migration [name]")
  .description("Generate a Prisma migration")
  .action(async (name: string | undefined) => {
    const { migrateCommand } = await import("./commands/migrate.js");
    await migrateCommand(name);
  });

generate
  .command("seed <resource>")
  .description("Generate seed data for a resource")
  .option("--count <n>", "Number of seed records", "10")
  .action(async (resource: string, options: { count: string }) => {
    const { seedCommand } = await import("./commands/seed.js");
    await seedCommand(resource, parseInt(options.count));
  });

generate
  .command("factory <resource>")
  .description("Generate a test factory for a resource")
  .action(async (resource: string) => {
    const { factoryCommand } = await import("./commands/factory.js");
    await factoryCommand(resource);
  });

program
  .command("add [plugin]")
  .description("Add a plugin to existing project")
  .action(async (plugin: string | undefined) => {
    const { addCommand } = await import("./commands/add.js");
    await addCommand(plugin);
  });

program
  .command("remove [plugin]")
  .description("Remove a plugin from project")
  .action(async (plugin: string | undefined) => {
    const { removeCommand } = await import("./commands/remove.js");
    await removeCommand(plugin);
  });

program
  .command("sync")
  .description("Sync project with manifest (.backgenrc.json)")
  .action(async () => {
    const { syncCommand } = await import("./commands/sync.js");
    await syncCommand();
  });

program
  .command("doctor")
  .description("Check project health")
  .action(async () => {
    const { doctorCommand } = await import("./commands/doctor.js");
    await doctorCommand();
  });
