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
  .option("--skip-install", "Skip npm install and code generation")
  .option("--orm <orm>", "ORM to use (prisma, drizzle, mongoose)")
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
  .command("schema <file>")
  .description("Generate full project from backgen.yaml schema definition (V8 Schema-First)")
  .option("--out <dir>", "Output directory (default: project.name from YAML)")
  .action(async (file: string, options: { out?: string }) => {
    const { generateSchemaCommand } = await import("./commands/generate-schema.js");
    await generateSchemaCommand(file, options);
  });

generate
  .command("migration [name]")
  .description("Generate a database migration (ORM-aware)")
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

generate
  .command("route [name]")
  .description("Generate a custom route module (controller + service + validation)")
  .action(async (name: string | undefined) => {
    const { generateRouteCommand } = await import("./commands/generate-route.js");
    await generateRouteCommand(name, {});
  });

// Import command — convert existing API specs to backgen.yaml
const importCmd = program
  .command("import")
  .description("Import existing API specs into backgen.yaml schema");

importCmd
  .command("openapi <file>")
  .description("Convert OpenAPI/Swagger spec to backgen.yaml")
  .option("-o, --output <file>", "Output file path (default: backgen.yaml)")
  .action(async (file: string, options: { output?: string }) => {
    const { importOpenApiCommand } = await import("./commands/import-openapi.js");
    await importOpenApiCommand(file, options);
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
  .option("-y, --yes", "Auto-confirm V4.6.0 → V4.6.1 migration prompts")
  .action(async (options: { yes?: boolean }) => {
    const { syncCommand } = await import("./commands/sync.js");
    await syncCommand({ yes: options.yes ?? false });
  });

program
  .command("health")
  .description("Show system health information")
  .action(async () => {
    const { healthCommand } = await import("./health.js");
    healthCommand();
  });

program
  .command("doctor")
  .description("Check project health")
  .option("-f, --fix", "Auto-fix ownership integrity issues")
  .action(async (options: { fix?: boolean }) => {
    const { doctorCommand } = await import("./commands/doctor.js");
    await doctorCommand({ fix: options.fix ?? false });
  });

program
  .command("upgrade")
  .description("Upgrade project to latest template version")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (options: { yes?: boolean }) => {
    const { upgradeCommand } = await import("./commands/upgrade.js");
    await upgradeCommand({ yes: options.yes ?? false });
  });

program
  .command("rollback")
  .description("Roll back to the most recent backup")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (options: { yes?: boolean }) => {
    const { rollbackCommand } = await import("./commands/rollback.js");
    await rollbackCommand({ yes: options.yes ?? false });
  });

program
  .command("rotate-secrets")
  .description("Rotate JWT secrets and invalidate all tokens")
  .action(async () => {
    const { rotateCommand } = await import("./commands/rotate.js");
    await rotateCommand();
  });
