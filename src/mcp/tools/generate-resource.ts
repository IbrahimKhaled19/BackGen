import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runBackgen } from "../utils/run-backgen.js";

/**
 * Register the generate_resource tool on the MCP server.
 * Generates a CRUD resource with fields, relations, Zod validation, Swagger docs, and tests.
 */
export function generateResourceTool(server: McpServer) {
  server.tool(
    "generate_resource",
    "Generate a CRUD resource module (controller, service, repository, validation, types, routes, test).",
    {
      name: z.string().regex(/^[A-Z][a-zA-Z0-9]+$/).describe("Resource name (PascalCase, e.g. 'Product')"),
      fields: z
        .string()
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*(string|number|boolean|date)(\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*(string|number|boolean|date))*$/)
        .optional()
        .describe('Fields as "name:string,price:number,isActive:boolean"'),
      relations: z
        .string()
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*[A-Z][a-zA-Z0-9_]*(\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*[A-Z][a-zA-Z0-9_]*)*$/)
        .optional()
        .describe('Relations as "doctor:Doctor,patient:Patient"'),
      dir: z
        .string()
        .optional()
        .describe("Project directory"),
    },
    async ({ name, fields, relations, dir }) => {
      const args = ["generate", "resource", name];
      if (fields) args.push("--fields", fields);
      if (relations) args.push("--relations", relations);

      try {
        const output = runBackgen(args, dir);
        return {
          content: [{ type: "text", text: `✅ Resource "${name}" generated.\n\n${output}` }],
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
