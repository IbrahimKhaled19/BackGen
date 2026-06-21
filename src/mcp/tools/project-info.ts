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
    "Read the .backgenrc.json manifest of a BackGen-generated project. Shows ORM, plugins, versions, and file ownership.",
    {
      dir: z.string().optional().describe("Project directory"),
    },
    async ({ dir }) => {
      try {
        const output = runBackgen(["doctor"], dir);
        return {
          content: [{ type: "text", text: `📋 Project info:\n\n${output}` }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `❌ Not a BackGen project: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
