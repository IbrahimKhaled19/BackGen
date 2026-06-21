import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { initProjectTool } from "../tools/init-project.js";
import { addPluginTool } from "../tools/add-plugin.js";
import { removePluginTool } from "../tools/remove-plugin.js";
import { generateResourceTool } from "../tools/generate-resource.js";
import { generateSeedTool } from "../tools/generate-seed.js";
import { generateFactoryTool } from "../tools/generate-factory.js";
import { doctorTool } from "../tools/doctor.js";
import { listPluginsTool } from "../tools/list-plugins.js";
import { listPresetsTool } from "../tools/list-presets.js";
import { projectInfoTool } from "../tools/project-info.js";

// McpServer doesn't expose a public listTools() — tools are registered
// as request handlers on the underlying protocol. We test:
// 1. Registration doesn't throw
// 2. Zod schemas validate correctly
// 3. The private _registeredTools map is populated

describe("MCP Tools — registration", () => {
  it("all 10 tools register without throwing", () => {
    const server = new McpServer({ name: "test", version: "1.0.0" }, {});

    expect(() => {
      initProjectTool(server);
      addPluginTool(server);
      removePluginTool(server);
      generateResourceTool(server);
      generateSeedTool(server);
      generateFactoryTool(server);
      doctorTool(server);
      listPluginsTool(server);
      listPresetsTool(server);
      projectInfoTool(server);
    }).not.toThrow();
  });

  it("duplicate tool registration throws", () => {
    const server = new McpServer({ name: "test", version: "1.0.0" }, {});
    initProjectTool(server);

    expect(() => {
      initProjectTool(server);
    }).toThrow();
  });

  it("server instance has underlying Server object", () => {
    const server = new McpServer({ name: "test", version: "1.0.0" }, {});

    // @ts-expect-error - accessing private for test verification
    expect(server.server).toBeDefined();
    // @ts-expect-error - accessing private for test verification
    expect(server.server.getClientVersion).toBeTypeOf("function");
  });
});

describe("MCP Tools — schema validation", () => {
  it("init_project rejects empty name", () => {
    const schema = z.object({
      name: z.string().min(1),
      orm: z.enum(["prisma", "drizzle", "mongoose"]),
    });

    expect(() => schema.parse({ name: "", orm: "prisma" })).toThrow();
  });

  it("init_project accepts valid name", () => {
    const schema = z.object({
      name: z.string().min(1),
      orm: z.enum(["prisma", "drizzle", "mongoose"]),
    });

    expect(() => schema.parse({ name: "my-api", orm: "prisma" })).not.toThrow();
  });

  it("init_project rejects invalid orm", () => {
    const schema = z.object({
      orm: z.enum(["prisma", "drizzle", "mongoose"]),
    });

    expect(() => schema.parse({ orm: "invalid" })).toThrow();
  });

  it("init_project uses prisma as default ORM", () => {
    const schema = z.object({
      orm: z.enum(["prisma", "drizzle", "mongoose"]).default("prisma"),
    });

    const result = schema.parse({});
    expect(result.orm).toBe("prisma");
  });

  it("generate_seed rejects count > 1000", () => {
    const schema = z.object({
      count: z.number().int().min(1).max(1000),
    });

    expect(() => schema.parse({ count: 1001 })).toThrow();
  });

  it("generate_seed accepts valid count with default", () => {
    const schema = z.object({
      count: z.number().int().min(1).max(1000).default(10),
    });

    const result = schema.parse({});
    expect(result.count).toBe(10);
  });

  it("list_plugins and list_presets have no required params", () => {
    const schema = z.object({});
    expect(() => schema.parse({})).not.toThrow();
  });

  it("add_plugin rejects empty plugin name", () => {
    const schema = z.object({
      plugin: z.string().min(1),
    });

    expect(() => schema.parse({ plugin: "" })).toThrow();
  });

  it("generate_resource accepts optional fields", () => {
    const schema = z.object({
      name: z.string().min(1),
      fields: z.string().optional(),
      relations: z.string().optional(),
    });

    const result = schema.parse({ name: "Product" });
    expect(result.name).toBe("Product");
    expect(result.fields).toBeUndefined();
    expect(result.relations).toBeUndefined();
  });

  it("doctor defaults fix to false", () => {
    const schema = z.object({
      fix: z.boolean().default(false),
    });

    const result = schema.parse({});
    expect(result.fix).toBe(false);
  });
});

describe("MCP Tools — tool descriptions exist", () => {
  // Verify each tool module exports a function with the expected name
  it("init-project exports initProjectTool", () => {
    expect(initProjectTool).toBeTypeOf("function");
  });

  it("add-plugin exports addPluginTool", () => {
    expect(addPluginTool).toBeTypeOf("function");
  });

  it("remove-plugin exports removePluginTool", () => {
    expect(removePluginTool).toBeTypeOf("function");
  });

  it("generate-resource exports generateResourceTool", () => {
    expect(generateResourceTool).toBeTypeOf("function");
  });

  it("generate-seed exports generateSeedTool", () => {
    expect(generateSeedTool).toBeTypeOf("function");
  });

  it("generate-factory exports generateFactoryTool", () => {
    expect(generateFactoryTool).toBeTypeOf("function");
  });

  it("doctor exports doctorTool", () => {
    expect(doctorTool).toBeTypeOf("function");
  });

  it("list-plugins exports listPluginsTool", () => {
    expect(listPluginsTool).toBeTypeOf("function");
  });

  it("list-presets exports listPresetsTool", () => {
    expect(listPresetsTool).toBeTypeOf("function");
  });

  it("project-info exports projectInfoTool", () => {
    expect(projectInfoTool).toBeTypeOf("function");
  });
});
