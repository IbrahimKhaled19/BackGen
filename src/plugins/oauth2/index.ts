import * as path from "path";
import * as fs from "fs/promises";
import { fileURLToPath } from "url";
import type { BackGenPlugin, FileMutation, InstallContext } from "../../core/plugin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.resolve(__dirname, "../../../src/plugins/oauth2/templates");

export const oauth2Plugin: BackGenPlugin = {
  name: "oauth2",
  category: "auth",
  description: "OAuth2/Social Login — Google, GitHub, Discord authentication with JWT integration",
  version: "1.0.0",
  available: true,

  dependencies: ["jsonwebtoken"],
  devDependencies: ["@types/jsonwebtoken"],
  // Social login issues the same access tokens as password login, so it needs
  // the jwt plugin's User model, JWT_SECRET env var and /api/auth/refresh route.
  requires: ["jwt"],
  conflicts: ["clerk"],

  env: {
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    GOOGLE_CALLBACK_URL: "http://localhost:3000/api/auth/google/callback",
    GITHUB_CLIENT_ID: "",
    GITHUB_CLIENT_SECRET: "",
    GITHUB_CALLBACK_URL: "http://localhost:3000/api/auth/github/callback",
    DISCORD_CLIENT_ID: "",
    DISCORD_CLIENT_SECRET: "",
    DISCORD_CALLBACK_URL: "http://localhost:3000/api/auth/discord/callback",
    OAUTH2_SUCCESS_REDIRECT: "http://localhost:5173",
    OAUTH2_FAILURE_REDIRECT: "http://localhost:5173/login?error=oauth_failed",
  },

  templates: [
    "oauth2.providers.ts.hbs",
    "oauth2.service.ts.hbs",
    "oauth2.controller.ts.hbs",
    "oauth2.routes.ts.hbs",
    "oauth2.validation.ts.hbs",
  ],

  async install(ctx: InstallContext) {
    const moduleDir = path.join(ctx.projectDir, "src", "modules", "auth");
    await fs.mkdir(moduleDir, { recursive: true });

    // Render = write template files directly (matching JWT pattern)
    const templates = [
      "oauth2.providers.ts.hbs",
      "oauth2.service.ts.hbs",
      "oauth2.controller.ts.hbs",
      "oauth2.routes.ts.hbs",
      "oauth2.validation.ts.hbs",
    ];

    for (const tpl of templates) {
      const outputName = tpl.replace(".hbs", "");
      await ctx.engine.renderAbsolute(
        path.join(TEMPLATE_DIR, tpl),
        { projectName: ctx.projectName },
        path.join(moduleDir, outputName)
      );
    }

    // Register OAuth2 routes in app.ts + inject env vars
    const mutations: FileMutation[] = [
      {
        file: "src/app.ts",
        operation: "replace",
        marker: "// {{REGISTER_ROUTES}}",
        content: `import { oauth2Router } from "./modules/auth/oauth2.routes.js";\napp.use("/api/auth", oauth2Router);\n// {{REGISTER_ROUTES}}`,
      },
      {
        file: "src/config/env.ts",
        operation: "replace",
        marker: "JWT_REFRESH_EXPIRES_IN: z.string().default(\"7d\"),",
        content: `JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),\n  GOOGLE_CLIENT_ID: z.string(),\n  GOOGLE_CLIENT_SECRET: z.string(),\n  GOOGLE_CALLBACK_URL: z.string().default("http://localhost:3000/api/auth/google/callback"),\n  GITHUB_CLIENT_ID: z.string(),\n  GITHUB_CLIENT_SECRET: z.string(),\n  GITHUB_CALLBACK_URL: z.string().default("http://localhost:3000/api/auth/github/callback"),\n  DISCORD_CLIENT_ID: z.string(),\n  DISCORD_CLIENT_SECRET: z.string(),\n  DISCORD_CALLBACK_URL: z.string().default("http://localhost:3000/api/auth/discord/callback"),\n  OAUTH2_SUCCESS_REDIRECT: z.string().default("http://localhost:5173"),\n  OAUTH2_FAILURE_REDIRECT: z.string().default("http://localhost:5173/login?error=oauth_failed"),`,
      },
    ];

    // Social login links provider ids onto the User row created by the jwt
    // plugin (a declared requirement). `refreshTokens RefreshToken[]` is the
    // stable line the jwt plugin writes into model User, so the relation list
    // can be extended without rewriting the model.
    if (ctx.orm === "prisma") {
      mutations.push({
        file: "prisma/schema.prisma",
        operation: "replace",
        marker: "  refreshTokens RefreshToken[]",
        content: "  refreshTokens RefreshToken[]\n  oauthIdentities UserOAuthIdentity[]",
      });
      mutations.push({
        file: "prisma/schema.prisma",
        operation: "append",
        content: `
// ── OAuth2 provider links (oauth2 plugin) ──
model UserOAuthIdentity {
  id         String   @id @default(uuid())
  userId     String
  provider   String
  providerId String
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerId])
  @@index([userId])
}
`,
      });
    } else {
      console.warn(
        `[oauth2] Provider-identity storage is only generated for Prisma projects. ` +
          `On ${ctx.orm}, add a user_oauth_identity table and adjust ` +
          `src/modules/auth/oauth2.controller.ts before using social login.`
      );
    }

    await ctx.mutate(mutations);
  },
};
