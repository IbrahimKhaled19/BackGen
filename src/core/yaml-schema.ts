import * as fs from "fs/promises";

// ── Types ──────────────────────────────────────────────────────

export interface NormalisedField {
  type: string;
  unique?: boolean;
  indexed?: boolean;
  default?: unknown;
}

export interface ParsedResource {
  fields: Record<string, NormalisedField>;
  relations: Record<string, string>;
  softDelete: boolean;
}

export interface ParsedSchema {
  version: 1;
  project: {
    name: string;
    framework: string;
    database: string;
    orm: "prisma" | "drizzle" | "mongoose";
  };
  plugins: string[];
  resources: Record<string, ParsedResource>;
}

// ── Validation helpers ─────────────────────────────────────────

function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pickString(val: unknown, path: string): string {
  if (typeof val !== "string") throw new Error(`${path}: expected string`);
  return val;
}

function pickBool(val: unknown, path: string, fallback: boolean): boolean {
  if (val === undefined || val === null) return fallback;
  if (typeof val !== "boolean") throw new Error(`${path}: expected boolean`);
  return val;
}

// ── Parse ──────────────────────────────────────────────────────

/**
 * Read, parse & validate a backgen.yaml file.
 */
export async function parseAndValidateYaml(filePath: string): Promise<ParsedSchema> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch {
    throw new Error(`Schema file not found: ${filePath}`);
  }

  let doc: unknown;
  try {
    const jsyaml = await import("js-yaml");
    doc = jsyaml.load(raw);
  } catch (e) {
    throw new Error(
      `Failed to parse YAML. Ensure js-yaml is installed: npm install js-yaml\n${(e as Error).message}`
    );
  }

  assert(isRecord(doc), "Schema must be a YAML object");

  // ── project ──────────────────────────────────────────────────
  assert(isRecord(doc.project), 'Missing required "project" section');
  const projectRaw = doc.project as Record<string, unknown>;

  const name = pickString(projectRaw.name, "project.name");
  const framework = projectRaw.framework ? pickString(projectRaw.framework, "project.framework") : "express";
  const database = projectRaw.database ? pickString(projectRaw.database, "project.database") : "postgresql";

  const ormRaw = projectRaw.orm ? pickString(projectRaw.orm, "project.orm") : "prisma";
  const VALID_ORMS = ["prisma", "drizzle", "mongoose"] as const;
  assert(VALID_ORMS.includes(ormRaw as typeof VALID_ORMS[number]), `project.orm must be one of: ${VALID_ORMS.join(", ")}`);
  const orm = ormRaw as "prisma" | "drizzle" | "mongoose";

  // ── plugins ──────────────────────────────────────────────────
  let plugins: string[] = [];
  if (doc.plugins !== undefined) {
    assert(Array.isArray(doc.plugins), '"plugins" must be an array of strings');
    plugins = (doc.plugins as unknown[]).filter((p): p is string => typeof p === "string");
  }

  // ── resources ────────────────────────────────────────────────
  const resources: Record<string, ParsedResource> = {};
  if (doc.resources !== undefined) {
    assert(isRecord(doc.resources), '"resources" must be an object');
    const rawResources = doc.resources as Record<string, unknown>;

    for (const [resName, resDef] of Object.entries(rawResources)) {
      assert(isRecord(resDef), `resource "${resName}" must be an object`);
      const rd = resDef as Record<string, unknown>;

      // fields
      assert(isRecord(rd.fields), `resource "${resName}" requires a "fields" object`);
      const rawFields = rd.fields as Record<string, unknown>;
      const fields: Record<string, NormalisedField> = {};

      for (const [fieldName, rawType] of Object.entries(rawFields)) {
        if (typeof rawType === "string") {
          fields[fieldName] = { type: rawType };
        } else if (isRecord(rawType)) {
          const ft = rawType as Record<string, unknown>;
          const type = pickString(ft.type, `${resName}.${fieldName}.type`);
          const field: NormalisedField = { type };
          if (ft.unique !== undefined) field.unique = pickBool(ft.unique, `${resName}.${fieldName}.unique`, false);
          if (ft.indexed !== undefined) field.indexed = pickBool(ft.indexed, `${resName}.${fieldName}.indexed`, false);
          if (ft.default !== undefined) field.default = ft.default;
          fields[fieldName] = field;
        } else {
          throw new Error(`resource "${resName}" field "${fieldName}": expected string or object`);
        }
      }

      // relations
      const relations: Record<string, string> = {};
      if (rd.relations !== undefined) {
        assert(isRecord(rd.relations), `resource "${resName}".relations must be an object`);
        for (const [relName, target] of Object.entries(rd.relations as Record<string, unknown>)) {
          relations[relName] = pickString(target, `${resName}.relations.${relName}`);
        }
      }

      const softDelete = pickBool(rd.softDelete, `${resName}.softDelete`, false);

      resources[resName] = { fields, relations, softDelete };
    }
  }

  return {
    version: 1 as const,
    project: { name, framework, database, orm },
    plugins,
    resources,
  };
}

