export interface DrizzleFieldMap {
  columnType: string;
  importFrom: string;
}

export function getTypeMapping(type: string): DrizzleFieldMap {
  const mapping: Record<string, DrizzleFieldMap> = {
    string: { columnType: "text", importFrom: "drizzle-orm/pg-core" },
    number: { columnType: "doublePrecision", importFrom: "drizzle-orm/pg-core" },
    boolean: { columnType: "boolean", importFrom: "drizzle-orm/pg-core" },
    date: { columnType: "timestamp", importFrom: "drizzle-orm/pg-core" },
    datetime: { columnType: "timestamp", importFrom: "drizzle-orm/pg-core" },
  };
  return mapping[type] ?? { columnType: "text", importFrom: "drizzle-orm/pg-core" };
}
