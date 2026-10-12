import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runBackgen } from "../utils/run-backgen.js";
import { toCamelCase, toPascalCase } from "../../core/string-utils.js";

/**
 * Register the generate_job tool on the MCP server.
 * Creates background job handler files using the worker plugin system.
 */
export function generateJobTool(server: McpServer) {
  server.tool(
    "generate_job",
    "Generates a background job handler in an existing BackGen-generated project that has the worker plugin installed. Creates a job handler file with type-safe payload interface, registerJob() call, base handler class with retry/exponential backoff, and a dispatch helper function. Also generates a test file with a passing test skeleton. The worker plugin must be installed first via add_plugin(worker).",
    {
      name: z
        .string()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/)
        .describe("Job name in kebab-case. Examples: 'send-email', 'process-video', 'cleanup-sessions'. Must be unique within the project."),
      queue: z
        .string()
        .default("default")
        .describe("Queue name to route this job to. Use different queues for different job categories (e.g. 'emails', 'media', 'billing')."),
      retry: z
        .number()
        .int()
        .min(0)
        .max(20)
        .default(3)
        .describe("Number of retry attempts on failure (default: 3)."),
      timeout: z
        .number()
        .int()
        .min(1000)
        .max(300000)
        .default(30000)
        .describe("Job timeout in milliseconds (default: 30000 — 30 seconds)."),
      dir: z
        .string()
        .optional()
        .describe("Absolute or relative path to the existing BackGen-generated project directory. Defaults to the current working directory."),
    },
    async ({ name, queue, retry, timeout, dir }) => {
      const args = ["generate", "job", name, "--queue", queue, "--retry", String(retry), "--timeout", String(timeout)];

      // Jobs are written next to the worker module, camelCased from the CLI name
      const moduleName = toCamelCase(name);

      try {
        const output = runBackgen(args, dir);
        return {
          content: [
            {
              type: "text",
              text: [
                `✅ Job "${name}" generated!`,
                "",
                `📁 Location: src/modules/worker/${moduleName}.ts`,
                `⚙️  Queue: ${queue}`,
                `🔄 Retry: ${retry}`,
                `⏱️  Timeout: ${timeout}ms`,
                "",
                "📋 Next steps:",
                `  1. Edit src/modules/worker/${moduleName}.ts — add your payload fields to the payload interface`,
                `  2. Implement business logic in the handle() method (inside // BACKGEN:START/END blocks)`,
                `  3. Dispatch from controllers: await dispatch${toPascalCase(name)}({ ... })`,
                `  4. Test: npm run test -- src/modules/worker/${moduleName}.test.ts`,
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
              text: `❌ Failed to generate job: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
