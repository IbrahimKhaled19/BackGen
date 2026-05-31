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

  // Check if route already registered
  if (appContent.includes(importName)) {
    throw new Error(`Route for ${resourceName} already registered`);
  }

  // Add import statement after last import
  const lastImportIndex = appContent.lastIndexOf("import ");
  const lastImportEnd = appContent.indexOf("\n", lastImportIndex);
  const importStatement = `import ${importName} from "${importPath}";`;

  // Add route registration before {{REGISTER_ROUTES}} marker
  const routeRegistration = `app.use("/api/${placeholders.resourcePlural}", ${importName});`;

  let updated = appContent;
  updated =
    updated.slice(0, lastImportEnd + 1) +
    importStatement +
    "\n" +
    updated.slice(lastImportEnd + 1);

  updated = updated.replace(
    "// {{REGISTER_ROUTES}}",
    routeRegistration + "\n  // {{REGISTER_ROUTES}}"
  );

  await fs.writeFile(appPath, updated, "utf-8");
}
