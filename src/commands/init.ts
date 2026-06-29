import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import * as fs from "fs/promises";
import { readFileSync } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { TemplateEngine } from "../core/template-engine.js";
import { PluginInstaller } from "../core/plugin-installer.js";
import { selectPluginsInteractive } from "../core/plugin-selector.js";
import type { FileEntry } from "../core/manifest.js";
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
  orm?: string;
}

interface ProjectConfig {
  projectName: string;
  enableRbac: boolean;
  enableDocker: boolean;
  preset?: string;
  orm: string;
}

const STEPS = [
  "scaffold",
  "templates",
  "dependencies",
  "codegen",
  "manifest",
];

const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/express");
const BACKGEN_VERSION = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../package.json"), "utf-8")
).version as string;

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
      throw new Error(`Error: Directory "${projectName}" is not empty.`);
    }
  } catch {
    // Directory doesn't exist, that's fine
  }

  // Collect configuration
  const config = await collectConfig(projectName!, options.defaults, options.preset, options.orm);

  // Collect plugin selections (skip in --defaults mode)
  const selectedPlugins = options.defaults ? [] : await selectPluginsInteractive(config.orm, []);

  // Create project directory
  await fs.mkdir(targetDir, { recursive: true });

  // Create checkpoint
  const checkpoint = await createCheckpoint(targetDir, projectName!, STEPS, config.orm);

  // File ownership register — populated by generateTemplates, consumed by generateManifest
  const filesRecord: Record<string, FileEntry> = {};

  // Execute generation steps
  try {
    await executeStep(targetDir, config, checkpoint, "scaffold", generateScaffold);
    await executeStep(targetDir, config, checkpoint, "templates", (dir, cfg) =>
      generateTemplates(dir, cfg, filesRecord)
    );
    if (!options.skipInstall) {
      await executeStep(targetDir, config, checkpoint, "dependencies", installDependencies);
      await executeStep(targetDir, config, checkpoint, "codegen", runCodegen);
    }
    await executeStep(targetDir, config, checkpoint, "manifest", (dir, cfg) =>
      generateManifest(dir, cfg, filesRecord)
    );

    // Apply preset if specified
    if (config.preset) {
      await applyPreset(targetDir, config.preset);
    }

    // Install user-selected plugins post-scaffold
    if (selectedPlugins.length > 0) {
      console.log(chalk.cyan(`\nInstalling ${selectedPlugins.length} plugin(s)...`));
      const installer = new PluginInstaller(TEMPLATES_DIR, config.orm);
      const { succeeded, failed } = await installer.installBulk(targetDir, selectedPlugins);
      if (succeeded.length > 0) {
        console.log(chalk.green(`  \u2714 ${succeeded.length} plugin(s) installed.`));
      }
      if (failed.length > 0) {
        console.log(chalk.yellow(`  \u26A0 ${failed.length} plugin(s) failed: ${failed.join(", ")}`));
      }
    }

    // Clear checkpoint on success
    await clearCheckpoint(targetDir);

    printSuccess(projectName!, config.orm);
  } catch (error) {
    console.error(chalk.red("\nGeneration failed. Run with --resume to continue."));
    throw error;
  }
}

