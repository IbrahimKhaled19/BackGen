import type { BackGenPlugin, InstallContext } from "../../core/plugin.js";

// V4.6.1: hardening is shipped by default in the base template.
// This plugin manifest is kept for manifest-compat with V4.6.0 projects.
// `backgen add hardening` is hidden from the picker; `backgen sync` is a no-op.

export const hardeningPlugin: BackGenPlugin = {
  name: "hardening",
  category: "production",
  description:
    "DEPRECATED: hardening is now default in V4.6.1 (request ID, strict CORS, body size limit, request timeout, /ready endpoint, graceful shutdown, error envelope). See V4.6.1 release notes.",
  version: "1.0.0",
  available: false,
  templates: [],

  async install(_ctx: InstallContext): Promise<void> {
    // No-op: V4.6.1 ships these features in the base template.
  },
};
