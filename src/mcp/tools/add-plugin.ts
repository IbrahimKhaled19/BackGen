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
    "Install a plugin into an existing BackGen-generated project. Adds files, env vars, npm deps, and updates the manifest.",
    {
      plugin: z
        .enum(["jwt", "clerk", "stripe", "s3", "ratelimit", "ci-github", "dependabot", "codeql", "docker-registry", "release"])
        .describe(
          "Plugin name. Options: jwt, clerk, stripe, s3, ratelimit, ci-github, dependabot, codeql, docker-registry, release"
        ),
      dir: z
        .string()
        .optional()
        .describe("Project directory (defaults to current working directory)"),
    },
    async ({ plugin, dir }) => {
      const args = ["add", plugin];

      try {
        const output = runBackgen(args, dir);
        return {
          content: [
            {
              type: "text",
              text: `✅ Plugin "${plugin}" installed.\n\n${output}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to add plugin: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
