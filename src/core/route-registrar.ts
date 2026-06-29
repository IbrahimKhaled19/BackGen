import * as fs from "fs/promises";
import * as path from "path";
import { createPlaceholders } from "./placeholders.js";

export async function registerRoute(
  projectDir: string,
  resourceName: string
): Promise<void> {
  const appPath = path.join(projectDir, "src", "app.ts");
  const appContent = await fs.readFile(appPath, "utf-8");

  const placeholders = createPlaceholders(resourceName);
  const importName = `${placeholders.resourceName}Routes`;
  const importPath = `./modules/${placeholders.resourceName}/${placeholders.resourceName}.routes.js`;

  if (appContent.includes(importName)) {
    throw new Error(`Route for ${resourceName} already registered`);
  }

  const marker = "// {REGISTER_ROUTES}";
  const markerIndex = appContent.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error("Missing REGISTER_ROUTES marker in app.ts");
  }

  const importsSection = appContent.slice(0, markerIndex);
  const lastImportIndex = importsSection.lastIndexOf("import ");
  const lastImportEnd = importsSection.indexOf("\n", lastImportIndex);
  const importStatement = `import ${importName} from "${importPath}";`;

  const routeRegistration = `app.use("/api/${placeholders.resourcePlural}", ${importName});`;

  let updated = appContent;

  if (lastImportIndex !== -1 && lastImportEnd !== -1) {
    updated =
      updated.slice(0, lastImportEnd + 1) +
      importStatement +
      "\n" +
      updated.slice(lastImportEnd + 1);
  }

  updated = updated.replace(
    marker,
    routeRegistration + "\n  " + marker
  );

  await fs.writeFile(appPath, updated, "utf-8");
}
