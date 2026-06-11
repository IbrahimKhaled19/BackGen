import type { DomainPreset } from "./registry.js";

/**
 * V9 SaaS Enterprise — production-grade SaaS foundation.
 *
 * Bundles saas-core (orgs, teams, memberships, invitations) +
 * billing (Subscription, Invoice, Plan) +
 * audit trail + stripe plugin.
 *
 * Use:
 *   backgen init my-app --preset saas-enterprise
 */
export const saasEnterprisePreset: DomainPreset = {
  name: "saas-enterprise",
  description:
    "Production SaaS: organizations, teams, memberships, invitations, subscriptions, invoicing, audit logging, Stripe payments",
  plugins: ["jwt", "stripe", "audit"],
  resources: [
    {
      name: "Organization",
      fields: ["name:string", "slug:string", "logo:string"],
      softDelete: true,
    },
    {
      name: "Team",
      fields: ["name:string", "description:string"],
      relations: ["organization:Organization"],
    },
    {
      name: "Membership",
      fields: ["role:string", "status:string"],
      relations: ["user:User", "organization:Organization"],
      softDelete: true,
    },
    {
      name: "Invitation",
      fields: [
        "email:string",
        "role:string",
        "status:string",
        "token:string:unique",
        "expiresAt:datetime",
      ],
      relations: ["organization:Organization", "invitedBy:User"],
    },
    {
      name: "Plan",
      fields: [
        "name:string",
        "slug:string:unique",
        "description:string",
        "price:number",
        "currency:string",
        "interval:string",
        "features:json",
      ],
    },
    {
      name: "Subscription",
      fields: ["plan:string", "status:string", "currentPeriodEnd:datetime"],
      relations: ["organization:Organization"],
    },
    {
      name: "Invoice",
      fields: ["amount:number", "status:string", "paidAt:datetime", "dueAt:datetime"],
      relations: ["organization:Organization"],
    },
  ],
};