/**
 * Parse from an already-loaded object (useful for MCP / programmatic use).
 */
export function parseSchemaObject(obj: unknown): ParsedSchema {
  assert(isRecord(obj), "Schema must be an object");
  const doc = obj as Record<string, unknown>;

  assert(isRecord(doc.project), 'Missing required "project" section');
  const projectRaw = doc.project as Record<string, unknown>;

  const name = pickString(projectRaw.name, "project.name");
  const framework = projectRaw.framework ? pickString(projectRaw.framework, "project.framework") : "express";
  const database = projectRaw.database ? pickString(projectRaw.database, "project.database") : "postgresql";

  const ormRaw = projectRaw.orm ? pickString(projectRaw.orm, "project.orm") : "prisma";
  const VALID_ORMS = ["prisma", "drizzle", "mongoose"] as const;
  assert(VALID_ORMS.includes(ormRaw as typeof VALID_ORMS[number]), `project.orm must be one of: ${VALID_ORMS.join(", ")}`);
  const orm = ormRaw as "prisma" | "drizzle" | "mongoose";

  let plugins: string[] = [];
  if (doc.plugins !== undefined) {
    assert(Array.isArray(doc.plugins), '"plugins" must be an array of strings');
    plugins = (doc.plugins as unknown[]).filter((p): p is string => typeof p === "string");
  }

  const resources: Record<string, ParsedResource> = {};
  if (doc.resources !== undefined) {
    assert(isRecord(doc.resources), '"resources" must be an object');
    const rawResources = doc.resources as Record<string, unknown>;

    for (const [resName, resDef] of Object.entries(rawResources)) {
      assert(isRecord(resDef), `resource "${resName}" must be an object`);
      const rd = resDef as Record<string, unknown>;

      assert(isRecord(rd.fields), `resource "${resName}" requires a "fields" object`);
      const rawFields = rd.fields as Record<string, unknown>;
      const fields: Record<string, NormalisedField> = {};

      for (const [fieldName, rawType] of Object.entries(rawFields)) {
        if (typeof rawType === "string") {
          fields[fieldName] = { type: rawType };
        } else if (isRecord(rawType)) {
          const ft = rawType as Record<string, unknown>;
          const type = pickString(ft.type, `${resName}.${fieldName}.type`);
          const field: NormalisedField = { type };
          if (ft.unique !== undefined) field.unique = pickBool(ft.unique, `${resName}.${fieldName}.unique`, false);
          if (ft.indexed !== undefined) field.indexed = pickBool(ft.indexed, `${resName}.${fieldName}.indexed`, false);
          if (ft.default !== undefined) field.default = ft.default;
          fields[fieldName] = field;
        } else {
          throw new Error(`resource "${resName}" field "${fieldName}": expected string or object`);
        }
      }

      const relations: Record<string, string> = {};
      if (rd.relations !== undefined) {
        assert(isRecord(rd.relations), `resource "${resName}".relations must be an object`);
        for (const [relName, target] of Object.entries(rd.relations as Record<string, unknown>)) {
          relations[relName] = pickString(target, `${resName}.relations.${relName}`);
        }
      }

      const softDelete = pickBool(rd.softDelete, `${resName}.softDelete`, false);
      resources[resName] = { fields, relations, softDelete };
    }
  }

  return { version: 1 as const, project: { name, framework, database, orm }, plugins, resources };
}

// ── Converters to existing BackGen formats ─────────────────────

/**
 * Convert parsed resource fields to string[] format expected by createFieldDefinitions().
 */
export function fieldsToFieldStrings(fields: Record<string, NormalisedField>): string[] {
  const out: string[] = [];
  for (const [name, def] of Object.entries(fields)) {
    out.push(`${name}:${def.type}`);
  }
  return out;
}

/**
 * Convert parsed resource relations to array of {name, target} objects.
 * generateCommand expects relation strings as "name:Target".
 */
export function relationsToRelationDefs(relations: Record<string, string>): { name: string; target: string }[] {
  return Object.entries(relations).map(([name, target]) => ({ name, target }));
}
