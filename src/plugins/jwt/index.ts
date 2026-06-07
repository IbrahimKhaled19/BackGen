import * as path from "path";
import * as fs from "fs/promises";
import { randomBytes } from "crypto";
import { fileURLToPath } from "url";
import type { BackGenPlugin, FileMutation, InstallContext } from "../../core/plugin.js";
import {
  getPluginModelPath,
  getUserModelSnippet,
  getRefreshTokenModelSnippet,
} from "../../core/schema-helpers.js";

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
  conflicts: ["clerk"],

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
    // Generate random secrets for new projects
    const jwtSecret = randomBytes(32).toString("hex");
    const refreshSecret = randomBytes(32).toString("hex");

    // Write real secrets to .env (gitignored), not .env.example
    const envPath = path.join(ctx.projectDir, ".env");
    try {
      const existing = await fs.readFile(envPath, "utf-8");
      if (!existing.includes("JWT_SECRET=")) {
        await fs.appendFile(envPath, `\n# jwt plugin\nJWT_SECRET=${jwtSecret}\nJWT_REFRESH_SECRET=${refreshSecret}\n`, "utf-8");
      }
    } catch {
      await fs.writeFile(envPath, `# jwt plugin\nJWT_SECRET=${jwtSecret}\nJWT_REFRESH_SECRET=${refreshSecret}\n`, "utf-8");
    }

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

    // Register routes in app.ts + inject env vars + add model schemas per ORM
    const mutations: FileMutation[] = [
      {
        file: "src/app.ts",
        operation: "replace",
        marker: "// {{REGISTER_ROUTES}}",
        content: `import authRoutes from "./modules/auth/auth.routes.js";\napp.use("/api/auth", authRoutes);\n// {{REGISTER_ROUTES}}`,
      },
      {
        file: "src/config/env.ts",
        operation: "replace",
        marker: "LOG_LEVEL: z.enum([\"error\", \"warn\", \"info\", \"debug\"]).default(\"info\"),",
        content: `LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),\n  JWT_SECRET: z.string().min(32),\n  JWT_REFRESH_SECRET: z.string().min(32),\n  JWT_EXPIRES_IN: z.string().default("15m"),\n  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),`,
      },
    ];

    // Add User + RefreshToken models per ORM
    if (ctx.orm === "prisma") {
      mutations.push({
        file: "prisma/schema.prisma",
        operation: "append",
        content: `\n\nmodel User {\n  id            String         @id @default(uuid())\n  email         String         @unique\n  password      String\n  role          Role           @default(USER)\n  refreshTokens RefreshToken[]\n  createdAt     DateTime       @default(now())\n  updatedAt     DateTime       @updatedAt\n}\n\nmodel RefreshToken {\n  id        String   @id @default(uuid())\n  token     String   @unique\n  userId    String\n  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n  expiresAt DateTime\n  createdAt DateTime @default(now())\n}\n\nenum Role {\n  ADMIN\n  USER\n}`,
      });
    }

    await ctx.mutate(mutations);

    // For Drizzle/Mongoose: write separate model files
    if (ctx.orm !== "prisma") {
      const userPath = getPluginModelPath(ctx.orm, "User");
      const tokenPath = getPluginModelPath(ctx.orm, "RefreshToken");
      await fs.mkdir(path.join(ctx.projectDir, userPath.dir), { recursive: true });
      await fs.writeFile(
        path.join(ctx.projectDir, userPath.file),
        getUserModelSnippet(ctx.orm),
        "utf-8"
      );
      await fs.writeFile(
        path.join(ctx.projectDir, tokenPath.file),
        getRefreshTokenModelSnippet(ctx.orm),
        "utf-8"
      );
    }
  },
};
