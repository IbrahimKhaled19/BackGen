export interface MongooseFieldMap {
  schemaType: string;
  tsType: string;
}

export function getTypeMapping(type: string): MongooseFieldMap {
  const mapping: Record<string, MongooseFieldMap> = {
    string: { schemaType: "String", tsType: "string" },
    number: { schemaType: "Number", tsType: "number" },
    boolean: { schemaType: "Boolean", tsType: "boolean" },
    date: { schemaType: "Date", tsType: "Date" },
    datetime: { schemaType: "Date", tsType: "Date" },
  };
  return mapping[type] ?? { schemaType: "String", tsType: "string" };
}
