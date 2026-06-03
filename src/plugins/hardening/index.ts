import * as path from "path";
import { fileURLToPath } from "url";
import type { BackGenPlugin, InstallContext } from "../../core/plugin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.resolve(__dirname, "../../../src/plugins/hardening/templates");

export const hardeningPlugin: BackGenPlugin = {
  name: "hardening",
  category: "production",
  description:
    "Production hardening: request ID, strict CORS, body size limit, request timeout, /ready endpoint, graceful shutdown, error envelope",
  version: "1.0.0",
  available: true,

  dependencies: [],
  devDependencies: ["@types/http-errors"],

  env: {
    BODY_SIZE_LIMIT: "1mb",
    REQUEST_TIMEOUT_MS: "30000",
    CORS_ALLOWED_ORIGINS: "http://localhost:3000",
  },

  templates: [
    "request-id.ts.hbs",
    "request-timeout.ts.hbs",
    "cors-strict.ts.hbs",
    "health.ts.hbs",
    "graceful-shutdown.ts.hbs",
    "error-envelope.ts.hbs",
  ],

  async install(ctx: InstallContext) {
    const middlewareDir = path.join(ctx.projectDir, "src", "middleware");
    const utilsDir = path.join(ctx.projectDir, "src", "utils");

    // Render middleware templates
    for (const tpl of [
      "request-id.ts.hbs",
      "request-timeout.ts.hbs",
      "cors-strict.ts.hbs",
      "health.ts.hbs",
      "graceful-shutdown.ts.hbs",
    ]) {
      const out = tpl.replace(".hbs", "");
      await ctx.engine.renderAbsolute(
        path.join(TEMPLATE_DIR, tpl),
        { projectName: ctx.projectName },
        path.join(middlewareDir, out)
      );
    }

    // Render error envelope utility
    await ctx.engine.renderAbsolute(
      path.join(TEMPLATE_DIR, "error-envelope.ts.hbs"),
      { projectName: ctx.projectName },
      path.join(utilsDir, "error-envelope.ts")
    );

    // Register all hardening middleware in app.ts at REGISTER_MIDDLEWARE marker
    await ctx.mutate([
      {
        file: "src/app.ts",
        operation: "replace",
        marker: "// {{REGISTER_MIDDLEWARE}}",
        content: `// {{REGISTER_MIDDLEWARE}}
import { requestId } from "./middleware/request-id.js";
import { requestTimeout } from "./middleware/request-timeout.js";
import { corsStrict } from "./middleware/cors-strict.js";
import { readyCheck } from "./middleware/health.js";

app.use(requestId);
app.use(corsStrict);
app.use(express.json({ limit: env.BODY_SIZE_LIMIT }));
app.use(requestTimeout(env.REQUEST_TIMEOUT_MS));`,
      },
      {
        file: "src/app.ts",
        operation: "replace",
        marker: "app.get(\"/health\", (_req, res) => {\n  res.json({ status: \"ok\", timestamp: new Date().toISOString() });\n});",
        content: `app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.get("/ready", readyCheck);`,
      },
      {
        file: "src/config/env.ts",
        operation: "replace",
        marker: "LOG_LEVEL: z.enum([\"error\", \"warn\", \"info\", \"debug\"]).default(\"info\"),",
        content: `LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  BODY_SIZE_LIMIT: z.string().default("1mb"),
  REQUEST_TIMEOUT_MS: z.coerce.number().default(30000),
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),`,
      },
    ]);
  },
};
