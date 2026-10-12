import * as path from "path";
import * as fs from "fs/promises";
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

  dependencies: ["@clerk/express", "svix"],
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
    await fs.mkdir(moduleDir, { recursive: true });

    // The middleware replaces the base auth stub at src/middleware/auth.ts so
    // every generated route module keeps importing the same symbol.
    await ctx.engine.renderAbsolute(
      path.join(TEMPLATE_DIR, "clerk.middleware.ts.hbs"),
      { projectName: ctx.projectName },
      path.join(ctx.projectDir, "src", "middleware", "auth.ts")
    );

    for (const tpl of ["clerk.routes.ts.hbs", "clerk.types.ts.hbs"]) {
      await ctx.engine.renderAbsolute(
        path.join(TEMPLATE_DIR, tpl),
        { projectName: ctx.projectName },
        path.join(moduleDir, tpl.replace(".hbs", ""))
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
      // Resolve req.user globally so tenant scoping can require an identity
      {
        file: "src/app.ts",
        operation: "replace",
        marker: "// {{REGISTER_MIDDLEWARE}}",
        content: `import { optionalAuthMiddleware } from "./middleware/auth.js";\napp.use(optionalAuthMiddleware);\n// {{REGISTER_MIDDLEWARE}}`,
      },
      // Register Clerk routes
      {
        file: "src/app.ts",
        operation: "replace",
        marker: "// {{REGISTER_ROUTES}}",
        content: `import clerkRoutes from "./modules/clerk/clerk.routes.js";\napp.use("/api/auth", clerkRoutes);\n// {{REGISTER_ROUTES}}`,
      },
      // Add Clerk env vars to validation
      {
        file: "src/config/env.ts",
        operation: "replace",
        marker: "REDIS_URL: z.string().optional(),",
        content: `REDIS_URL: z.string().optional(),\n  CLERK_SECRET_KEY: z.string(),\n  CLERK_PUBLISHABLE_KEY: z.string(),\n  CLERK_WEBHOOK_SECRET: z.string(),`,
      },
    ]);
  },
};
