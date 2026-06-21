import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runBackgen } from "../utils/run-backgen.js";

/**
 * Register the remove_plugin tool on the MCP server.
 * Removes a previously installed plugin from a BackGen-generated project.
 */
export function removePluginTool(server: McpServer) {
  server.tool(
    "remove_plugin",
    "Remove a plugin from an existing BackGen-generated project.",
    {
      plugin: z
        .enum(["jwt", "clerk", "stripe", "s3", "ratelimit", "ci-github", "dependabot", "codeql", "docker-registry", "release"])
        .describe("Plugin name to remove"),
      dir: z
        .string()
        .optional()
        .describe("Project directory (defaults to current working directory)"),
    },
    async ({ plugin, dir }) => {
      try {
        const output = runBackgen(["remove", plugin], dir);
        return {
          content: [{ type: "text", text: `✅ Plugin "${plugin}" removed.\n\n${output}` }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `❌ Failed to remove plugin: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
