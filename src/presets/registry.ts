export interface ResourcePreset {
  name: string;
  fields: string[];
  relations?: string[];
}

export interface DomainPreset {
  name: string;
  description: string;
  resources: ResourcePreset[];
  plugins?: string[];
}

import { healthcarePreset } from "./healthcare.js";
import { saasPreset } from "./saas.js";
import { ecommercePreset } from "./ecommerce.js";
import { crmPreset } from "./crm.js";
import { lmsPreset } from "./lms.js";

const PRESETS: Record<string, DomainPreset> = {
  healthcare: healthcarePreset,
  saas: saasPreset,
  ecommerce: ecommercePreset,
  crm: crmPreset,
  lms: lmsPreset,
};

export function getPreset(name: string): DomainPreset | undefined {
  return PRESETS[name];
}

export function listPresets(): DomainPreset[] {
  return Object.values(PRESETS);
}
