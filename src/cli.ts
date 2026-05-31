import { Command } from "commander";
import { version } from "../package.json";

export const program = new Command();

program
  .name("backgen")
  .description("Generate production-ready backend projects in minutes")
  .version(version);

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
  .command("add <feature>")
  .description("Add a feature to existing project")
  .action(async (feature: string) => {
    const { addCommand } = await import("./commands/add.js");
    await addCommand(feature);
  });

program
  .command("doctor")
  .description("Check project health")
  .action(async () => {
    const { doctorCommand } = await import("./commands/doctor.js");
    await doctorCommand();
  });
