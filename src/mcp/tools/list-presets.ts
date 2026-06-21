import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Register the list_presets tool on the MCP server.
 * Lists all available domain presets (saas-core, healthcare, ecommerce, etc.) with descriptions.
 */
export function listPresetsTool(server: McpServer) {
  server.tool(
    "list_presets",
    "List all available domain presets with their included resources.",
    {},
    async () => {
      return {
        content: [
          {
            type: "text",
            text: [
              "## Domain Presets",
              "",
              "| Preset | Resources |",
              "|--------|-----------|",
              "| `saas-core` | Organization, Membership, Invitation, Team, RBAC |",
              "| `saas` | Organization, Team, Membership, Subscription, Invoice |",
              "| `healthcare` | Patient, Doctor, Appointment, Prescription, MedicalRecord |",
              "| `ecommerce` | Category, Product, Cart, Order, OrderItem, Payment |",
              "| `crm` | Contact, Company, Deal, Activity |",
              "| `lms` | Course, Lesson, Enrollment, Progress, Certificate |",
              "",
              "**Usage:** `backgen init my-api --preset <name>`",
              "**Note:** Presets auto-install JWT auth and wire everything together.",
            ].join("\n"),
          },
        ],
      };
    }
  );
}
