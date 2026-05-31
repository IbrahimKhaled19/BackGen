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

export function parseFieldDefinition(field: string): { name: string; type: string } | null {
  const match = field.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(string|number|boolean|date)$/);
  if (!match) return null;
  return { name: match[1], type: match[2] };
}

export function mapFieldType(type: string): {
  prismaType: string;
  zodType: string;
  tsType: string;
} {
  const mapping: Record<string, { prismaType: string; zodType: string; tsType: string }> = {
    string: { prismaType: "String", zodType: "z.string()", tsType: "string" },
    number: { prismaType: "Float", zodType: "z.number()", tsType: "number" },
    boolean: { prismaType: "Boolean", zodType: "z.boolean()", tsType: "boolean" },
    date: { prismaType: "DateTime", zodType: "z.coerce.date()", tsType: "Date" },
  };
  return mapping[type] ?? { prismaType: "String", zodType: "z.string()", tsType: "string" };
}
