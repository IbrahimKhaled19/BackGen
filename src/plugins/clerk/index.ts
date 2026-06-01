import * as path from "path";
import { fileURLToPath } from "url";
import type { BackGenPlugin, InstallContext } from "../../core/plugin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.resolve(__dirname, "../../../src/plugins/clerk/templates");

export const clerkPlugin: BackGenPlugin = {
  name: "clerk",
  category: "auth",
  description: "Auth-as-a-service with Clerk",
  version: "1.0.0",
  available: true,

  dependencies: ["@clerk/express"],
  devDependencies: [],
  conflicts: ["jwt"],

  env: {
    CLERK_SECRET_KEY: "sk_test_...",
    CLERK_PUBLISHABLE_KEY: "pk_test_...",
    CLERK_WEBHOOK_SECRET: "whsec_...",
  },

  templates: [
    "clerk.middleware.ts.hbs",
    "clerk.routes.ts.hbs",
    "clerk.types.ts.hbs",
  ],

  async install(ctx: InstallContext) {
    const moduleDir = path.join(ctx.projectDir, "src", "modules", "clerk");

    for (const tpl of this.templates) {
      const outputName = tpl.replace(".hbs", "");
      await ctx.engine.renderAbsolute(
        path.join(TEMPLATE_DIR, tpl),
        { projectName: ctx.projectName },
        path.join(moduleDir, outputName)
      );
    }

    await ctx.mutate([
      // Add Clerk SDK import
      {
        file: "src/app.ts",
        operation: "replace",
        marker: `import helmet from "helmet";`,
        content: `import helmet from "helmet";\nimport { clerkMiddleware } from "@clerk/express";`,
      },
      // Add clerkMiddleware() before routes
      {
        file: "src/app.ts",
        operation: "replace",
        marker: `app.use(requestLogger);`,
        content: `app.use(requestLogger);\napp.use(clerkMiddleware());`,
      },
      // Register Clerk routes
      {
        file: "src/app.ts",
        operation: "replace",
        marker: "// {{REGISTER_ROUTES}}",
        content: `import clerkRoutes from "./modules/clerk/clerk.routes.js";\napp.use("/api/auth", clerkRoutes);\n// {{REGISTER_ROUTES}}`,
      },
    ]);
  },
};
