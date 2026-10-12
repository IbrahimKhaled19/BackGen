import { toPascalCase, toCamelCase, toUpperSnakeCase } from "./string-utils.js";

export interface Placeholders {
  ResourceName: string;
  resourceName: string;
  resourcePlural: string;
  RESOURCE_NAME: string;
}

export function createPlaceholders(name: string): Placeholders {
  const pascalCase = toPascalCase(name);
  const camelCase = toCamelCase(name);
  const plural = toPlural(camelCase);

  return {
    ResourceName: pascalCase,
    resourceName: camelCase,
    resourcePlural: plural,
    RESOURCE_NAME: toUpperSnakeCase(name),
  };
}

function toPlural(str: string): string {
  if (str.endsWith("y") && !/[aeiou]y$/.test(str)) {
    return str.slice(0, -1) + "ies";
  }
  if (str.endsWith("s") || str.endsWith("sh") || str.endsWith("ch") || str.endsWith("x") || str.endsWith("z")) {
    return str + "es";
  }
  return str + "s";
}