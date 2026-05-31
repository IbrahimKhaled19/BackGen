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
  .action(async (projectName: string | undefined, options: { resume?: boolean }) => {
    const { initCommand } = await import("./commands/init.js");
    await initCommand(projectName, options);
  });

program
  .command("generate <type> <name> [fields...]")
  .alias("g")
  .description("Generate a resource module (e.g., backgen generate resource Product)")
  .action(async (type: string, name: string, fields: string[]) => {
    if (type !== "resource") {
      console.error(`Unknown type: ${type}. Use "resource".`);
      process.exit(1);
    }
    const { generateCommand } = await import("./commands/generate.js");
    await generateCommand(name, fields);
  });

program
  .command("add [plugin]")
  .description("Add a plugin to existing project")
  .action(async (plugin: string | undefined) => {
    const { addCommand } = await import("./commands/add.js");
    await addCommand(plugin);
  });

program
  .command("remove <plugin>")
  .description("Remove a plugin from project")
  .action(async (plugin: string) => {
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
