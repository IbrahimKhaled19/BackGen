import * as path from "path";
import type { BackGenPlugin, InstallContext } from "../../core/plugin.js";

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
    "clerk.service.ts.hbs",
    "clerk.routes.ts.hbs",
    "clerk.types.ts.hbs",
  ],

  async install(ctx: InstallContext) {
    const moduleDir = path.join(ctx.projectDir, "src", "modules", "clerk");

    for (const tpl of this.templates) {
      const outputName = tpl.replace(".hbs", "");
      await ctx.engine.renderToFile(
        `plugins/clerk/templates/${tpl}`,
        { projectName: ctx.projectName },
        path.join(moduleDir, outputName)
      );
    }

    // Replace JWT auth middleware with Clerk middleware in app.ts
    await ctx.mutate([
      {
        file: "src/app.ts",
        operation: "replace",
        marker: `import { authMiddleware } from "./middleware/auth.js";`,
        content: `import { clerkAuthMiddleware as authMiddleware } from "./modules/clerk/clerk.middleware.js";`,
      },
      {
        file: "src/app.ts",
        operation: "replace",
        marker: "// {{REGISTER_ROUTES}}",
        content: `import clerkRoutes from "./modules/clerk/clerk.routes.js";\napp.use("/api/auth", clerkRoutes);\n  // {{REGISTER_ROUTES}}`,
      },
    ]);
  },
};
