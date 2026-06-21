import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runBackgen } from "../utils/run-backgen.js";

/**
 * Register the generate_factory tool on the MCP server.
 * Generates a test factory for creating resource instances in tests.
 */
export function generateFactoryTool(server: McpServer) {
  server.tool(
    "generate_factory",
    "Generate a test factory for a resource.",
    {
      resource: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/).describe("Resource name (e.g. 'Product')"),
      dir: z.string().optional().describe("Project directory"),
    },
    async ({ resource, dir }) => {
      try {
        const output = runBackgen(["generate", "factory", resource], dir);
        return {
          content: [{ type: "text", text: `✅ Factory for "${resource}" generated.\n\n${output}` }],
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `❌ Failed: ${error.message}` }],
          isError: true,
        };
      }
    }
  );
}
