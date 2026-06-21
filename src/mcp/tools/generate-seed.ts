import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runBackgen } from "../utils/run-backgen.js";

/**
 * Register the generate_seed tool on the MCP server.
 * Generates a database seed file for populating a resource with development data.
 */
export function generateSeedTool(server: McpServer) {
  server.tool(
    "generate_seed",
    "Generate seed data file for a resource.",
    {
      resource: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/).describe("Resource name (e.g. 'Product')"),
      count: z.number().int().min(1).max(1000).default(10).describe("Number of seed records"),
      dir: z.string().optional().describe("Project directory"),
    },
    async ({ resource, count, dir }) => {
      try {
        const output = runBackgen(["generate", "seed", resource, "--count", String(count)], dir);
        return {
          content: [{ type: "text", text: `✅ Seed data for "${resource}" generated.\n\n${output}` }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `❌ Failed: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
