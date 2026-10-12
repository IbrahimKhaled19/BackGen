import * as path from "path";
import * as fs from "fs/promises";
import { fileURLToPath } from "url";
import type { BackGenPlugin, FileMutation, InstallContext } from "../../core/plugin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.resolve(__dirname, "../../../src/plugins/worker/templates");

export const workerPlugin: BackGenPlugin = {
  name: "worker",
  category: "production",
  description: "Background jobs with BullMQ (Redis-backed queue). Add jobs with `backgen generate job <name>`",
  version: "1.0.0",
  available: true,

  dependencies: ["bullmq", "ioredis"],
  devDependencies: ["@types/ioredis"],

  env: {
    REDIS_HOST: "localhost",
    REDIS_PORT: "6379",
    REDIS_PASSWORD: "",
    REDIS_DB: "0",
    JOBS_DEFAULT_RETRIES: "3",
    JOBS_DEFAULT_TIMEOUT_MS: "30000",
  },

  templates: [
    "worker.index.ts.hbs",
    "worker.queue.ts.hbs",
    "worker.base-handler.ts.hbs",
    "worker.dashboard.ts.hbs",
    "worker.shutdown.ts.hbs",
    "worker.types.ts.hbs",
  ],

  async install(ctx: InstallContext) {
    // Module dir is src/modules/worker so every generated file imports its
    // siblings as "./<name>.js" and project files as "../../<name>.js".
    const moduleDir = path.join(ctx.projectDir, "src", "modules", "worker");
    await fs.mkdir(moduleDir, { recursive: true });

    // Template file name → output file name inside the module.
    const outputNames: Record<string, string> = {
      "worker.index.ts.hbs": "index.ts",
      "worker.queue.ts.hbs": "queue.ts",
      "worker.base-handler.ts.hbs": "base-handler.ts",
      "worker.dashboard.ts.hbs": "dashboard.ts",
      "worker.shutdown.ts.hbs": "shutdown.ts",
      "worker.types.ts.hbs": "types.ts",
    };

    for (const tpl of this.templates) {
      await ctx.engine.renderAbsolute(
        path.join(TEMPLATE_DIR, tpl),
        { projectName: ctx.projectName },
        path.join(moduleDir, outputNames[tpl])
      );
    }

    // Register worker routes in app.ts + inject env vars
    const mutations: FileMutation[] = [
      {
        file: "src/app.ts",
        operation: "replace",
        marker: "// {{REGISTER_ROUTES}}",
        content: `import { workerDashboard } from "./modules/worker/dashboard.js";\napp.use("/admin/jobs", workerDashboard);\n// {{REGISTER_ROUTES}}`,
      },
      {
        file: "src/config/env.ts",
        operation: "replace",
        marker: "LOG_LEVEL: z.enum([\"error\", \"warn\", \"info\", \"debug\"]).default(\"info\"),",
        content: `LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),\n  REDIS_HOST: z.string().default("localhost"),\n  REDIS_PORT: z.coerce.number().default(6379),\n  REDIS_PASSWORD: z.string().default(""),\n  REDIS_DB: z.coerce.number().default(0),\n  JOBS_DEFAULT_RETRIES: z.coerce.number().default(3),\n  JOBS_DEFAULT_TIMEOUT_MS: z.coerce.number().default(30000),`,
      },
    ];

    await ctx.mutate(mutations);
  },
};