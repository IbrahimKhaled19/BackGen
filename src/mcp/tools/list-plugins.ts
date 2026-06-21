import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Register the list_plugins tool on the MCP server.
 * Lists all available BackGen plugins with their names, descriptions, and categories.
 */
export function listPluginsTool(server: McpServer) {
  server.tool(
    "list_plugins",
    "List all available BackGen plugins with descriptions and categories.",
    {},
    async () => {
      const plugins = [
        { name: "jwt", category: "auth", description: "JWT authentication with refresh tokens" },
        { name: "clerk", category: "auth", description: "Clerk auth-as-a-service (conflicts with jwt)" },
        { name: "stripe", category: "payment", description: "Stripe checkout, webhooks, customers" },
        { name: "s3", category: "storage", description: "AWS S3 upload, download, presigned URLs" },
        { name: "ratelimit", category: "production", description: "Per-IP rate limiting with Redis-ready store" },
        { name: "ci-github", category: "devops", description: "GitHub Actions CI pipeline" },
        { name: "dependabot", category: "devops", description: "Automated dependency updates" },
        { name: "codeql", category: "devops", description: "CodeQL security analysis" },
        { name: "docker-registry", category: "devops", description: "Docker build & publish to GHCR" },
        { name: "release", category: "devops", description: "Semantic release with npm publish" },
      ];

      const table = plugins
        .map((p) => `| \`${p.name}\` | ${p.category} | ${p.description} |`)
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: [
              "## Available Plugins",
              "",
              "| Plugin | Category | Description |",
              "|--------|----------|-------------|",
              table,
              "",
              "**Usage:** `backgen add <plugin>` or ask an AI agent to run `add_plugin`.",
              "**Conflict:** `jwt` and `clerk` cannot be installed together.",
            ].join("\n"),
          },
        ],
      };
    }
  );
}
