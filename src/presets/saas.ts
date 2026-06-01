import type { DomainPreset } from "./registry.js";

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
