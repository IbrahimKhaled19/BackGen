import * as path from "path";
import { fileURLToPath } from "url";
import type { BackGenPlugin, InstallContext } from "../../core/plugin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.join(__dirname, "templates");

export const stripePlugin: BackGenPlugin = {
  name: "stripe",
  category: "payment",
  description: "Payment processing with Stripe",
  version: "1.0.0",
  available: true,

  dependencies: ["stripe"],
  devDependencies: [],

  env: {
    STRIPE_SECRET_KEY: "sk_test_...",
    STRIPE_WEBHOOK_SECRET: "whsec_...",
    STRIPE_PUBLISHABLE_KEY: "pk_test_...",
  },

  templates: [
    "stripe.service.ts.hbs",
    "stripe.controller.ts.hbs",
    "stripe.routes.ts.hbs",
    "stripe.types.ts.hbs",
    "stripe.validation.ts.hbs",
  ],

  async install(ctx: InstallContext) {
    const moduleDir = path.join(ctx.projectDir, "src", "modules", "stripe");

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
        content: `import stripeRoutes from "./modules/stripe/stripe.routes.js";\napp.use("/api/payments", stripeRoutes);\n  // {{REGISTER_ROUTES}}`,
      },
    ]);
  },
};
