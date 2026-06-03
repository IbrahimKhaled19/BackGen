import * as path from "path";
import { fileURLToPath } from "url";
import type { BackGenPlugin, InstallContext } from "../../core/plugin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.resolve(__dirname, "../../../src/plugins/sanitize/templates");

export const sanitizePlugin: BackGenPlugin = {
  name: "sanitize",
  category: "production",
  description:
    "Input sanitization: strips XSS payloads and NoSQL injection operators from req.body, req.query, req.params.",
  version: "1.0.0",
  available: true,

  dependencies: ["xss", "express-mongo-sanitize"],
  devDependencies: ["@types/express-mongo-sanitize"],

  templates: ["sanitize.ts.hbs"],

  async install(ctx: InstallContext) {
    const middlewareDir = path.join(ctx.projectDir, "src", "middleware");

    await ctx.engine.renderAbsolute(
      path.join(TEMPLATE_DIR, "sanitize.ts.hbs"),
      { projectName: ctx.projectName },
      path.join(middlewareDir, "sanitize.ts")
    );

    await ctx.mutate([
      {
        file: "src/app.ts",
        operation: "replace",
        marker: "// {{REGISTER_MIDDLEWARE}}",
        content: `// {{REGISTER_MIDDLEWARE}}
import { sanitizeInput } from "./middleware/sanitize.js";

app.use(sanitizeInput);`,
      },
    ]);
  },
};
