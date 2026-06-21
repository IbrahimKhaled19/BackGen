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
    "Runs 6 health check categories against a BackGen-generated project and returns a structured pass/fail report for each one. (1) Runtime — Node version >= 18, npm availability. (2) Configuration — .env exists, DATABASE_URL is set, all required env vars from installed plugins are present. (3) Database — Prisma schema / Drizzle config / Mongoose connection string is reachable. (4) Dependencies — package.json deps match installed node_modules, no missing peer deps. (5) File integrity — every file tracked in .backgenrc.json exists on disk with the correct ownership classification (framework vs user). (6) Ownership — all files are properly classified as framework/shared/user, no orphaned plugins. Run this tool BEFORE telling the user that a project is ready to use. Use --fix to auto-resolve missing manifest entries and file ownership issues.",
    {
      fix: z
        .boolean()
        .default(false)
        .describe("Auto-fix issues where possible. When true, doctor will regenerate missing manifest entries, fix ownership classifications, and restore tracked files that are missing from disk. Safe to enable — never touches user-owned files (only framework and shared files)."),
      dir: z
        .string()
        .optional()
        .describe("Absolute or relative path to the BackGen-generated project to diagnose. Defaults to the current working directory. Example: '/home/user/projects/my-api'."),
    },
    async ({ fix, dir }) => {
      const args = ["doctor"];
      if (fix) args.push("--fix");

      try {
        const output = runBackgen(args, dir);
        return {
          content: [
            {
              type: "text",
              text: [
                "🏥 **Doctor Report**",
                "",
                fix ? "🔧 Auto-fix mode was enabled — any resolvable issues have been corrected." : "ℹ️ Run with --fix to auto-resolve manifest and file integrity issues.",
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
              text: `❌ Doctor check failed: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
