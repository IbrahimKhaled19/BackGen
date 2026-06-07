import * as path from "path";
import { fileURLToPath } from "url";
import type { BackGenPlugin, InstallContext } from "../../core/plugin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.resolve(__dirname, "../../../src/plugins/ci-github/templates");

/**
 * BackGen plugin that generates a GitHub Actions CI workflow.
 *
 * Installs `.github/workflows/ci.yml` with lint, typecheck, test, and
 * build steps plus an optional deploy job. Category: devops.
 */
export const ciGithubPlugin: BackGenPlugin = {
  name: "ci-github",
  category: "devops",
  description:
    "GitHub Actions CI pipeline (lint, typecheck, test, build, optional deploy)",
  version: "1.0.0",
  available: true,

  dependencies: [],
  devDependencies: [],
  conflicts: [],

  env: {},

  templates: ["ci.yml.hbs"],

  async install(ctx: InstallContext) {
    const workflowDir = path.join(ctx.projectDir, ".github", "workflows");

    await ctx.engine.renderAbsolute(
      path.join(TEMPLATE_DIR, "ci.yml.hbs"),
      { projectName: ctx.projectName, deploy: false },
      path.join(workflowDir, "ci.yml")
    );
  },
};
