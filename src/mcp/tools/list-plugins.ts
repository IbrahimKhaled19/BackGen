import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listAvailablePlugins } from "../../core/plugin-registry.js";

/**
 * Register the list_plugins tool on the MCP server.
 * Lists all available BackGen plugins with their names, descriptions, and categories.
 *
 * The list is read from the plugin registry at call time so it can never drift
 * from the plugins the CLI can actually install.
 */
export function listPluginsTool(server: McpServer) {
  server.tool(
    "list_plugins",
    "List all installable BackGen plugins with their descriptions and categories. Call this first to show the user what features they can add, then call add_plugin with the chosen plugin name. Call list_presets to see domain presets.",
    {},
    async () => {
      const plugins = listAvailablePlugins();

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
              "**Usage:** Call `add_plugin` with the chosen plugin name, or run `backgen add <plugin>` in the terminal.",
              "**Conflict:** `jwt` and `clerk` cannot be installed together — pick one. `oauth2` requires `jwt` and works alongside it for social login.",
              "**Tip:** To install all DevOps plugins at once, run `backgen add devops`.",
              "",
              "**Next step:** Ask the user which plugin they'd like, then call add_plugin.",
            ].join("\n"),
          },
        ],
      };
    }
  );
}