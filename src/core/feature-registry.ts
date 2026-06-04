export interface FeatureDefinition {
  name: string;
  description: string;
  available: boolean;
  templates: string[];
}

export const FEATURES: Record<string, FeatureDefinition> = {
  auth: {
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
      "src/middleware/core/validate.ts.hbs",
      "src/middleware/core/errors.ts.hbs",
    ],
  },
  payment: {
    name: "payment",
    description: "Payment integration (Stripe, PayPal)",
    available: false,
    templates: [],
  },
  storage: {
    name: "storage",
    description: "File storage (Cloudinary, S3)",
    available: false,
    templates: [],
  },
  notification: {
    name: "notification",
    description: "Notifications (Email, SMS, Push)",
    available: false,
    templates: [],
  },
};

export function getFeature(name: string): FeatureDefinition | undefined {
  return FEATURES[name];
}

export function listAvailableFeatures(): FeatureDefinition[] {
  return Object.values(FEATURES).filter((f) => f.available);
}
