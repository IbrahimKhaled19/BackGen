import inquirer from "inquirer";
import chalk from "chalk";
import * as fs from "fs/promises";
import * as path from "path";
import { readManifest, getInstalledPlugins } from "../core/manifest.js";
import {
  toPascalCase,
  toCamelCase,
  toKebabCase,
} from "../core/string-utils.js";

// ── Job templates (inline — no Handlebars dependency for generated jobs) ──

interface JobTemplateContext {
  jobName: string;
  jobNamePascal: string;
  jobNameCamel: string;
  queueName: string;
  retryCount: number;
  timeout: number;
}

function renderHandler(ctx: JobTemplateContext): string {
  return `import { BaseJobHandler, type JobContext, type JobResult } from "./base-handler.js";
import { registerJob } from "./index.js";

// ── Payload interface ───────────────────────────────────────────

export interface ${ctx.jobNamePascal}Payload {
  // TODO: Define your job payload fields here
  // Example:
  // userId: string;
  // email: string;
}

// ── Job Constants ───────────────────────────────────────────────

export const JOB_NAME = "${ctx.queueName}.${ctx.jobNameCamel}";
export const QUEUE_NAME = "${ctx.queueName}";

// ── Handler (extend this with your business logic) ──────────────

class ${ctx.jobNamePascal}Handler extends BaseJobHandler<${ctx.jobNamePascal}Payload> {
  async handle(payload: ${ctx.jobNamePascal}Payload, ctx: JobContext): Promise<JobResult> {
    // ═══════════════════════════════════════════════════════════
    // BACKGEN:START — Your business logic goes here
    // ═══════════════════════════════════════════════════════════
    //
    // Access payload fields: payload.userId, payload.email, etc.
    // Access job context: ctx.jobId, ctx.attemptsMade
    // Log: await this.log("processing", { payload });
    // Delay: await this.delay(1000);
    //
    // ═══════════════════════════════════════════════════════════
    // BACKGEN:END — Protected on regeneration
    // ═══════════════════════════════════════════════════════════

    return { success: true };
  }
}

// ── Register Job ────────────────────────────────────────────────

const handler = new ${ctx.jobNamePascal}Handler();

registerJob<${ctx.jobNamePascal}Payload>({
  name: JOB_NAME,
  queue: QUEUE_NAME,
  handler,
  concurrency: 5,
  retry: ${ctx.retryCount},
  backoff: "exponential",
  timeout: ${ctx.timeout},
});

// ── Type-safe Dispatch Helper ───────────────────────────────────

/**
 * Queue a ${ctx.jobNamePascal} job for processing.
 *
 * @example
 *   import { dispatch${ctx.jobNamePascal} } from "./modules/worker/${ctx.jobNameCamel}.js";
 *   await dispatch${ctx.jobNamePascal}({ userId: "123", email: "a@b.com" });
 */
export async function dispatch${ctx.jobNamePascal}(
  payload: ${ctx.jobNamePascal}Payload,
  opts?: { delay?: number | string; priority?: "low" | "normal" | "high" }
): Promise<string> {
  const { dispatch } = await import("./index.js");
  return dispatch<${ctx.jobNamePascal}Payload>(JOB_NAME, payload, opts);
}
`;
}

function renderTest(ctx: JobTemplateContext): string {
  return `import { describe, it, expect } from "vitest";
import { dispatch${ctx.jobNamePascal}, JOB_NAME } from "./${ctx.jobNameCamel}.js";
import type { ${ctx.jobNamePascal}Payload } from "./${ctx.jobNameCamel}.js";
import { listJobs } from "./index.js";

describe("${ctx.jobNamePascal} Job", () => {
  it("is registered with the worker", () => {
    expect(listJobs().map((j) => j.name)).toContain(JOB_NAME);
  });

  it("exposes a dispatch helper", () => {
    expect(typeof dispatch${ctx.jobNamePascal}).toBe("function");
  });
});
`;
}

// ── Command ─────────────────────────────────────────────────────

export interface GenerateJobOptions {
  queue?: string;
  retry?: string;
  timeout?: string;
}

export async function generateJobCommand(
  name: string | undefined,
  options: GenerateJobOptions
): Promise<void> {
  console.log(chalk.blue.bold("\n⚡ BackGen - Generate Job\n"));

  const projectDir = process.cwd();

  // Must be in a BackGen project with the worker plugin
  const manifest = await readManifest(projectDir);
  if (!manifest) {
    console.error(chalk.red("No BackGen manifest found."));
    process.exit(1);
  }

  const installed = await getInstalledPlugins(projectDir);
  if (!installed.worker) {
    console.error(chalk.red("The worker plugin is not installed. Run: backgen add worker"));
    process.exit(1);
  }

  // Interactive prompt if name not provided
  if (!name) {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "Job name (kebab-case):",
        validate: (v: string) => (v ? true : "Job name is required"),
      },
    ]);
    name = answers.name;
  }

  const jobName = name!;
  const jobNamePascal = toPascalCase(jobName);
  const jobNameCamel = toCamelCase(jobName);
  const queueName = options.queue ?? "default";
  const retryCount = options.retry ? parseInt(options.retry, 10) : 3;
  const timeout = options.timeout ? parseInt(options.timeout, 10) : 30000;

  // Jobs live next to the worker module they extend.
  const jobsDir = path.join(projectDir, "src", "modules", "worker");
  const handlerFile = path.join(jobsDir, `${jobNameCamel}.ts`);
  const testFile = path.join(jobsDir, `${jobNameCamel}.test.ts`);

  // Check for existing files
  try {
    await fs.access(handlerFile);
    const { overwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "overwrite",
        message: `Job "${jobName}" already exists. Overwrite?`,
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log(chalk.yellow("Aborted."));
      return;
    }
  } catch {
    // File doesn't exist — good
  }

  await fs.mkdir(jobsDir, { recursive: true });

  // Generate the job handler file
  const ctx: JobTemplateContext = {
    jobName: toKebabCase(jobName),
    jobNamePascal,
    jobNameCamel,
    queueName,
    retryCount,
    timeout,
  };

  await fs.writeFile(handlerFile, renderHandler(ctx), "utf-8");
  console.log(chalk.green(`  ✔ Created: ${path.relative(projectDir, handlerFile)}`));

  // Generate test file
  await fs.writeFile(testFile, renderTest(ctx), "utf-8");
  console.log(chalk.green(`  ✔ Created: ${path.relative(projectDir, testFile)}`));

  console.log(chalk.cyan("\n📋 Next steps:"));
  console.log(chalk.gray(`  1. Edit: src/modules/worker/${jobNameCamel}.ts — add your payload fields`));
  console.log(chalk.gray(`  2. Import it once so it registers: src/modules/worker/index.ts`));
  console.log(chalk.gray(`  3. Run:  dispatch${jobNamePascal}({ ... }) in your controllers`));
  console.log(chalk.gray(`  4. Test: npm run test -- src/modules/worker/${jobNameCamel}.test.ts\n`));
}