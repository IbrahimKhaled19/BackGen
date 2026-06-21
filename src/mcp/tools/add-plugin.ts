import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runBackgen } from "../utils/run-backgen.js";

/**
 * Register the add_plugin tool on the MCP server.
 * Installs a plugin into an existing BackGen-generated project. Adds files, env vars, npm deps, and updates the manifest.
 */
export function addPluginTool(server: McpServer) {
  server.tool(
    "add_plugin",
    "Installs a feature plugin into an existing BackGen-generated project. Each plugin injects its own source files (controllers, routes, middleware, services), registers routes in app.ts, adds npm dependencies, injects environment variables into .env, and updates the .backgenrc.json manifest with ownership tracking. Call list_plugins first to see all available options with descriptions and categories. Run doctor afterwards to verify the project is healthy. IMPORTANT: jwt and clerk conflict — they cannot be installed together. The devops shorthand ('ci-github', 'dependabot', 'codeql', 'docker-registry', 'release') installs the full DevOps suite.",
    {
      plugin: z
        .enum(["jwt", "clerk", "stripe", "s3", "ratelimit", "ci-github", "dependabot", "codeql", "docker-registry", "release"])
        .describe(
          "Plugin to install. Categories: auth (jwt, clerk — mutually exclusive, pick one), payment (stripe), storage (s3), production (ratelimit), devops (ci-github, dependabot, codeql, docker-registry, release — install all with backgen add devops). Use list_plugins first to see descriptions."
        ),
      dir: z
        .string()
        .optional()
        .describe("Absolute or relative path to the existing BackGen-generated project directory. Defaults to the current working directory. Example: '/home/user/projects/my-api'."),
    },
    async ({ plugin, dir }) => {
      const args = ["add", plugin];

      try {
        const output = runBackgen(args, dir);
        const nextSteps = {
          jwt: "Auth routes registered at /api/auth (register, login, refresh, logout). Add `@authenticate` decorator to protect routes.",
          clerk: "Clerk middleware installed. Configure your Clerk API keys in .env. Protected routes use the same @authenticate decorator as JWT.",
          stripe: "Stripe webhook endpoint at /api/stripe/webhooks. Check .env for STRIPE_SECRET_KEY. Create products in the Stripe dashboard.",
          s3: "S3 upload endpoint at /api/files/upload. Configure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME in .env.",
          ratelimit: "Rate limiting active on all routes. Configure limits in src/config/env.ts. Redis-ready for distributed deployments.",
          "ci-github": "GitHub Actions workflow added at .github/workflows/ci.yml. Runs lint, typecheck, test, build on push/PR.",
          dependabot: "Dependabot config added at .github/dependabot.yml. Runs on schedule, auto-creates PRs for outdated deps.",
          codeql: "CodeQL analysis workflow added at .github/workflows/codeql.yml. Scans for security vulnerabilities on push.",
          "docker-registry": "Docker build & publish workflow added. Pushes to GHCR on release. Configure secrets in GitHub repo settings.",
          release: "Semantic release workflow added. Auto-publishes to npm and creates GitHub releases on push to main.",
        };

        return {
          content: [
            {
              type: "text",
              text: [
                `✅ Plugin "${plugin}" installed.`,
                "",
                nextSteps[plugin as keyof typeof nextSteps] || "",
                "",
                output,
              ].join("\n"),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to add plugin: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
