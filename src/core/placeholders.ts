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
  const upperCase = toUpperCase(name);

  return {
    ResourceName: pascalCase,
    resourceName: camelCase,
    resourcePlural: plural,
    RESOURCE_NAME: upperCase,
  };
}

function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ""))
    .replace(/^(.)/, (_, c: string) => c.toUpperCase());
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
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

function toUpperCase(str: string): string {
  return str
    .replace(/[-_\s]+/g, "_")
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toUpperCase();
}