async function collectConfig(
  projectName: string,
  useDefaults?: boolean,
  preset?: string,
  orm?: string
): Promise<ProjectConfig> {
  if (useDefaults) {
    return {
      projectName,
      enableRbac: false,
      enableDocker: true,
      preset,
      orm: orm ?? "prisma",
    };
  }

  const ormAnswer = orm
    ? { orm }
    : await inquirer.prompt([
        {
          type: "list",
          name: "orm",
          message: "Select ORM:",
          choices: [
            { name: "Prisma (PostgreSQL)", value: "prisma" },
            { name: "Drizzle (PostgreSQL)", value: "drizzle" },
            { name: "Mongoose (MongoDB)", value: "mongoose" },
          ],
          default: "prisma",
        },
      ]);

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
    preset,
    orm: ormAnswer.orm,
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

async function generateScaffold(dir: string, config: ProjectConfig): Promise<void> {
  const dirs = [
    "src/config",
    "src/middleware",
    "src/services",
    "src/utils",
    "tests",
  ];

  // ORM-specific directories
  if (config.orm === "prisma") {
    dirs.push("prisma", "prisma/seeds");
  } else if (config.orm === "drizzle") {
    dirs.push("src/db/schema", "src/db/seeds");
  } else if (config.orm === "mongoose") {
    dirs.push("src/models", "src/seeds");
  }

  for (const d of dirs) {
    await fs.mkdir(path.join(dir, d), { recursive: true });
  }
}

const OWNERSHIP: Record<string, FileEntry["owner"]> = {
  // App & Server
  "src/app.ts": "shared",
  "src/server.ts": "framework",
  // Config
  "src/config/env.ts": "framework-editable",
  "src/config/database.ts": "framework-editable",
  "src/config/swagger.ts": "framework-editable",
  // Utils
  "src/utils/api-error.ts": "framework",
  "src/utils/async-handler.ts": "framework",
  "src/utils/response.ts": "framework",
  // Middleware (core)
  "src/middleware/core/errors.ts": "framework",
  "src/middleware/core/logger.ts": "framework",
  "src/middleware/core/validate.ts": "framework",
  // Middleware (security)
  "src/middleware/security/cors-strict.ts": "framework",
  "src/middleware/security/sanitize.ts": "framework",
  // Middleware (observability)
  "src/middleware/observability/request-id.ts": "framework",
  "src/middleware/observability/request-timeout.ts": "framework",
  "src/middleware/observability/health.ts": "framework",
  // Middleware (root)
  "src/middleware/graceful-shutdown.ts": "framework",
  // Services
  "src/services/logger.service.ts": "framework",
  // Config files
  "package.json": "shared",
  "tsconfig.json": "framework-editable",
  ".env.example": "shared",
  ".gitignore": "shared",
  "README.md": "shared",
  "vitest.config.ts": "framework-editable",
  "eslint.config.js": "framework-editable",
  // ORM
  "prisma/schema.prisma": "user",
  "prisma.config.ts": "framework-editable",
  "drizzle.config.ts": "framework-editable",
  "src/db/schema/index.ts": "user",
  "src/models/index.ts": "user",
};

async function generateTemplates(
  dir: string,
  config: ProjectConfig,
  filesRecord: Record<string, FileEntry>
): Promise<void> {
  const ormTemplatesDir = path.resolve(
    TEMPLATES_DIR,
    "..",
    `express.${config.orm}`
  );
  const engine = new TemplateEngine(TEMPLATES_DIR, ormTemplatesDir);
  const context = { ...config };

  // Core files (shared across all ORMs)
  const templates: Array<{ template: string; output: string }> = [
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
    // Middleware (core — V4.6.1)
    { template: "src/middleware/core/errors.ts.hbs", output: "src/middleware/core/errors.ts" },
    { template: "src/middleware/core/logger.ts.hbs", output: "src/middleware/core/logger.ts" },
    { template: "src/middleware/core/validate.ts.hbs", output: "src/middleware/core/validate.ts" },
    // Middleware (security — V4.6.1)
    { template: "src/middleware/security/cors-strict.ts.hbs", output: "src/middleware/security/cors-strict.ts" },
    { template: "src/middleware/security/sanitize.ts.hbs", output: "src/middleware/security/sanitize.ts" },
    // Middleware (observability — V4.6.1)
    { template: "src/middleware/observability/request-id.ts.hbs", output: "src/middleware/observability/request-id.ts" },
    { template: "src/middleware/observability/request-timeout.ts.hbs", output: "src/middleware/observability/request-timeout.ts" },
    { template: "src/middleware/observability/health.ts.hbs", output: "src/middleware/observability/health.ts" },
    // Middleware (root — V4.6.1)
    { template: "src/middleware/graceful-shutdown.ts.hbs", output: "src/middleware/graceful-shutdown.ts" },
    // Services
    { template: "src/services/logger.service.ts.hbs", output: "src/services/logger.service.ts" },
    // Config files (shared)
    { template: "package.json.hbs", output: "package.json" },
    { template: "tsconfig.json.hbs", output: "tsconfig.json" },
    { template: ".env.example.hbs", output: ".env.example" },
    { template: ".gitignore.hbs", output: ".gitignore" },
    { template: "README.md.hbs", output: "README.md" },
    { template: "vitest.config.ts.hbs", output: "vitest.config.ts" },
    { template: "eslint.config.js.hbs", output: "eslint.config.js" },
  ];

  // ORM-specific templates
  if (config.orm === "prisma") {
    templates.push(
      { template: "prisma/schema.prisma.hbs", output: "prisma/schema.prisma" },
      { template: "prisma.config.ts.hbs", output: "prisma.config.ts" }
    );
  } else if (config.orm === "drizzle") {
    templates.push(
      { template: "drizzle.config.ts.hbs", output: "drizzle.config.ts" },
      { template: "src/db/schema/index.ts.hbs", output: "src/db/schema/index.ts" }
    );
  } else if (config.orm === "mongoose") {
    templates.push(
      { template: "src/models/index.ts.hbs", output: "src/models/index.ts" }
    );
  }

  for (const { template, output } of templates) {
    await engine.renderToFile(template, context, path.join(dir, output));
    if (OWNERSHIP[output]) {
      filesRecord[output] = {
        owner: OWNERSHIP[output],
        version: OWNERSHIP[output] !== "user" ? BACKGEN_VERSION : undefined,
      };
    }
  }

  if (config.enableDocker) {
    await engine.renderToFile("Dockerfile.hbs", context, path.join(dir, "Dockerfile"));
    filesRecord["Dockerfile"] = { owner: "shared", version: BACKGEN_VERSION };
    await engine.renderToFile("docker-compose.yml.hbs", context, path.join(dir, "docker-compose.yml"));
    filesRecord["docker-compose.yml"] = { owner: "shared", version: BACKGEN_VERSION };
    await engine.renderToFile("Caddyfile.hbs", context, path.join(dir, "Caddyfile"));
    filesRecord["Caddyfile"] = { owner: "shared", version: BACKGEN_VERSION };
    await engine.renderToFile("docker-compose.prod.yml.hbs", context, path.join(dir, "docker-compose.prod.yml"));
    filesRecord["docker-compose.prod.yml"] = { owner: "shared", version: BACKGEN_VERSION };
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

async function runCodegen(dir: string, config: ProjectConfig): Promise<void> {
  const { spawn } = await import("child_process");

  if (config.orm === "prisma") {
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

  if (config.orm === "drizzle") {
    // Only run drizzle-kit generate if schema files exist (skip during bare init)
    const schemaDir = path.join(dir, "src", "db", "schema");
    let hasModels = false;
    try {
      const files = await fs.readdir(schemaDir);
      hasModels = files.filter((f) => f.endsWith(".ts") && f !== "index.ts").length > 0;
    } catch {
      // schema dir not found, no models
    }

    if (!hasModels) {
      console.log(chalk.gray("  No Drizzle schema files found yet. Run drizzle-kit generate after adding resources.\n"));
      return;
    }

    console.log(chalk.gray("  Running drizzle-kit generate...\n"));
    return new Promise((resolve, reject) => {
      const child = spawn("npx", ["drizzle-kit", "generate"], { cwd: dir, stdio: "inherit", shell: true });
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`drizzle-kit generate exited with code ${code}`));
      });
      child.on("error", reject);
    });
  }

  // Mongoose: no codegen step needed
  console.log(chalk.gray("  Mongoose does not require a code generation step.\n"));
}

