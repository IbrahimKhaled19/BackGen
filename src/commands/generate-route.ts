import inquirer from "inquirer";
import chalk from "chalk";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { TemplateEngine } from "../core/template-engine.js";
import { readManifest } from "../core/manifest.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.resolve(__dirname, "../../templates/express");

const ROUTE_TEMPLATES = [
  "src/modules/route/route.types.ts.hbs",
  "src/modules/route/route.validation.ts.hbs",
  "src/modules/route/route.service.ts.hbs",
  "src/modules/route/route.controller.ts.hbs",
  "src/modules/route/route.routes.ts.hbs",
];

export interface GenerateRouteOptions {
  methods?: string;
  auth?: boolean;
}

/**
 * Generate a custom route module in the project.
 *
 * Creates a full route scaffold under `src/modules/<name>/` with:
 *   - controller, service, validation, types, and route files
 *   - Handlebars-rendered from built-in templates
 *   - Swagger/OpenAPI annotations in the route file
 *
 * Registers the new route in `src/app.ts` by:
 *   - Adding an `import` statement after the last existing import
 *   - Mounting the router at `/api/<name>` before the `// {{REGISTER_ROUTES}}` marker
 *
 * When called without a name argument, prompts interactively.
 * If the module directory already exists, prompts before overwriting.
 */
export async function generateRouteCommand(
  name: string | undefined,
  _options: GenerateRouteOptions
): Promise<void> {
  const projectDir = process.cwd();
  const manifest = await readManifest(projectDir);
  if (!manifest) {
    console.error(chalk.red("No BackGen manifest found. Run this from a generated project."));
    process.exit(1);
  }

  // Interactive prompt if name not provided
  if (!name) {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "Route name (kebab-case):",
        validate: (v: string) => (v ? true : "Route name is required"),
      },
    ]);
    name = answers.name;
  }

  // Derive names (name is guaranteed defined after prompt above)
  const routeName = name!;
  const resourceName = toPascalCase(routeName);
  const routePath = routeName;
  const moduleDir = path.join(projectDir, "src", "modules", routeName);
  const templateEngine = new TemplateEngine(TEMPLATES_DIR);

  // Check for existing route
  try {
    await fs.access(moduleDir);
    const { overwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "overwrite",
        message: `Route "${name}" already exists. Overwrite?`,
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log(chalk.yellow("Aborted."));
      return;
    }
  } catch {
    // Directory doesn't exist — good
  }

  await fs.mkdir(moduleDir, { recursive: true });

  // Render and write each template
  for (const template of ROUTE_TEMPLATES) {
    const templateFile = path.join(TEMPLATES_DIR, template);
    const outputFile = path.join(
      moduleDir,
      path.basename(template).replace(".hbs", "").replace("route.", `${routeName}.`)
    );

    const context = {
      projectName: manifest.project.name,
      ResourceName: resourceName,
      resourceName: resourceName.charAt(0).toLowerCase() + resourceName.slice(1),
      routePath,
    };

    await templateEngine.renderAbsolute(templateFile, context, outputFile);
  }

  // Register route in app.ts
  const importName = `${resourceName}Routes`;
  const importPath = `./modules/${routeName}/${routeName}.routes.js`;
  const routePrefix = `/api/${routePath}`;

  const appPath = path.join(projectDir, "src", "app.ts");
  let appContent = await fs.readFile(appPath, "utf-8");

  if (appContent.includes(importName)) {
    console.log(chalk.yellow(`Route "${importName}" already registered in app.ts.`));
  } else {
    // Add import after last existing import
    const lastImportIndex = appContent.lastIndexOf("import ");
    const lastImportEnd = appContent.indexOf("\n", lastImportIndex);
    const importStatement = `import ${importName} from "${importPath}";`;
    appContent =
      appContent.slice(0, lastImportEnd + 1) +
      importStatement +
      "\n" +
      appContent.slice(lastImportEnd + 1);

    // Mount before {{REGISTER_ROUTES}} marker
    appContent = appContent.replace(
      "// {{REGISTER_ROUTES}}",
      `app.use("${routePrefix}", ${importName});\n  // {{REGISTER_ROUTES}}`
    );

    await fs.writeFile(appPath, appContent, "utf-8");
  }

  console.log(chalk.green(`\n✔ Route "${routeName}" created successfully`));
  console.log(chalk.dim(`  Files: src/modules/${routeName}/`));
  console.log(chalk.dim(`  Mount: ${routePrefix}`));
  console.log(
    chalk.dim(`  Edit src/modules/${routeName}/${routeName}.validation.ts to define request fields`)
  );
  console.log(
    chalk.dim(`  Edit src/modules/${routeName}/${routeName}.service.ts to implement business logic`)
  );
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}
