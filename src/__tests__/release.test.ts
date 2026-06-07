import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as path from "path";
import * as fs from "fs/promises";
import { fileURLToPath } from "url";
import { releasePlugin } from "../plugins/release/index.js";
import {
  getPlugin,
  listPlugins,
  listAvailablePlugins,
  getPluginsByCategory,
} from "../core/plugin-registry.js";
import { TemplateEngine } from "../core/template-engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DIR = path.resolve(__dirname, "../../.test-output-release-unit");

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

describe("release plugin", () => {
  describe("plugin object properties", () => {
    it("has name 'release'", () => {
      expect(releasePlugin.name).toBe("release");
    });

    it("has category 'devops'", () => {
      expect(releasePlugin.category).toBe("devops");
    });

    it("has version '1.0.0'", () => {
      expect(releasePlugin.version).toBe("1.0.0");
    });

    it("is available", () => {
      expect(releasePlugin.available).toBe(true);
    });

    it("lists release.yml.hbs as its only template", () => {
      expect(releasePlugin.templates).toEqual(["release.yml.hbs"]);
    });

    it("has empty dependencies", () => {
      expect(releasePlugin.dependencies).toEqual([]);
    });

    it("has empty conflicts", () => {
      expect(releasePlugin.conflicts).toEqual([]);
    });

    it("has a description mentioning Release", () => {
      expect(releasePlugin.description).toContain("Release");
    });
  });

  describe("registry integration", () => {
    it("is registered via getPlugin('release')", () => {
      const plugin = getPlugin("release");
      expect(plugin).toBeDefined();
      expect(plugin!.name).toBe("release");
    });

    it("appears in listPlugins()", () => {
      const names = listPlugins().map((p) => p.name);
      expect(names).toContain("release");
    });

    it("appears in listAvailablePlugins()", () => {
      const names = listAvailablePlugins().map((p) => p.name);
      expect(names).toContain("release");
    });

    it("appears in getPluginsByCategory('devops')", () => {
      const names = getPluginsByCategory("devops").map((p) => p.name);
      expect(names).toContain("release");
    });
  });

  describe("install() renders Release workflow", () => {
    const projectDir = path.join(TEST_DIR, "demo");
    const workflowPath = path.join(projectDir, ".github", "workflows", "release.yml");

    beforeAll(async () => {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
      await fs.mkdir(projectDir, { recursive: true });

      const engine = new TemplateEngine(".");

      await releasePlugin.install({
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

    it("creates .github/workflows/release.yml", async () => {
      expect(await exists(workflowPath)).toBe(true);
    });

    it("renders workflow name 'Release'", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("name: Release");
    });

    it("renders npm publish step", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("npm publish");
    });

    it("renders npm ci", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("npm ci");
    });

    it("renders npm run build", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("npm run build");
    });

    it("renders npm test", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("npm test");
    });

    it("renders actions/checkout@v4", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("actions/checkout@v4");
    });

    it("renders actions/setup-node@v4", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("actions/setup-node@v4");
    });

    it("renders NODE_AUTH_TOKEN secret reference", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("NODE_AUTH_TOKEN");
    });

    it("renders softprops/action-gh-release@v2", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("softprops/action-gh-release@v2");
    });
  });
});