async function generateManifest(
  dir: string,
  config: ProjectConfig,
  filesRecord: Record<string, FileEntry>
): Promise<void> {
  const { writeManifest, createManifest, readManifest } = await import("../core/manifest.js");
  const existing = await readManifest(dir);
  const mergedFiles = { ...existing?.files, ...filesRecord };
  const manifest = createManifest(config.projectName, config.orm, config.preset, BACKGEN_VERSION, mergedFiles);
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
    return;
  }

  const { PluginInstaller } = await import("../core/plugin-installer.js");
  const { getPlugin } = await import("../core/plugin-registry.js");
  const { generateCommand } = await import("./generate.js");
  const { readManifest } = await import("../core/manifest.js");
  const manifest = await readManifest(projectDir);
  const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/express");
  const installer = new PluginInstaller(TEMPLATES_DIR, manifest?.project?.orm ?? "prisma");

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

  // Auth check for presets that reference User model (V4.5 saas-core)
  // Re-read manifest after plugin installs — jwt/clerk may have been added
  const updatedManifest = await readManifest(projectDir);
  const hasAuth = updatedManifest?.plugins.jwt || updatedManifest?.plugins.clerk;

  // Generate preset resources
  for (const resource of preset.resources) {
    const resourceNeedsAuth = resource.relations?.some((rel) =>
      rel.endsWith(":User")
    );

    if (resourceNeedsAuth && !hasAuth) {
      console.log(
        chalk.yellow(
          `  ⚠ Skipping ${resource.name} (references User; run \`backgen add jwt\` then \`backgen sync\`)`
        )
      );
      continue;
    }

    try {
      process.chdir(projectDir);
      await generateCommand(resource.name, resource.fields, {
        relations: resource.relations?.join(","),
        softDelete: resource.softDelete,
      });
    } catch {
      console.log(chalk.yellow(`  ⚠ ${resource.name} already exists or failed`));
    }
  }

  // V4.5 SaaS Core: inject tenant middleware into app.ts
  if (presetName === "saas-core") {
    await injectTenantMiddleware(projectDir);
    console.log(chalk.green("  ✔ Tenant + RBAC middleware registered"));
  }

  // Run prisma generate after all models are added (non-fatal)
  try {
    await runCodegen(projectDir, { orm: manifest?.project?.orm ?? "prisma" } as ProjectConfig);
  } catch (err) {
    console.log(chalk.yellow(`  ⚠ prisma generate failed (non-fatal): ${(err as Error).message}`));
  }
}

