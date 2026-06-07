import * as path from "path";
import { fileURLToPath } from "url";
import type { BackGenPlugin, InstallContext } from "../../core/plugin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.resolve(
  __dirname,
  "../../../src/plugins/dependabot/templates",
);

/**
 * BackGen plugin that generates a GitHub Dependabot configuration.
 *
 * Installs `.github/dependabot.yml` with weekly npm dependency updates,
 * a limit of 10 open PRs, and a "dependencies" label. Category: devops.
 */
export const dependabotPlugin: BackGenPlugin = {
  name: "dependabot",
  category: "devops",
  description:
    "GitHub Dependabot config (weekly npm updates, PR limit, dependency label)",
  version: "1.0.0",
  available: true,

  dependencies: [],
  devDependencies: [],
  conflicts: [],

  env: {},

  templates: ["dependabot.yml.hbs"],

  async install(ctx: InstallContext) {
    const dotGithubDir = path.join(ctx.projectDir, ".github");

    await ctx.engine.renderAbsolute(
      path.join(TEMPLATE_DIR, "dependabot.yml.hbs"),
      { projectName: ctx.projectName },
      path.join(dotGithubDir, "dependabot.yml"),
    );
  },
};
