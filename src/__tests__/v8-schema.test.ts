import { describe, it, expect } from "vitest";
import { parseAndValidateYaml, parseSchemaObject, fieldsToFieldStrings, relationsToRelationDefs } from "../core/yaml-schema.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, "../../test/fixtures");

// ── Parser unit tests ────────────────────────────────────────────

describe("parseAndValidateYaml", () => {
  it("parses valid schema file", async () => {
    const schema = await parseAndValidateYaml(path.join(FIXTURES, "backgen-valid.yaml"));
    expect(schema.version).toBe(1);
    expect(schema.project.name).toBe("blog-api");
    expect(schema.project.orm).toBe("prisma");
    expect(schema.plugins).toEqual(["jwt"]);
    expect(Object.keys(schema.resources)).toEqual(["User", "Post", "Comment"]);
  });

  it("rejects missing file", async () => {
    await expect(parseAndValidateYaml("/nonexistent.yaml")).rejects.toThrow("Schema file not found");
  });

  it("rejects invalid schema (bad ORM)", async () => {
    await expect(parseAndValidateYaml(path.join(FIXTURES, "backgen-invalid.yaml"))).rejects.toThrow(
      'project.orm must be one of'
    );
  });
});

describe("parseSchemaObject", () => {
  it("parses a valid schema object", () => {
    const obj = {
      version: 1,
      project: { name: "test", framework: "express", database: "postgresql", orm: "prisma" },
      plugins: ["jwt"],
      resources: {
        Item: {
          fields: { name: "string", price: { type: "number", default: 0 } },
          relations: { owner: "User" },
          softDelete: false,
        },
      },
    };
    const schema = parseSchemaObject(obj);
    expect(schema.project.name).toBe("test");
    expect(schema.resources.Item.fields.name.type).toBe("string");
    expect(schema.resources.Item.fields.price.default).toBe(0);
    expect(schema.resources.Item.relations.owner).toBe("User");
  });

  it("applies defaults", () => {
    const obj = {
      version: 1,
      project: { name: "minimal" },
    };
    const schema = parseSchemaObject(obj);
    expect(schema.project.framework).toBe("express");
    expect(schema.project.database).toBe("postgresql");
    expect(schema.project.orm).toBe("prisma");
    expect(schema.plugins).toEqual([]);
    expect(schema.resources).toEqual({});
  });
});

describe("fieldsToFieldStrings", () => {
  it("converts fields to string array", () => {
    const fields = {
      name: { type: "string" },
      age: { type: "number", unique: true },
    };
    expect(fieldsToFieldStrings(fields)).toEqual(["name:string", "age:number"]);
  });
});

describe("relationsToRelationDefs", () => {
  it("converts relations to defs array", () => {
    const relations = { author: "User", category: "Category" };
    expect(relationsToRelationDefs(relations)).toEqual([
      { name: "author", target: "User" },
      { name: "category", target: "Category" },
    ]);
  });
});

// ── Integration tests ────────────────────────────────────────────

describe.skip("Schema generation (integration)", { timeout: 300_000 }, () => {
  it("generates project from valid schema via CLI", async () => {
    const { execSync } = await import("child_process");
    const { rmSync } = await import("fs");
    const tmpDir = path.resolve(__dirname, "../../.tmp-test-v8");
    const schemaPath = path.join(FIXTURES, "backgen-valid.yaml");

    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}

    const result = execSync(
      `node "${path.resolve(__dirname, "../../dist/index.js")}" generate schema "${schemaPath}" --out "${tmpDir}"`,
      { cwd: __dirname, shell: true, encoding: "utf-8", timeout: 240_000 }
    );

    expect(result).toContain("generated successfully");

    const { existsSync } = await import("fs");
    expect(existsSync(path.join(tmpDir, "package.json"))).toBe(true);
    expect(existsSync(path.join(tmpDir, "src"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".backgenrc.json"))).toBe(true);

    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it("generates project from deps schema with relations", async () => {
    const { execSync } = await import("child_process");
    const { rmSync } = await import("fs");
    const tmpDir = path.resolve(__dirname, "../../.tmp-test-v8-deps");
    const schemaPath = path.join(FIXTURES, "backgen-deps.yaml");

    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}

    const result = execSync(
      `node "${path.resolve(__dirname, "../../dist/index.js")}" generate schema "${schemaPath}" --out "${tmpDir}"`,
      { cwd: __dirname, shell: true, encoding: "utf-8", timeout: 240_000 }
    );

    expect(result).toContain("generated successfully");

    const { existsSync } = await import("fs");
    expect(existsSync(path.join(tmpDir, "package.json"))).toBe(true);

    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });
});
