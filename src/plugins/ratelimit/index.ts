import * as path from "path";
import { fileURLToPath } from "url";
import type { BackGenPlugin, InstallContext } from "../../core/plugin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPRESS_TEMPLATE_DIR = path.resolve(__dirname, "../../../templates/express");

export const ratelimitPlugin: BackGenPlugin = {
  name: "ratelimit",
  category: "production",
  description:
    "Rate limiting middleware (express-rate-limit). In-memory by default, Redis store optional. V4.6.1: writes to src/middleware/security/.",
  version: "1.1.0",
  available: true,

  dependencies: ["express-rate-limit"],
  devDependencies: ["@types/express-rate-limit"],

  env: {},

  templates: ["rate-limit.ts.hbs"],

  async install(ctx: InstallContext) {
    const securityDir = path.join(ctx.projectDir, "src", "middleware", "security");

    await ctx.engine.renderAbsolute(
      path.join(EXPRESS_TEMPLATE_DIR, "src/middleware/security/rate-limit.ts.hbs"),
      { projectName: ctx.projectName },
      path.join(securityDir, "rate-limit.ts")
    );

    await ctx.mutate([
      {
        file: "src/app.ts",
        operation: "replace",
        marker: "// {{REGISTER_MIDDLEWARE}}",
        content: `// {{REGISTER_MIDDLEWARE}}
import { rateLimit } from "./middleware/security/rate-limit.js";

app.use("/api", rateLimit);`,
      },
    ]);
  },
};
