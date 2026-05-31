import { FeatureDefinition } from "../core/feature-registry.js";

export const authFeature: FeatureDefinition = {
  name: "auth",
  description: "JWT authentication with refresh tokens",
  available: true,
  templates: [
    "src/modules/auth/auth.types.ts.hbs",
    "src/modules/auth/auth.validation.ts.hbs",
    "src/modules/auth/auth.controller.ts.hbs",
    "src/modules/auth/auth.service.ts.hbs",
    "src/modules/auth/auth.routes.ts.hbs",
    "src/modules/auth/auth.test.ts.hbs",
    "src/middleware/auth.ts.hbs",
    "src/middleware/validate.ts.hbs",
    "src/middleware/error.ts.hbs",
  ],
};
