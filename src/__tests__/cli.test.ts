import { describe, it, expect } from "vitest";
import { createPlaceholders } from "../core/placeholders.js";
import { parseFieldDefinition, mapFieldType, createFieldDefinitions } from "../core/field-mapper.js";
import { validateCheckpoint, getNextPendingStep } from "../core/checkpoint.js";
import type { CheckpointData } from "../core/checkpoint.js";

describe("Placeholders", () => {
  it("should create correct placeholders from name", () => {
    const p = createPlaceholders("product");
    expect(p.ResourceName).toBe("Product");
    expect(p.resourceName).toBe("product");
    expect(p.RESOURCE_NAME).toBe("PRODUCT");
  });

  it("should handle multi-word names", () => {
    const p = createPlaceholders("blog-post");
    expect(p.ResourceName).toBe("BlogPost");
    expect(p.resourceName).toBe("blogPost");
  });
});

describe("Field Mapper", () => {
  it("should parse valid field definition", () => {
    const result = parseFieldDefinition("name:string");
    expect(result).toEqual({ name: "name", type: "string" });
  });

  it("should reject invalid field definition", () => {
    expect(parseFieldDefinition("invalid")).toBeNull();
    expect(parseFieldDefinition("name:invalid")).toBeNull();
  });

  it("should map field types correctly", () => {
    expect(mapFieldType("string")).toEqual({
      prismaType: "String",
      zodType: "z.string()",
      tsType: "string",
    });
    expect(mapFieldType("number")).toEqual({
      prismaType: "Float",
      zodType: "z.number()",
      tsType: "number",
    });
    expect(mapFieldType("boolean")).toEqual({
      prismaType: "Boolean",
      zodType: "z.boolean()",
      tsType: "boolean",
    });
    expect(mapFieldType("date")).toEqual({
      prismaType: "DateTime",
      zodType: "z.coerce.date()",
      tsType: "Date",
    });
  });

  it("should create field definitions from strings", () => {
    const fields = createFieldDefinitions(["name:string", "price:number", "active:boolean"]);
    expect(fields).toHaveLength(3);
    expect(fields[0].name).toBe("name");
    expect(fields[0].prismaType).toBe("String");
    expect(fields[1].name).toBe("price");
    expect(fields[1].prismaType).toBe("Float");
  });
});

describe("Checkpoint", () => {
  it("should validate valid checkpoint", async () => {
    const data: CheckpointData = {
      projectName: "test",
      steps: { scaffold: { status: "complete", timestamp: "2024-01-01" } },
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
    };
    expect(await validateCheckpoint(data)).toBe(true);
  });

  it("should reject invalid checkpoint", async () => {
    expect(await validateCheckpoint({} as CheckpointData)).toBe(false);
  });

  it("should find next pending step", () => {
    const data: CheckpointData = {
      projectName: "test",
      steps: {
        scaffold: { status: "complete", timestamp: "2024-01-01" },
        templates: { status: "pending", timestamp: null },
        deps: { status: "pending", timestamp: null },
      },
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
    };
    expect(getNextPendingStep(data)).toBe("templates");
  });

  it("should return null when all complete", () => {
    const data: CheckpointData = {
      projectName: "test",
      steps: {
        scaffold: { status: "complete", timestamp: "2024-01-01" },
      },
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
    };
    expect(getNextPendingStep(data)).toBeNull();
  });
});