async function injectTenantMiddleware(projectDir: string): Promise<void> {
  const { PluginInstaller } = await import("../core/plugin-installer.js");
  const { TemplateEngine } = await import("../core/template-engine.js");
  const { readManifest, updateFileOwnership } = await import("../core/manifest.js");
  const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/express");
  const manifest = await readManifest(projectDir);
  const orm = manifest?.project?.orm ?? "prisma";
  const ormTemplatesDir = path.resolve(TEMPLATES_DIR, "..", `express.${orm}`);
  const installer = new PluginInstaller(TEMPLATES_DIR, orm);
  const engine = new TemplateEngine(TEMPLATES_DIR, ormTemplatesDir);

  // Render tenant + rbac middleware templates (saas-core specific)
  await engine.renderToFile(
    "src/middleware/tenant.ts.hbs",
    { orm },
    path.join(projectDir, "src/middleware/tenant.ts")
  );
  await updateFileOwnership(projectDir, "src/middleware/tenant.ts", "framework", BACKGEN_VERSION);
  await engine.renderToFile(
    "src/middleware/rbac.ts.hbs",
    { orm },
    path.join(projectDir, "src/middleware/rbac.ts")
  );
  await updateFileOwnership(projectDir, "src/middleware/rbac.ts", "framework", BACKGEN_VERSION);

  await installer.applyMutations(projectDir, [
    {
      file: "src/app.ts",
      operation: "replace",
      marker: "// {{REGISTER_AUTH_MIDDLEWARE}}",
      content: `import { tenantMiddleware } from "./middleware/tenant.js";
// {{REGISTER_AUTH_MIDDLEWARE}}`,
    },
    {
      file: "src/app.ts",
      operation: "replace",
      marker: "// {{REGISTER_MIDDLEWARE}}",
      content: `app.use(tenantMiddleware);
// {{REGISTER_MIDDLEWARE}}`,
    },
  ]);
}

async function resumeGeneration(): Promise<void> {
  const dir = process.cwd();
  const { readManifest } = await import("../core/manifest.js");
  const checkpoint = await loadCheckpoint(dir);

  if (!checkpoint) {
    throw new Error("No checkpoint found. Run `BackGen init` to start a new project.");
  }

  if (!(await validateCheckpoint(checkpoint))) {
    throw new Error("Invalid checkpoint file. Start a new project with `BackGen init`.");
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
    orm: checkpoint.orm || "prisma",
  };

  // Build filesRecord from existing manifest + init pipeline
  const existingManifest = await readManifest(dir);
  const filesRecord: Record<string, FileEntry> = {
    ...(existingManifest?.files ?? {}),
  };

  const stepFns: Record<string, (dir: string, config: ProjectConfig) => Promise<void>> = {
    scaffold: generateScaffold,
    templates: (d, c) => generateTemplates(d, c, filesRecord),
    dependencies: installDependencies,
  };

  for (const step of STEPS) {
    if (step === "manifest") continue; // handled after loop with filesRecord
    if (checkpoint.steps[step].status === "pending" || checkpoint.steps[step].status === "failed") {
      await executeStep(dir, config, checkpoint, step, stepFns[step]);
    }
  }

  // Always regenerate manifest last with full filesRecord
  await executeStep(dir, config, checkpoint, "manifest", (d, c) =>
    generateManifest(d, c, filesRecord)
  );

  await clearCheckpoint(dir);
  printSuccess(checkpoint.projectName, checkpoint.orm || "prisma");
}

function printSuccess(projectName: string, orm: string): void {
  console.log(chalk.green.bold("\n✨ Project generated successfully!\n"));
  console.log("Next steps:\n");
  console.log(chalk.cyan(`  cd ${projectName}`));
  console.log(chalk.cyan("  cp .env.example .env"));
  console.log(chalk.cyan("  # Edit .env with your database URL and secrets"));

  if (orm === "prisma") {
    console.log(chalk.cyan("  npm run db:push"));
    console.log(chalk.cyan("  npm run dev\n"));
    console.log("Swagger docs: http://localhost:3000/docs");
    console.log("Prisma Studio: npm run db:studio\n");
  } else if (orm === "drizzle") {
    console.log(chalk.cyan("  npm run db:push"));
    console.log(chalk.cyan("  npm run dev\n"));
    console.log("Swagger docs: http://localhost:3000/docs");
    console.log("Drizzle Studio: npm run db:studio\n");
  } else {
    console.log(chalk.cyan("  npm run dev\n"));
    console.log("Swagger docs: http://localhost:3000/docs");
  }
}
