import * as path from "path";
import { fileURLToPath } from "url";
import type { BackGenPlugin, InstallContext } from "../../core/plugin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.resolve(
  __dirname,
  "../../../src/plugins/codeql/templates"
);

/**
 * BackGen plugin that generates a GitHub CodeQL security analysis workflow.
 *
 * Installs `.github/workflows/codeql.yml` with CodeQL init, autobuild, and
 * analyze steps scheduled on push, pull request, and weekly cron. Category: devops.
 */
export const codeqlPlugin: BackGenPlugin = {
  name: "codeql",
  category: "devops",
  description:
    "GitHub CodeQL security analysis workflow (init, autobuild, analyze)",
  version: "1.0.0",
  available: true,

  dependencies: [],
  devDependencies: [],
  conflicts: [],

  env: {},

  templates: ["codeql.yml.hbs"],

  async install(ctx: InstallContext) {
    const workflowDir = path.join(ctx.projectDir, ".github", "workflows");

    await ctx.engine.renderAbsolute(
      path.join(TEMPLATE_DIR, "codeql.yml.hbs"),
      { projectName: ctx.projectName },
      path.join(workflowDir, "codeql.yml")
    );
  },
};
