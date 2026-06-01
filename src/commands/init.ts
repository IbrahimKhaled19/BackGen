import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { TemplateEngine } from "../core/template-engine.js";
import {
  createCheckpoint,
  loadCheckpoint,
  markStep,
  clearCheckpoint,
  getNextPendingStep,
  validateCheckpoint,
} from "../core/checkpoint.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface InitOptions {
  resume?: boolean;
  defaults?: boolean;
  skipInstall?: boolean;
  preset?: string;
}

interface ProjectConfig {
  projectName: string;
  enableRbac: boolean;
  enableDocker: boolean;
}

const STEPS = [
  "scaffold",
  "templates",
  "dependencies",
  "prisma-generate",
  "manifest",
];

const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/express");

export async function initCommand(
  projectName: string | undefined,
  options: InitOptions
): Promise<void> {
  console.log(chalk.blue.bold("\n🚀 BackGen - Project Generator\n"));

  // Resume mode
  if (options.resume) {
    await resumeGeneration();
    return;
  }

  // Collect project name if not provided
  if (!projectName) {
    const answer = await inquirer.prompt([
      {
        type: "input",
        name: "projectName",
        message: "Project name:",
        validate: (input: string) => {
          if (/^[a-z][a-z0-9-]*$/.test(input)) return true;
          return "Project name must start with a letter and contain only lowercase letters, numbers, and hyphens.";
        },
      },
    ]);
    projectName = answer.projectName as string;
  }

  const targetDir = path.resolve(process.cwd(), projectName!);

  // Check if directory exists and is not empty
  try {
    const entries = await fs.readdir(targetDir);
    if (entries.length > 0) {
      console.error(chalk.red(`Error: Directory "${projectName}" is not empty.`));
      process.exit(1);
    }
  } catch {
    // Directory doesn't exist, that's fine
  }

  // Collect configuration
  const config = await collectConfig(projectName!, options.defaults);

  // Create project directory
  await fs.mkdir(targetDir, { recursive: true });

  // Create checkpoint
  const checkpoint = await createCheckpoint(targetDir, projectName!, STEPS);

  // Execute generation steps
  try {
    await executeStep(targetDir, config, checkpoint, "scaffold", generateScaffold);
    await executeStep(targetDir, config, checkpoint, "templates", generateTemplates);
    if (!options.skipInstall) {
      await executeStep(targetDir, config, checkpoint, "dependencies", installDependencies);
      await executeStep(targetDir, config, checkpoint, "prisma-generate", runPrismaGenerate);
    }
    await executeStep(targetDir, config, checkpoint, "manifest", generateManifest);

    // Apply preset if specified
    if (options.preset) {
      await applyPreset(targetDir, options.preset);
    }

    // Clear checkpoint on success
    await clearCheckpoint(targetDir);

    printSuccess(projectName!, targetDir);
  } catch (error) {
    console.error(chalk.red("\nGeneration failed. Run with --resume to continue."));
    throw error;
  }
}

async function collectConfig(projectName: string, useDefaults?: boolean): Promise<ProjectConfig> {
  if (useDefaults) {
    return {
      projectName,
      enableRbac: false,
      enableDocker: true,
    };
  }

  const answers = await inquirer.prompt([
    {
      type: "confirm",
      name: "enableRbac",
      message: "Enable Role-Based Access Control (RBAC)?",
      default: true,
    },
    {
      type: "confirm",
      name: "enableDocker",
      message: "Generate Docker configuration?",
      default: true,
    },
  ]);

  return {
    projectName,
    enableRbac: answers.enableRbac,
    enableDocker: answers.enableDocker,
  };
}

