import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runBackgen } from "../utils/run-backgen.js";

/**
 * Register the init_project tool on the MCP server.
 * Scaffolds a new Express.js + TypeScript backend project with the chosen ORM, preset, and plugins.
 */
export function initProjectTool(server: McpServer) {
  server.tool(
    "init_project",
    "Scaffold a new production-ready backend project. Generates Express.js + TypeScript with the chosen ORM, preset, and plugins.",
    {
      name: z
        .string()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/)
        .describe("Project name (used as directory name and package name)"),
      orm: z
        .enum(["prisma", "drizzle", "mongoose"])
        .default("prisma")
        .describe("Database ORM to use"),
      preset: z
        .enum(["saas-core", "saas", "healthcare", "ecommerce", "crm", "lms"])
        .optional()
        .describe("Domain preset with pre-built resources"),
      defaults: z
        .boolean()
        .default(true)
        .describe("Use default options (non-interactive). Recommended for AI use."),
      skipInstall: z
        .boolean()
        .default(false)
        .describe("Skip npm install (for CI or quick scaffolding)"),
      dir: z
        .string()
        .optional()
        .describe("Directory to create the project in (defaults to current working directory)"),
    },
    async ({ name, orm, preset, defaults, skipInstall, dir }) => {
      const args = ["init", name, "--orm", orm];
      if (preset) args.push("--preset", preset);
      if (defaults) args.push("--defaults");
      if (skipInstall) args.push("--skip-install");

      try {
        const output = runBackgen(args, dir);
        return {
          content: [
            {
              type: "text",
              text: [
                `✅ Project "${name}" created successfully!`,
                "",
                `📁 Location: ${dir || process.cwd()}/${name}`,
                `🛠️  ORM: ${orm}`,
                preset ? `📦 Preset: ${preset}` : null,
                "",
                "📋 Next steps:",
                `  cd ${name}`,
                !skipInstall ? "  npm run dev" : "  npm install",
                "",
                output,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to create project: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
