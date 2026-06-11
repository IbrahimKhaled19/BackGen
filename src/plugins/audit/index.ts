import * as path from "path";
import * as fs from "fs/promises";
import { fileURLToPath } from "url";
import type { BackGenPlugin, FileMutation, InstallContext } from "../../core/plugin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.resolve(__dirname, "../../../src/plugins/audit/templates");

function getPrismaModelBlock(): string {
  return `\n\nmodel AuditLog {
  id          String   @id @default(uuid())
  actorId     String?
  action      String
  resourceType String
  resourceId  String?
  oldValue    Json?
  newValue    Json?
  ip          String?
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([actorId])
  @@index([resourceType, resourceId])
  @@index([createdAt])
}`;
}

function getDrizzleModelContent(): string {
  return `import { pgTable, text, jsonb, timestamp, uuid } from "drizzle-orm/pg-core";

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
`;
}

function getMongooseModelContent(): string {
  return `import { Schema, model, Document } from "mongoose";

export interface IAuditLog extends Document {
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: String },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

auditLogSchema.index({ actorId: 1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);
`;
}

export const auditPlugin: BackGenPlugin = {
  name: "audit",
  category: "observability",
  description: "Audit trail for tracking resource mutations",
  version: "1.0.0",
  available: true,

  dependencies: [],
  devDependencies: [],

  env: {},

  templates: [
    "audit.types.ts.hbs",
    "audit.validation.ts.hbs",
    "audit.service.ts.hbs",
    "audit.controller.ts.hbs",
    "audit.routes.ts.hbs",
    "audit.middleware.ts.hbs",
  ],

  async install(ctx: InstallContext) {
    const moduleDir = path.join(ctx.projectDir, "src", "modules", "audit");

    // Render module templates
    for (const tpl of this.templates) {
      const outputName = tpl.replace(".hbs", "");
      await ctx.engine.renderAbsolute(
        path.join(TEMPLATE_DIR, tpl),
        { projectName: ctx.projectName },
        path.join(moduleDir, outputName)
      );
    }

    // Register routes + env vars
    const mutations: FileMutation[] = [
      {
        file: "src/app.ts",
        operation: "replace",
        marker: "// {{REGISTER_ROUTES}}",
        content: `import auditRoutes from "./modules/audit/audit.routes.js";\napp.use("/api/audit-logs", auditRoutes);\n  // {{REGISTER_ROUTES}}`,
      },
    ];

    // Add AuditLog model per ORM
    if (ctx.orm === "prisma") {
      mutations.push({
        file: "prisma/schema.prisma",
        operation: "append",
        content: getPrismaModelBlock(),
      });
    }

    await ctx.mutate(mutations);

    // Drizzle/Mongoose model files
    if (ctx.orm === "drizzle") {
      const modelDir = path.join(ctx.projectDir, "src", "db", "schemas");
      await fs.mkdir(modelDir, { recursive: true });
      const modelPath = path.join(modelDir, "audit-log.ts");
      ctx.trackFile?.(modelPath);
      await fs.writeFile(modelPath, getDrizzleModelContent(), "utf-8");
    }

    if (ctx.orm === "mongoose") {
      const modelDir = path.join(ctx.projectDir, "src", "models");
      await fs.mkdir(modelDir, { recursive: true });
      const modelPath = path.join(modelDir, "AuditLog.ts");
      ctx.trackFile?.(modelPath);
      await fs.writeFile(modelPath, getMongooseModelContent(), "utf-8");
    }
  },
};
