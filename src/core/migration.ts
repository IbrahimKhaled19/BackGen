import type { ProjectManifest } from "./manifest.js";

export interface Migration {
  from: string;
  to: string;
  description: string;
  up: (projectDir: string, manifest: ProjectManifest) => Promise<void>;
}

export interface MigrationContext {
  projectDir: string;
  manifest: ProjectManifest;
}

/**
 * Compare two semver strings (e.g. "1.9.0" vs "1.10.0").
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const va = partsA[i] ?? 0;
    const vb = partsB[i] ?? 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}
