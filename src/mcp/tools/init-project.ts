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
    "Creates a new backend project directory with Express.js + TypeScript strict mode, ORM data layer (Prisma/Drizzle/Mongoose), Zod env validation, Swagger docs, Docker, ESLint, Vitest, and a .backgenrc.json manifest. Run add_plugin afterwards to add auth, payments, storage, rate-limiting, or CI/CD. Run generate_resource to add CRUD modules. Use --preset to generate a full domain (healthcare/saas/ecommerce/crm/lms) with pre-built resources and auto-installed JWT auth in one command. Call list_presets first to see what each domain preset includes. Typical generation takes 10–30 seconds with npm install being the longest step.",
    {
      name: z
        .string()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/)
        .describe("Project name — used as the directory name and npm package name. Must start with a letter or number. Hyphens and underscores allowed. Examples: 'my-api', 'saas-backend', 'healthcare-api'."),
      orm: z
        .enum(["prisma", "drizzle", "mongoose"])
        .default("prisma")
        .describe("Database ORM. prisma (PostgreSQL/MySQL/SQLite, recommended for relational), drizzle (lightweight SQL, closer-to-SQL control), mongoose (MongoDB, document-oriented). Defaults to prisma if not specified."),
      preset: z
        .enum(["saas-core", "saas", "healthcare", "ecommerce", "crm", "lms"])
        .optional()
        .describe("Domain preset that generates multiple pre-wired resources in one command. Auto-installs JWT auth. Call list_presets first to see what each preset includes. Examples: 'saas-core' for multi-tenant orgs, 'healthcare' for patient/doctor/appointment."),
      defaults: z
        .boolean()
        .default(true)
        .describe("Use default options (non-interactive). Recommended for AI use and automation. Set to false only if you want to prompt the user for each choice interactively."),
      skipInstall: z
        .boolean()
        .default(false)
        .describe("Skip npm install. Use true for CI pipelines, quick scaffolding demos, or when you want to install dependencies later manually. When true, remind the user to run 'npm install' before 'npm run dev'."),
      dir: z
        .string()
        .optional()
        .describe("Absolute or relative path to the parent directory where the project folder will be created. Defaults to the current working directory. Example: '/home/user/projects' or 'C:\\Users\\me\\projects'."),
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
                preset ? `📦 Preset: ${preset} (JWT auth auto-installed)` : `🔐 No preset — run 'backgen add jwt' or 'backgen add clerk' to add auth`,
                "",
                "📋 Immediate next steps:",
                `  cd ${name}`,
                !skipInstall ? "  npm run dev    # starts dev server with hot reload" : "  npm install && npm run dev",
                "",
                "📌 Later — extend with plugins:",
                "  backgen add stripe         # payments",
                "  backgen add s3              # file storage",
                "  backgen add ratelimit       # rate limiting",
                "  backgen generate resource Product name:string price:number",
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
