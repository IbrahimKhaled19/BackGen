import * as fs from "fs/promises";
import * as path from "path";
import { TemplateEngine } from "./template-engine.js";
import { registerRoute } from "./route-registrar.js";
import type { FeatureDefinition } from "./feature-registry.js";

const TEMPLATES_DIR = path.resolve(import.meta.dirname, "../../templates/express");

export async function installFeature(
  projectDir: string,
  feature: FeatureDefinition
): Promise<void> {
  const engine = new TemplateEngine(TEMPLATES_DIR);
  const context = { projectName: path.basename(projectDir) };

  // Copy feature templates
  for (const template of feature.templates) {
    const outputPath = path.join(projectDir, template.replace(".hbs", ""));
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    await engine.renderToFile(template, context, outputPath);
  }

  // Register routes if the feature has routes
  const routeTemplate = feature.templates.find((t) => t.includes(".routes.ts.hbs"));
  if (routeTemplate) {
    const routeName = feature.name;
    await registerRoute(projectDir, routeName);
  }
}

export async function isFeatureInstalled(
  projectDir: string,
  featureName: string
): Promise<boolean> {
  const moduleDir = path.join(projectDir, "src", "modules", featureName);
  try {
    await fs.access(moduleDir);
    return true;
  } catch {
    return false;
  }
}
