export interface FieldDefinition {
  name: string;
  type: string;
  prismaType: string;
  zodType: string;
  tsType: string;
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
  // Alias datetime → date
  const normalizedType = type === "datetime" ? "date" : type;
  return mapping[normalizedType] ?? { prismaType: "String", zodType: "z.string()", tsType: "string" };
}

export function parseFieldDefinition(field: string): { name: string; type: string } | null {
  const match = field.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(string|number|boolean|date|datetime)$/);
  if (!match) return null;
  return { name: match[1], type: match[2] };
}

export function createFieldDefinitions(fields: string[]): FieldDefinition[] {
  return fields
    .map((f) => parseFieldDefinition(f))
    .filter((f): f is NonNullable<typeof f> => f !== null)
    .map((f) => ({
      ...f,
      ...mapFieldType(f.type),
    }));
}
