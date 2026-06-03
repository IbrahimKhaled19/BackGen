import type { DomainPreset } from "./registry.js";

/**
 * V4.5 SaaS Core — multi-tenant foundation.
 *
 * Includes:
 *   - Organization (soft-delete): tenant root
 *   - Team: optional sub-grouping
 *   - Membership (soft-delete): user <-> org, with role
 *   - Invitation: email-based invite flow
 *
 * Excludes (V9 Enterprise):
 *   - Subscription, Invoice, billing
 *   - Audit log, feature flags
 *
 * Auth-aware: when applied, checks manifest for jwt/clerk plugin.
 * If neither present, Membership and Invitation are skipped because they
 * reference the User model which auth plugins create. Re-run
 * `backgen sync` after `backgen add jwt` to install them.
 */
export const saasCorePreset: DomainPreset = {
  name: "saas-core",
  description:
    "Multi-tenant SaaS foundation: organizations, teams, memberships, invitations, and RBAC. No billing (V9).",
  resources: [
    {
      name: "Organization",
      fields: ["name:string", "slug:string:unique", "logo:string"],
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
  ],
};
