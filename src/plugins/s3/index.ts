import * as path from "path";
import { fileURLToPath } from "url";
import type { BackGenPlugin, InstallContext } from "../../core/plugin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.join(__dirname, "templates");

export const s3Plugin: BackGenPlugin = {
  name: "s3",
  category: "storage",
  description: "AWS S3 file storage",
  version: "1.0.0",
  available: true,

  dependencies: ["@aws-sdk/client-s3", "@aws-sdk/s3-request-presigner", "multer"],
  devDependencies: ["@types/multer"],

  env: {
    AWS_ACCESS_KEY_ID: "your-access-key",
    AWS_SECRET_ACCESS_KEY: "your-secret-key",
    AWS_REGION: "us-east-1",
    AWS_S3_BUCKET: "your-bucket-name",
  },

  templates: [
    "s3.service.ts.hbs",
    "s3.controller.ts.hbs",
    "s3.routes.ts.hbs",
    "s3.types.ts.hbs",
  ],

  async install(ctx: InstallContext) {
    const moduleDir = path.join(ctx.projectDir, "src", "modules", "storage");

    for (const tpl of this.templates) {
      const outputName = tpl.replace(".hbs", "");
      await ctx.engine.renderAbsolute(
        path.join(TEMPLATE_DIR, tpl),
        { projectName: ctx.projectName },
        path.join(moduleDir, outputName)
      );
    }

    await ctx.mutate([
      {
        file: "src/app.ts",
        operation: "replace",
        marker: "// {{REGISTER_ROUTES}}",
        content: `import storageRoutes from "./modules/storage/s3.routes.js";\napp.use("/api/storage", storageRoutes);\n  // {{REGISTER_ROUTES}}`,
      },
    ]);
  },
};
