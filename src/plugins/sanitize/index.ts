import type { BackGenPlugin, InstallContext } from "../../core/plugin.js";

// V4.6.1: sanitize is shipped by default in the base template.
// Kept for manifest-compat with V4.6.0 projects.

export const sanitizePlugin: BackGenPlugin = {
  name: "sanitize",
  category: "production",
  description:
    "DEPRECATED: sanitize is now default in V4.6.1 (xss + express-mongo-sanitize). See V4.6.1 release notes.",
  version: "1.0.0",
  available: false,
  templates: [],

  async install(_ctx: InstallContext): Promise<void> {
    // No-op: V4.6.1 ships sanitize in the base template.
  },
};