async function executeStep(
  targetDir: string,
  config: ProjectConfig,
  checkpoint: Awaited<ReturnType<typeof createCheckpoint>>,
  stepName: string,
  fn: (dir: string, config: ProjectConfig) => Promise<void>
): Promise<void> {
  await markStep(targetDir, checkpoint, stepName, "in_progress");

  // Dependencies step streams output directly (no spinner)
  if (stepName === "dependencies") {
    try {
      await fn(targetDir, config);
      await markStep(targetDir, checkpoint, stepName, "complete");
      console.log(chalk.green("✔ dependencies installed"));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await markStep(targetDir, checkpoint, stepName, "failed", message);
      console.log(chalk.red(`✘ dependencies failed: ${message}`));
      throw error;
    }
    return;
  }

  const spinner = ora(`Running: ${stepName}`).start();

  try {
    await fn(targetDir, config);
    await markStep(targetDir, checkpoint, stepName, "complete");
    spinner.succeed(`${stepName} complete`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markStep(targetDir, checkpoint, stepName, "failed", message);
    spinner.fail(`${stepName} failed: ${message}`);
    throw error;
  }
}

async function generateScaffold(dir: string, _config: ProjectConfig): Promise<void> {
  const dirs = [
    "src/config",
    "src/middleware",
    "src/services",
    "src/utils",
    "prisma",
    "tests",
  ];

  for (const d of dirs) {
    await fs.mkdir(path.join(dir, d), { recursive: true });
  }
}

async function generateTemplates(dir: string, config: ProjectConfig): Promise<void> {
  const engine = new TemplateEngine(TEMPLATES_DIR);
  const context = { ...config };

  // Core files
  const templates = [
    // App & Server
    { template: "src/app.ts.hbs", output: "src/app.ts" },
    { template: "src/server.ts.hbs", output: "src/server.ts" },
    // Config
    { template: "src/config/env.ts.hbs", output: "src/config/env.ts" },
    { template: "src/config/database.ts.hbs", output: "src/config/database.ts" },
    { template: "src/config/swagger.ts.hbs", output: "src/config/swagger.ts" },
    // Utils
    { template: "src/utils/api-error.ts.hbs", output: "src/utils/api-error.ts" },
    { template: "src/utils/async-handler.ts.hbs", output: "src/utils/async-handler.ts" },
    { template: "src/utils/response.ts.hbs", output: "src/utils/response.ts" },
    // Middleware (shared)
    { template: "src/middleware/validate.ts.hbs", output: "src/middleware/validate.ts" },
    { template: "src/middleware/error.ts.hbs", output: "src/middleware/error.ts" },
    { template: "src/middleware/logger.ts.hbs", output: "src/middleware/logger.ts" },
    // Services
    { template: "src/services/logger.service.ts.hbs", output: "src/services/logger.service.ts" },
    // Prisma & Config
    { template: "prisma/schema.prisma.hbs", output: "prisma/schema.prisma" },
    { template: "package.json.hbs", output: "package.json" },
    { template: "tsconfig.json.hbs", output: "tsconfig.json" },
    { template: ".env.example.hbs", output: ".env.example" },
    { template: ".gitignore.hbs", output: ".gitignore" },
    { template: "README.md.hbs", output: "README.md" },
    { template: "vitest.config.ts.hbs", output: "vitest.config.ts" },
    { template: "eslint.config.js.hbs", output: "eslint.config.js" },
  ];

  for (const { template, output } of templates) {
    await engine.renderToFile(template, context, path.join(dir, output));
  }

  if (config.enableDocker) {
    await engine.renderToFile("Dockerfile.hbs", context, path.join(dir, "Dockerfile"));
    await engine.renderToFile("docker-compose.yml.hbs", context, path.join(dir, "docker-compose.yml"));
  }
}

async function installDependencies(dir: string, _config: ProjectConfig): Promise<void> {
  const { spawn } = await import("child_process");
  console.log(chalk.gray("  Running npm install...\n"));
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["install"], { cwd: dir, stdio: "inherit", shell: true });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm install exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function runPrismaGenerate(dir: string, _config: ProjectConfig): Promise<void> {
  const { spawn } = await import("child_process");
  console.log(chalk.gray("  Running prisma generate...\n"));
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["prisma", "generate"], { cwd: dir, stdio: "inherit", shell: true });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`prisma generate exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function generateManifest(dir: string, config: ProjectConfig): Promise<void> {
  const { writeManifest, createManifest } = await import("../core/manifest.js");
  const manifest = createManifest(config.projectName);
  await writeManifest(dir, manifest);
}

async function applyPreset(projectDir: string, presetName: string): Promise<void> {
  const { getPreset } = await import("../presets/registry.js");
  const preset = getPreset(presetName);

  if (!preset) {
    console.error(chalk.red(`Unknown preset: "${presetName}".`));
    console.log("\nAvailable presets:");
    const { listPresets } = await import("../presets/registry.js");
    for (const p of listPresets()) {
      console.log(chalk.cyan(`  ${p.name}`) + ` — ${p.description}`);
    }
    process.exit(1);
  }

  const { PluginInstaller } = await import("../core/plugin-installer.js");
  const { getPlugin } = await import("../core/plugin-registry.js");
  const { generateCommand } = await import("./generate.js");
  const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/express");
  const installer = new PluginInstaller(TEMPLATES_DIR);

  // Install preset plugins
  for (const pluginName of preset.plugins ?? []) {
    const plugin = getPlugin(pluginName);
    if (plugin) {
      try {
        await installer.install(projectDir, plugin);
        console.log(chalk.green(`  ✔ ${pluginName} plugin installed`));
      } catch {
        console.log(chalk.yellow(`  ⚠ ${pluginName} plugin already installed or failed`));
      }
    }
  }

  // Generate preset resources
  for (const resource of preset.resources) {
    try {
      process.chdir(projectDir);
      await generateCommand(resource.name, resource.fields, {
        relations: resource.relations?.join(","),
      });
    } catch {
      console.log(chalk.yellow(`  ⚠ ${resource.name} already exists or failed`));
    }
  }

  // Run prisma generate after all models are added
  await runPrismaGenerate(projectDir, {} as ProjectConfig);
}

async function resumeGeneration(): Promise<void> {
  const dir = process.cwd();
  const checkpoint = await loadCheckpoint(dir);

  if (!checkpoint) {
    console.error(chalk.red("No checkpoint found. Run `BackGen init` to start a new project."));
    process.exit(1);
  }

  if (!(await validateCheckpoint(checkpoint))) {
    console.error(chalk.red("Invalid checkpoint file. Start a new project with `BackGen init`."));
    process.exit(1);
  }

  const nextStep = getNextPendingStep(checkpoint);
  if (!nextStep) {
    console.log(chalk.green("All steps complete!"));
    await clearCheckpoint(dir);
    return;
  }

  console.log(chalk.blue(`Resuming from step: ${nextStep}`));

  const config: ProjectConfig = {
    projectName: checkpoint.projectName,
    enableRbac: true,
    enableDocker: true,
  };

  const stepFns: Record<string, (dir: string, config: ProjectConfig) => Promise<void>> = {
    scaffold: generateScaffold,
    templates: generateTemplates,
    dependencies: installDependencies,
  };

  for (const step of STEPS) {
    if (checkpoint.steps[step].status === "pending" || checkpoint.steps[step].status === "failed") {
      await executeStep(dir, config, checkpoint, step, stepFns[step]);
    }
  }

  await clearCheckpoint(dir);
  printSuccess(checkpoint.projectName, dir);
}

function printSuccess(projectName: string, _dir: string): void {
  console.log(chalk.green.bold("\n✨ Project generated successfully!\n"));
  console.log("Next steps:\n");
  console.log(chalk.cyan(`  cd ${projectName}`));
  console.log(chalk.cyan("  cp .env.example .env"));
  console.log(chalk.cyan("  # Edit .env with your database URL and JWT secrets"));
  console.log(chalk.cyan("  npm run db:push"));
  console.log(chalk.cyan("  npm run dev\n"));
  console.log("Swagger docs: http://localhost:3000/docs");
  console.log("Prisma Studio: npm run db:studio\n");
}
