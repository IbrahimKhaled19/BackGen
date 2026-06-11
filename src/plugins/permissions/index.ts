import * as path from "path";
import * as fs from "fs/promises";
import { fileURLToPath } from "url";
import type { BackGenPlugin, FileMutation, InstallContext } from "../../core/plugin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.resolve(__dirname, "../../../src/plugins/permissions/templates");

function getPrismaModels(): string {
  return `
model Permission {
  id        String   @id @default(uuid())
  resource  String
  action    String
  roles     Role[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([resource, action])
  @@index([resource])
}

model Role {
  id          String       @id @default(uuid())
  name        String       @unique
  description String?
  permissions Permission[]
  userRoles   UserRole[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model UserRole {
  id        String   @id @default(uuid())
  userId    String
  roleId    String
  role      Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userId, roleId])
  @@index([userId])
}`;
}

export const permissionsPlugin: BackGenPlugin = {
  name: "permissions",
  category: "auth",
  description: "Role-based permissions (roles, permissions, user-roles)",
  version: "1.0.0",
  available: true,

  dependencies: [],
  devDependencies: [],
  conflicts: [],

  env: {},

  templates: [
    "permission.types.ts.hbs",
    "permission.validation.ts.hbs",
    "permission.service.ts.hbs",
    "permission.controller.ts.hbs",
    "permission.routes.ts.hbs",
    "permission.middleware.ts.hbs",
    "role.types.ts.hbs",
    "role.validation.ts.hbs",
    "role.service.ts.hbs",
    "role.controller.ts.hbs",
    "role.routes.ts.hbs",
  ],

  async install(ctx: InstallContext) {
    const moduleDir = path.join(ctx.projectDir, "src", "modules", "permissions");

    for (const tpl of this.templates) {
      const outputName = tpl.replace(".hbs", "");
      await ctx.engine.renderAbsolute(
        path.join(TEMPLATE_DIR, tpl),
        { projectName: ctx.projectName },
        path.join(moduleDir, outputName)
      );
    }

    const mutations: FileMutation[] = [
      {
        file: "src/app.ts",
        operation: "replace",
        marker: "// {{REGISTER_ROUTES}}",
        content: `import permissionRoutes from "./modules/permissions/permission.routes.js";\nimport roleRoutes from "./modules/permissions/role.routes.js";\napp.use("/api/permissions", permissionRoutes);\napp.use("/api/roles", roleRoutes);\n  // {{REGISTER_ROUTES}}`,
      },
    ];

    if (ctx.orm === "prisma") {
      mutations.push({
        file: "prisma/schema.prisma",
        operation: "append",
        content: getPrismaModels(),
      });
    }

    await ctx.mutate(mutations);

    if (ctx.orm === "drizzle") {
      const modelDir = path.join(ctx.projectDir, "src", "db", "schemas");
      await fs.mkdir(modelDir, { recursive: true });
      ctx.trackFile?.(path.join(modelDir, "permission.ts"));
      ctx.trackFile?.(path.join(modelDir, "role.ts"));
      ctx.trackFile?.(path.join(modelDir, "user-role.ts"));
    }

    if (ctx.orm === "mongoose") {
      const modelDir = path.join(ctx.projectDir, "src", "models");
      await fs.mkdir(modelDir, { recursive: true });
      ctx.trackFile?.(path.join(modelDir, "Permission.ts"));
      ctx.trackFile?.(path.join(modelDir, "Role.ts"));
      ctx.trackFile?.(path.join(modelDir, "UserRole.ts"));
    }
  },
};
