import * as path from "path";
import { toCamelCase, toPascalCase } from "../core/string-utils.js";

export interface ParsedField {
  name: string;
  type: string;
}

/**
 * Read the field list out of a generated `<resource>.types.ts`.
 *
 * Only the main resource interface is parsed — the Create/Update/Query
 * interfaces that follow it are skipped — and the columns BackGen manages
 * itself (id, timestamps) are dropped.
 */
export function parseFieldsFromTypes(content: string): ParsedField[] {
  const fields: ParsedField[] = [];
  const seen = new Set<string>();

  let inMainInterface = false;
  for (const line of content.split("\n")) {
    if (line.match(/^export interface \w+ \{/)) {
      inMainInterface = true;
      continue;
    }
    if (inMainInterface && line.match(/^\}/)) {
      break; // End of main interface
    }
    if (!inMainInterface) continue;

    const match = line.match(/^\s+(\w+)\s*:\s*(string|number|boolean|Date)/);
    if (
      match &&
      match[1] !== "id" &&
      match[1] !== "createdAt" &&
      match[1] !== "updatedAt" &&
      !seen.has(match[1])
    ) {
      seen.add(match[1]);
      fields.push({ name: match[1], type: match[2] });
    }
  }

  return fields;
}

/** Default value literal for a parsed field, per use case. */
type FieldDefaultStyle = "seed" | "factory";

/**
 * Render the object-literal body that seeds or factories use for one field.
 * Kept in one place so the seed and factory generators never drift apart.
 */
export function renderFieldDefaults(
  fields: ParsedField[],
  style: FieldDefaultStyle
): string {
  return fields
    .map((f) => {
      if (style === "factory") {
        switch (f.type) {
          case "string":
            return `    ${f.name}: overrides.${f.name} ?? "${f.name}-test"`;
          case "number":
            return `    ${f.name}: overrides.${f.name} ?? 1`;
          case "boolean":
            return `    ${f.name}: overrides.${f.name} ?? true`;
          case "Date":
            return `    ${f.name}: overrides.${f.name} ?? new Date()`;
          default:
            return `    ${f.name}: overrides.${f.name} ?? ""`;
        }
      }
      switch (f.type) {
        case "string":
          return `      ${f.name}: \`${f.name}-\${i}\``;
        case "number":
          return `      ${f.name}: Math.floor(Math.random() * 100)`;
        case "boolean":
          return `      ${f.name}: i % 2 === 0`;
        case "Date":
          return `      ${f.name}: new Date()`;
        default:
          return `      ${f.name}: ""`;
      }
    })
    .join(",\n");
}

/** Location of the module directory for a resource name, e.g. "Product" → "product" */
export function moduleNameFor(resource: string): string {
  return toCamelCase(resource);
}

/** PascalCase resource name, e.g. "product-item" → "ProductItem" */
export function resourceNameFor(resource: string): string {
  return toPascalCase(resource);
}

/** Absolute path of a resource's generated types file */
export function typesFileFor(projectDir: string, resource: string): string {
  const moduleName = moduleNameFor(resource);
  return path.join(projectDir, "src", "modules", moduleName, `${moduleName}.types.ts`);
}