export interface PrismaFieldMap {
  prismaType: string;
}

export function getTypeMapping(type: string): PrismaFieldMap {
  const mapping: Record<string, PrismaFieldMap> = {
    string: { prismaType: "String" },
    number: { prismaType: "Float" },
    boolean: { prismaType: "Boolean" },
    date: { prismaType: "DateTime" },
    datetime: { prismaType: "DateTime" },
  };
  return mapping[type] ?? { prismaType: "String" };
}
