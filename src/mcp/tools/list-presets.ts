import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Register the list_presets tool on the MCP server.
 * Lists all available domain presets (saas-core, healthcare, ecommerce, etc.) with descriptions.
 */
export function listPresetsTool(server: McpServer) {
  server.tool(
    "list_presets",
    "List all available domain presets with their pre-built resources and relationships. Each preset generates multiple interconnected resources with database models, CRUD endpoints, and Swagger docs in a single command. Call this first to help the user choose the right domain, then call init_project with --preset to generate it. All presets auto-install JWT authentication and wire resources together with proper foreign keys.",
    {},
    async () => {
      return {
        content: [
          {
            type: "text",
            text: [
              "## Domain Presets",
              "",
              "| Preset | Best for | Resources |",
              "|--------|----------|-----------|",
              "| `saas-core` | Multi-tenant SaaS platforms | Organization, Membership, Invitation, Team, RBAC |",
              "| `saas` | Subscription-based businesses | Organization, Team, Membership, Subscription, Invoice |",
              "| `healthcare` | Medical / health platforms | Patient, Doctor, Appointment, Prescription, MedicalRecord |",
              "| `ecommerce` | Online stores / marketplaces | Category, Product, Cart, Order, OrderItem, Payment |",
              "| `crm` | Customer relationship management | Contact, Company, Deal, Activity |",
              "| `lms` | Learning management systems | Course, Lesson, Enrollment, Progress, Certificate |",
              "",
              "**Usage:** Call `init_project` with the --preset flag, e.g. `init_project(name: 'my-api', preset: 'healthcare')`.",
              "**Note:** All presets auto-install JWT auth and wire all resources together with foreign keys and Swagger docs.",
              "",
              "**Next step:** Ask the user which domain fits their project, then call init_project with the chosen preset.",
            ].join("\n"),
          },
        ],
      };
    }
  );
}
