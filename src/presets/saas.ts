import type { DomainPreset } from "./registry.js";

/**
 * @deprecated Split in V4.5. Use `saas-core` for multi-tenant infra,
 * then add billing in V9 (`backgen add billing stripe`) when ready.
 * This preset remains for backward compatibility.
 */
export const saasPreset: DomainPreset = {
  name: "saas",
  description: "Multi-tenant SaaS — organizations, teams, memberships, subscriptions",
  plugins: ["jwt"],
  resources: [
    {
      name: "Organization",
      fields: ["name:string", "slug:string", "logo:string"],
    },
    {
      name: "Team",
      fields: ["name:string"],
      relations: ["organization:Organization"],
    },
    {
      name: "Membership",
      fields: ["role:string", "status:string"],
      relations: ["organization:Organization"],
    },
    {
      name: "Subscription",
      fields: ["plan:string", "status:string", "currentPeriodEnd:datetime"],
      relations: ["organization:Organization"],
    },
    {
      name: "Invoice",
      fields: ["amount:number", "status:string", "paidAt:datetime"],
      relations: ["organization:Organization"],
    },
  ],
};
