export interface ResourcePreset {
  name: string;
  fields: string[];
  relations?: string[];
  softDelete?: boolean;
}

export interface DomainPreset {
  name: string;
  description: string;
  resources: ResourcePreset[];
  plugins?: string[];
}

import { healthcarePreset } from "./healthcare.js";
import { saasPreset } from "./saas.js";
import { saasCorePreset } from "./saas-core.js";
import { ecommercePreset } from "./ecommerce.js";
import { crmPreset } from "./crm.js";
import { lmsPreset } from "./lms.js";
import { saasEnterprisePreset } from "./saas-enterprise.js";

const PRESETS: Record<string, DomainPreset> = {
  healthcare: healthcarePreset,
  saas: saasPreset,
  "saas-core": saasCorePreset,
  ecommerce: ecommercePreset,
  crm: crmPreset,
  lms: lmsPreset,
  "saas-enterprise": saasEnterprisePreset,
};

export function getPreset(name: string): DomainPreset | undefined {
  return PRESETS[name];
}

export function listPresets(): DomainPreset[] {
  return Object.values(PRESETS);
}
