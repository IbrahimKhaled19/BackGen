import * as path from "path";
import { fileURLToPath } from "url";
import type { BackGenPlugin, InstallContext } from "../../core/plugin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.resolve(__dirname, "../../../src/plugins/jwt/templates");

export const jwtPlugin: BackGenPlugin = {
  name: "jwt",
  category: "auth",
  description: "JWT authentication with refresh tokens",
  version: "1.0.0",
  available: true,

  dependencies: ["bcryptjs", "jsonwebtoken"],
  devDependencies: ["@types/jsonwebtoken"],

  env: {
    JWT_SECRET: "your-jwt-secret-min-32-characters-long",
    JWT_REFRESH_SECRET: "your-jwt-refresh-secret-min-32-chars",
    JWT_EXPIRES_IN: "15m",
    JWT_REFRESH_EXPIRES_IN: "7d",
  },

  templates: [
    "jwt.controller.ts.hbs",
    "jwt.routes.ts.hbs",
    "jwt.service.ts.hbs",
    "jwt.test.ts.hbs",
    "jwt.types.ts.hbs",
    "jwt.validation.ts.hbs",
    "jwt.middleware.ts.hbs",
    "jwt.role.ts.hbs",
  ],

  async install(ctx: InstallContext) {
    // Install auth module
    const moduleDir = path.join(ctx.projectDir, "src", "modules", "auth");
    const middlewareDir = path.join(ctx.projectDir, "src", "middleware");

    // Render module templates
    const moduleTemplates = [
      "jwt.controller.ts.hbs",
      "jwt.routes.ts.hbs",
      "jwt.service.ts.hbs",
      "jwt.test.ts.hbs",
      "jwt.types.ts.hbs",
      "jwt.validation.ts.hbs",
    ];

    for (const tpl of moduleTemplates) {
      const outputName = tpl.replace("jwt.", "auth.").replace(".hbs", "");
      await ctx.engine.renderAbsolute(
        path.join(TEMPLATE_DIR, tpl),
        { projectName: ctx.projectName },
        path.join(moduleDir, outputName)
      );
    }

    // Render middleware templates
    await ctx.engine.renderAbsolute(
      path.join(TEMPLATE_DIR, "jwt.middleware.ts.hbs"),
      { projectName: ctx.projectName },
      path.join(middlewareDir, "auth.ts")
    );

    await ctx.engine.renderAbsolute(
      path.join(TEMPLATE_DIR, "jwt.role.ts.hbs"),
      { projectName: ctx.projectName },
      path.join(middlewareDir, "role.ts")
    );

    // Register routes in app.ts
    await ctx.mutate([
      {
        file: "src/app.ts",
        operation: "replace",
        marker: "// {{REGISTER_ROUTES}}",
        content: `import authRoutes from "./modules/auth/auth.routes.js";\napp.use("/api/auth", authRoutes);\n// {{REGISTER_ROUTES}}`,
      },
    ]);
  },
};
