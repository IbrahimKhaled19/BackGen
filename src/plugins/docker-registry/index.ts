import * as path from "path";
import { fileURLToPath } from "url";
import type { BackGenPlugin, InstallContext } from "../../core/plugin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.resolve(__dirname, "../../../src/plugins/docker-registry/templates");

/**
 * BackGen plugin that generates a Docker image build and publish workflow.
 *
 * Installs `.github/workflows/docker-publish.yml` with Docker Buildx and
 * GitHub Container Registry push steps. Category: devops.
 */
export const dockerRegistryPlugin: BackGenPlugin = {
  name: "docker-registry",
  category: "devops",
  description:
    "Docker build and publish to GitHub Container Registry (GHCR)",
  version: "1.0.0",
  available: true,

  dependencies: [],
  devDependencies: [],
  conflicts: [],

  env: {},

  templates: ["docker-publish.yml.hbs"],

  async install(ctx: InstallContext) {
    const workflowDir = path.join(ctx.projectDir, ".github", "workflows");

    await ctx.engine.renderAbsolute(
      path.join(TEMPLATE_DIR, "docker-publish.yml.hbs"),
      { projectName: ctx.projectName },
      path.join(workflowDir, "docker-publish.yml")
    );
  },
};
