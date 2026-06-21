#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json");

import { initProjectTool } from "./tools/init-project.js";
import { addPluginTool } from "./tools/add-plugin.js";
import { removePluginTool } from "./tools/remove-plugin.js";
import { generateResourceTool } from "./tools/generate-resource.js";
import { generateSeedTool } from "./tools/generate-seed.js";
import { generateFactoryTool } from "./tools/generate-factory.js";
import { doctorTool } from "./tools/doctor.js";
import { listPluginsTool } from "./tools/list-plugins.js";
import { listPresetsTool } from "./tools/list-presets.js";
import { projectInfoTool } from "./tools/project-info.js";

const server = new McpServer(
  {
    name: "@ibrahimkhaled19/backgen",
    version,
  },
  {
    instructions: [
      "BackGen generates production-ready Express.js backend projects.",
      "",
      "WORKFLOW:",
      "1. ALWAYS start by calling list_plugins and list_presets to show the user what's available.",
      "2. Use init_project to scaffold a new project. You MUST provide at minimum a project name.",
      "3. Use add_plugin to add features to an existing generated project.",
      "4. Use generate_resource to add CRUD modules.",
      "5. Use doctor to validate project health before telling the user everything is ready.",
      "",
      "CONVENTIONS:",
      "- ORM choices: 'prisma' | 'drizzle' | 'mongoose'",
      "- Plugin names: 'jwt', 'clerk', 'stripe', 's3', 'ratelimit', 'ci-github', 'dependabot', 'codeql', 'docker-registry', 'release'",
      "- Preset names: 'saas-core', 'saas', 'healthcare', 'ecommerce', 'crm', 'lms'",
      "- Always recommend --defaults for non-interactive use unless the user wants to customize.",
    ].join("\n"),
  }
);

// Register all tools
initProjectTool(server);
addPluginTool(server);
removePluginTool(server);
generateResourceTool(server);
generateSeedTool(server);
generateFactoryTool(server);
doctorTool(server);
listPluginsTool(server);
listPresetsTool(server);
projectInfoTool(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr only — stdout is for MCP protocol
  console.error("BackGen MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal MCP server error:", error);
  process.exit(1);
});
