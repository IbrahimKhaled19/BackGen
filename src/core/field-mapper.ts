export interface FieldDefinition {
  name: string;
  type: string;
  zodType: string;
  tsType: string;
}

export function mapFieldType(type: string, orm?: string): {
  zodType: string;
  tsType: string;
} {
  const prismaLike = orm === "prisma" || orm === "drizzle";
  const mapping: Record<string, { zodType: string; tsType: string }> = {
    string: { zodType: "z.string()", tsType: "string" },
    number: { zodType: "z.number()", tsType: "number" },
    boolean: { zodType: "z.boolean()", tsType: "boolean" },
    date: { zodType: "z.coerce.date()", tsType: prismaLike ? "string" : "Date" },
  };
  // Alias datetime → date
  const normalizedType = type === "datetime" ? "date" : type;
  return mapping[normalizedType] ?? { zodType: "z.string()", tsType: "string" };
}

export function parseFieldDefinition(field: string): { name: string; type: string } | null {
  const match = field.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(string|number|boolean|date|datetime)$/);
  if (!match) return null;
  return { name: match[1], type: match[2] };
}

export function createFieldDefinitions(fields: string[], orm?: string): FieldDefinition[] {
  return fields
    .map((f) => parseFieldDefinition(f))
    .filter((f): f is NonNullable<typeof f> => f !== null)
    .map((f) => ({
      ...f,
      ...mapFieldType(f.type, orm),
    }));
}
