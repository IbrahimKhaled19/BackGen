import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import * as fs from "fs/promises";
import * as path from "path";
import { TemplateEngine } from "../core/template-engine.js";
import {
  createCheckpoint,
  loadCheckpoint,
  markStep,
  clearCheckpoint,
  getNextPendingStep,
  validateCheckpoint,
} from "../core/checkpoint.js";

export interface InitOptions {
  resume?: boolean;
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
];

const TEMPLATES_DIR = path.resolve(import.meta.dirname, "../../templates/express");

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
    projectName = answer.projectName;
  }

  const targetDir = path.resolve(process.cwd(), projectName);

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
  const config = await collectConfig(projectName);

  // Create project directory
  await fs.mkdir(targetDir, { recursive: true });

  // Create checkpoint
  const checkpoint = await createCheckpoint(targetDir, projectName, STEPS);

  // Execute generation steps
  try {
    await executeStep(targetDir, config, checkpoint, "scaffold", generateScaffold);
    await executeStep(targetDir, config, checkpoint, "templates", generateTemplates);
    await executeStep(targetDir, config, checkpoint, "dependencies", installDependencies);

    // Clear checkpoint on success
    await clearCheckpoint(targetDir);

    printSuccess(projectName, targetDir);
  } catch (error) {
    console.error(chalk.red("\nGeneration failed. Run with --resume to continue."));
    throw error;
  }
}

async function collectConfig(projectName: string): Promise<ProjectConfig> {
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

async function generateScaffold(dir: string, config: ProjectConfig): Promise<void> {
  const dirs = [
    "src/config",
    "src/middleware",
    "src/modules/auth",
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
    { template: "src/app.ts.hbs", output: "src/app.ts" },
    { template: "src/server.ts.hbs", output: "src/server.ts" },
    { template: "src/config/env.ts.hbs", output: "src/config/env.ts" },
    { template: "src/config/database.ts.hbs", output: "src/config/database.ts" },
    { template: "src/config/swagger.ts.hbs", output: "src/config/swagger.ts" },
    { template: "src/utils/api-error.ts.hbs", output: "src/utils/api-error.ts" },
    { template: "src/utils/async-handler.ts.hbs", output: "src/utils/async-handler.ts" },
    { template: "src/utils/response.ts.hbs", output: "src/utils/response.ts" },
    { template: "prisma/schema.prisma.hbs", output: "prisma/schema.prisma" },
    { template: "package.json.hbs", output: "package.json" },
    { template: "tsconfig.json.hbs", output: "tsconfig.json" },
    { template: ".env.example.hbs", output: ".env.example" },
    { template: ".gitignore.hbs", output: ".gitignore" },
    { template: "README.md.hbs", output: "README.md" },
    { template: "vitest.config.ts.hbs", output: "vitest.config.ts" },
    { template: ".eslintrc.json.hbs", output: ".eslintrc.json" },
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
  const { execSync } = await import("child_process");
  execSync("npm install", { cwd: dir, stdio: "pipe" });
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

function printSuccess(projectName: string, dir: string): void {
  console.log(chalk.green.bold("\n✨ Project generated successfully!\n"));
  console.log("Next steps:\n");
  console.log(chalk.cyan(`  cd ${projectName}`));
  console.log(chalk.cyan("  cp .env.example .env"));
  console.log(chalk.cyan("  # Edit .env with your database URL and JWT secrets"));
  console.log(chalk.cyan("  npm run db:push"));
  console.log(chalk.cyan("  npm run dev\n"));
  console.log("Swagger docs: http://localhost:3000/docs\n");
}
