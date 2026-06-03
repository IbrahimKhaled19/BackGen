import * as path from "path";
import { fileURLToPath } from "url";
import type { BackGenPlugin, InstallContext } from "../../core/plugin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.resolve(__dirname, "../../../src/plugins/ratelimit/templates");

export const ratelimitPlugin: BackGenPlugin = {
  name: "ratelimit",
  category: "production",
  description:
    "Rate limiting middleware (express-rate-limit). In-memory by default, Redis store optional.",
  version: "1.0.0",
  available: true,

  dependencies: ["express-rate-limit", "rate-limit-redis", "ioredis"],
  devDependencies: ["@types/express-rate-limit"],

  env: {
    RATE_LIMIT_WINDOW_MS: "60000",
    RATE_LIMIT_MAX: "100",
    REDIS_URL: "",
  },

  templates: ["rate-limit.ts.hbs"],

  async install(ctx: InstallContext) {
    const middlewareDir = path.join(ctx.projectDir, "src", "middleware");

    await ctx.engine.renderAbsolute(
      path.join(TEMPLATE_DIR, "rate-limit.ts.hbs"),
      { projectName: ctx.projectName },
      path.join(middlewareDir, "rate-limit.ts")
    );

    await ctx.mutate([
      {
        file: "src/app.ts",
        operation: "replace",
        marker: "// {{REGISTER_MIDDLEWARE}}",
        content: `// {{REGISTER_MIDDLEWARE}}
import { rateLimitMw as rateLimit } from "./middleware/rate-limit.js";

app.use("/api", rateLimit);`,
      },
      {
        file: "src/config/env.ts",
        operation: "replace",
        marker: "LOG_LEVEL: z.enum([\"error\", \"warn\", \"info\", \"debug\"]).default(\"info\"),",
        content: `LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  REDIS_URL: z.string().optional(),`,
      },
    ]);
  },
};
