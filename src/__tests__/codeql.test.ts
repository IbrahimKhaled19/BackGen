import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as path from "path";
import * as fs from "fs/promises";
import { fileURLToPath } from "url";
import { codeqlPlugin } from "../plugins/codeql/index.js";
import {
  getPlugin,
  listPlugins,
  listAvailablePlugins,
  getPluginsByCategory,
} from "../core/plugin-registry.js";
import { TemplateEngine } from "../core/template-engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DIR = path.resolve(__dirname, "../../.test-output-codeql-unit");

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function read(p: string): Promise<string> {
  return fs.readFile(p, "utf-8");
}

describe("codeql plugin", () => {
  describe("plugin object properties", () => {
    it("has name 'codeql'", () => {
      expect(codeqlPlugin.name).toBe("codeql");
    });

    it("has category 'devops'", () => {
      expect(codeqlPlugin.category).toBe("devops");
    });

    it("has version '1.0.0'", () => {
      expect(codeqlPlugin.version).toBe("1.0.0");
    });

    it("is available", () => {
      expect(codeqlPlugin.available).toBe(true);
    });

    it("lists codeql.yml.hbs as its only template", () => {
      expect(codeqlPlugin.templates).toEqual(["codeql.yml.hbs"]);
    });

    it("has empty dependencies", () => {
      expect(codeqlPlugin.dependencies).toEqual([]);
    });

    it("has empty conflicts", () => {
      expect(codeqlPlugin.conflicts).toEqual([]);
    });

    it("has a description mentioning CodeQL", () => {
      expect(codeqlPlugin.description).toContain("CodeQL");
    });
  });

  describe("registry integration", () => {
    it("is registered via getPlugin('codeql')", () => {
      const plugin = getPlugin("codeql");
      expect(plugin).toBeDefined();
      expect(plugin!.name).toBe("codeql");
    });

    it("appears in listPlugins()", () => {
      const names = listPlugins().map((p) => p.name);
      expect(names).toContain("codeql");
    });

    it("appears in listAvailablePlugins()", () => {
      const names = listAvailablePlugins().map((p) => p.name);
      expect(names).toContain("codeql");
    });

    it("appears in getPluginsByCategory('devops')", () => {
      const names = getPluginsByCategory("devops").map((p) => p.name);
      expect(names).toContain("codeql");
    });
  });

  describe("install() renders CodeQL workflow", () => {
    const projectDir = path.join(TEST_DIR, "demo");
    const workflowPath = path.join(
      projectDir,
      ".github",
      "workflows",
      "codeql.yml"
    );

    beforeAll(async () => {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
      await fs.mkdir(projectDir, { recursive: true });

      const engine = new TemplateEngine(".");

      await codeqlPlugin.install({
        projectDir,
        projectName: "demo",
        orm: "prisma",
        engine,
        mutate: async () => {},
      });
    });

    afterAll(async () => {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    });

    it("creates .github/workflows/codeql.yml", async () => {
      expect(await exists(workflowPath)).toBe(true);
    });

    it("renders 'CodeQL' as the workflow name", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("CodeQL");
    });

    it("renders github/codeql-action/init@v3", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("github/codeql-action/init@v3");
    });

    it("renders github/codeql-action/autobuild@v3", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("github/codeql-action/autobuild@v3");
    });

    it("renders github/codeql-action/analyze@v3", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("github/codeql-action/analyze@v3");
    });

    it("renders actions/checkout@v4", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("actions/checkout@v4");
    });

    it("renders matrix language javascript-typescript", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("javascript-typescript");
    });

    it("renders weekly cron schedule", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("0 0 * * 0");
    });

    it("renders security-events permission", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("security-events: write");
    });

    it("renders concurrency group", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("concurrency");
      expect(content).toContain("cancel-in-progress: true");
    });
  });
});
