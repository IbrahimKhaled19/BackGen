import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runBackgen } from "../utils/run-backgen.js";

/**
 * Register the project_info tool on the MCP server.
 * Returns project metadata from the manifest: name, ORM, preset, plugins, and versions.
 */
export function projectInfoTool(server: McpServer) {
  server.tool(
    "project_info",
    "Runs 6-category diagnostics on a BackGen-generated project and returns a structured report covering Node.js version, npm availability, .env configuration, database connection (Prisma/Drizzle/Mongoose), dependency integrity, file ownership classification, and manifest data from .backgenrc.json. Use this BEFORE or AFTER making changes to verify the project is in a valid state. Read-only — never modifies any files. For a focused health check with auto-fix capability, use doctor instead.",
    {
      dir: z
        .string()
        .optional()
        .describe("Absolute or relative path to the BackGen-generated project directory. Defaults to the current working directory. Must contain a valid .backgenrc.json file. Example: '/home/user/projects/my-api'."),
    },
    async ({ dir }) => {
      try {
        const output = runBackgen(["doctor"], dir);
        return {
          content: [
            {
              type: "text",
              text: [
                "📋 **Project Diagnostics Report**",
                "",
                "Categories checked: Runtime, Configuration, Database, Dependencies, File Integrity, Ownership",
                "",
                output,
              ].join("\n"),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `❌ Not a valid BackGen project: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
