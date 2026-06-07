import * as path from "path";
import { fileURLToPath } from "url";
import type { BackGenPlugin, InstallContext } from "../../core/plugin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.resolve(__dirname, "../../../src/plugins/release/templates");

/**
 * BackGen plugin that generates a GitHub Actions Release workflow.
 *
 * Installs `.github/workflows/release.yml` with npm publish and GitHub
 * Release creation triggered by version tags. Category: devops.
 */
export const releasePlugin: BackGenPlugin = {
  name: "release",
  category: "devops",
  description:
    "GitHub Actions Release workflow (npm publish, GitHub Release on tag push v*)",
  version: "1.0.0",
  available: true,

  dependencies: [],
  devDependencies: [],
  conflicts: [],

  env: {},

  templates: ["release.yml.hbs"],

  async install(ctx: InstallContext) {
    const workflowDir = path.join(ctx.projectDir, ".github", "workflows");

    await ctx.engine.renderAbsolute(
      path.join(TEMPLATE_DIR, "release.yml.hbs"),
      { projectName: ctx.projectName },
      path.join(workflowDir, "release.yml")
    );
  },
};
