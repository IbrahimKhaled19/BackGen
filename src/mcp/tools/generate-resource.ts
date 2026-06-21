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
    "Generates a full CRUD module for a resource — controller with 5 REST endpoints (GET /:id, GET /, POST, PATCH /:id, DELETE /:id), service layer with business logic, repository with database operations, Zod validation schemas, TypeScript interfaces, route definitions auto-registered in the Express app with Swagger/OpenAPI docs, and a test file. If fields are not provided, the CLI will prompt interactively (use non-interactive mode by passing fields directly). Relations create foreign key columns in the database and populate the Prisma/Drizzle/Mongoose schema with the correct association types (belongsTo for singular, hasMany for plural relation names). Run add_plugin first if you need auth protection on the generated endpoints.",
    {
      name: z
        .string()
        .regex(/^[A-Z][a-zA-Z0-9]+$/)
        .describe("Resource name in PascalCase, 2+ characters, must start with an uppercase letter. Examples: 'Product', 'OrderItem', 'MedicalRecord'. This becomes the module directory name, database table name, and all class/file names."),
      fields: z
        .string()
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*(string|number|boolean|date)(\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*(string|number|boolean|date))*$/)
        .optional()
        .describe('Comma-separated field definitions in "name:type" format. Supported types: string, number, boolean, date. Examples: "name:string,price:number,isActive:boolean" or "email:string,age:number". Can be omitted for interactive mode.'),
      relations: z
        .string()
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*[A-Z][a-zA-Z0-9_]*(\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*[A-Z][a-zA-Z0-9_]*)*$/)
        .optional()
        .describe('Comma-separated relation definitions in "name:RelatedResource" format. Singular names (e.g., "doctor:Doctor") create a belongsTo foreign key. Plural names (e.g., "patients:Patient") create a hasMany inverse. Examples: "doctor:Doctor,patient:Patient" or "category:Category". The related resource must already exist.'),
      dir: z
        .string()
        .optional()
        .describe("Absolute or relative path to the BackGen-generated project directory where the resource module will be created. Defaults to current working directory. Example: '/home/user/projects/my-api'."),
    },
    async ({ name, fields, relations, dir }) => {
      const args = ["generate", "resource", name];
      if (fields) args.push("--fields", fields);
      if (relations) args.push("--relations", relations);

      try {
        const output = runBackgen(args, dir);
        const moduleName = name.toLowerCase();
        return {
          content: [
            {
              type: "text",
              text: [
                `✅ CRUD resource "${name}" generated.`,
                "",
                `📁 Module: src/modules/${moduleName}/`,
                `   ├── ${moduleName}.controller.ts   # 5 REST endpoints`,
                `   ├── ${moduleName}.service.ts       # Business logic`,
                `   ├── ${moduleName}.repository.ts     # Database operations`,
                `   ├── ${moduleName}.validation.ts     # Zod schemas`,
                `   ├── ${moduleName}.types.ts          # TypeScript interfaces`,
                `   ├── ${moduleName}.routes.ts         # Route definitions + Swagger`,
                `   └── ${moduleName}.test.ts           # Test placeholder`,
                "",
                "🌐 API endpoints (auto-registered):",
                `  GET    /api/${moduleName}        # List all`,
                `  GET    /api/${moduleName}/:id    # Get by ID`,
                `  POST   /api/${moduleName}        # Create`,
                `  PATCH  /api/${moduleName}/:id    # Update`,
                `  DELETE /api/${moduleName}/:id    # Delete`,
                "",
                output,
              ].join("\n"),
            },
          ],
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
