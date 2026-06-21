import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runBackgen } from "../utils/run-backgen.js";

/**
 * Register the doctor tool on the MCP server.
 * Validates an existing BackGen-generated project for configuration issues, missing files, and dependency conflicts.
 */
export function doctorTool(server: McpServer) {
  server.tool(
    "doctor",
    "Run health checks on a BackGen-generated project. Checks Node version, .env, database, dependencies, file integrity, and ownership.",
    {
      fix: z.boolean().default(false).describe("Auto-fix issues where possible"),
      dir: z.string().optional().describe("Project directory"),
    },
    async ({ fix, dir }) => {
      const args = ["doctor"];
      if (fix) args.push("--fix");

      try {
        const output = runBackgen(args, dir);
        return {
          content: [{ type: "text", text: `🏥 Doctor report:\n\n${output}` }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `❌ Doctor check failed: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
