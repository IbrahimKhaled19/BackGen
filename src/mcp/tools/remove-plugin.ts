import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runBackgen } from "../utils/run-backgen.js";

/**
 * Register the remove_plugin tool on the MCP server.
 * Removes a previously installed plugin from a BackGen-generated project.
 * Destructive but safe — only removes plugin-owned files and dependencies.
 */
export function removePluginTool(server: McpServer) {
  server.tool(
    "remove_plugin",
    "Removes a previously installed plugin from a BackGen-generated project. This is a destructive but safe operation: it deletes plugin-owned source files (controllers, routes, middleware), removes npm dependencies, strips injected environment variables from .env, reverts route registrations in app.ts, and removes the plugin entry from .backgenrc.json. User-owned files are never touched. Only files that the plugin originally installed are affected. Use this to undo an add_plugin command, switch auth providers (e.g. jwt → clerk), or clean up unused features. Run doctor afterwards to verify the project is healthy after removal. Run list_plugins first to see what's currently installed. Use add_plugin if you want to install (not remove) a plugin.",
    {
      plugin: z
        .enum(["jwt", "clerk", "stripe", "s3", "ratelimit", "ci-github", "dependabot", "codeql", "docker-registry", "release"])
        .describe(
          "Plugin to remove. Categories: auth (jwt, clerk — mutually exclusive, safe to swap by removing one then adding the other), payment (stripe), storage (s3), production (ratelimit), devops (ci-github, dependabot, codeql, docker-registry, release — remove all with 'backgen remove devops' shorthand). Use list_plugins first to see which plugins are currently installed in the project."
        ),
      dir: z
        .string()
        .optional()
        .describe("Absolute or relative path to the existing BackGen-generated project directory. Defaults to the current working directory. Must be a valid BackGen project with a .backgenrc.json manifest. Example: '/home/user/projects/my-api'."),
    },
    async ({ plugin, dir }) => {
      try {
        const output = runBackgen(["remove", plugin], dir);
        return {
          content: [
            {
              type: "text",
              text: [
                `✅ Plugin "${plugin}" removed successfully.`,
                "",
                "📋 What was cleaned up:",
                "  • Plugin source files deleted",
                "  • npm dependencies uninstalled",
                "  • Environment variables removed from .env",
                "  • Routes unregistered from app.ts",
                "  • Manifest entry removed from .backgenrc.json",
                "",
                "📌 Recommended next step:",
                "  Run backgen doctor to verify the project is in a healthy state after removal.",
                "",
                output,
              ].join("\n"),
            },
          ],
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
