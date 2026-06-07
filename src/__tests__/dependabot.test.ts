import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as path from "path";
import * as fs from "fs/promises";
import { fileURLToPath } from "url";
import { dependabotPlugin } from "../plugins/dependabot/index.js";
import {
  getPlugin,
  listPlugins,
  listAvailablePlugins,
  getPluginsByCategory,
} from "../core/plugin-registry.js";
import { TemplateEngine } from "../core/template-engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DIR = path.resolve(__dirname, "../../.test-output-dependabot-unit");

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

describe("dependabot plugin", () => {
  describe("plugin object properties", () => {
    it("has name 'dependabot'", () => {
      expect(dependabotPlugin.name).toBe("dependabot");
    });

    it("has category 'devops'", () => {
      expect(dependabotPlugin.category).toBe("devops");
    });

    it("has version '1.0.0'", () => {
      expect(dependabotPlugin.version).toBe("1.0.0");
    });

    it("is available", () => {
      expect(dependabotPlugin.available).toBe(true);
    });

    it("lists dependabot.yml.hbs as its only template", () => {
      expect(dependabotPlugin.templates).toEqual(["dependabot.yml.hbs"]);
    });

    it("has empty dependencies", () => {
      expect(dependabotPlugin.dependencies).toEqual([]);
    });

    it("has empty conflicts", () => {
      expect(dependabotPlugin.conflicts).toEqual([]);
    });

    it("has a description mentioning Dependabot", () => {
      expect(dependabotPlugin.description).toContain("Dependabot");
    });
  });

  describe("registry integration", () => {
    it("is registered via getPlugin('dependabot')", () => {
      const plugin = getPlugin("dependabot");
      expect(plugin).toBeDefined();
      expect(plugin!.name).toBe("dependabot");
    });

    it("appears in listPlugins()", () => {
      const names = listPlugins().map((p) => p.name);
      expect(names).toContain("dependabot");
    });

    it("appears in listAvailablePlugins()", () => {
      const names = listAvailablePlugins().map((p) => p.name);
      expect(names).toContain("dependabot");
    });

    it("appears in getPluginsByCategory('devops')", () => {
      const names = getPluginsByCategory("devops").map((p) => p.name);
      expect(names).toContain("dependabot");
    });
  });

  describe("install() renders Dependabot config", () => {
    const projectDir = path.join(TEST_DIR, "demo");
    const configPath = path.join(projectDir, ".github", "dependabot.yml");

    beforeAll(async () => {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
      await fs.mkdir(projectDir, { recursive: true });

      const engine = new TemplateEngine(".");

      await dependabotPlugin.install({
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

    it("creates .github/dependabot.yml", async () => {
      expect(await exists(configPath)).toBe(true);
    });

    it("renders version: 2", async () => {
      const content = await read(configPath);
      expect(content).toContain("version: 2");
    });

    it("renders npm package-ecosystem", async () => {
      const content = await read(configPath);
      expect(content).toContain("package-ecosystem: \"npm\"");
    });

    it("renders weekly schedule interval", async () => {
      const content = await read(configPath);
      expect(content).toContain("interval: \"weekly\"");
    });

    it("renders open-pull-requests-limit: 10", async () => {
      const content = await read(configPath);
      expect(content).toContain("open-pull-requests-limit: 10");
    });

    it("renders npm dependency group for batch updates", async () => {
      const content = await read(configPath);
      expect(content).toContain("groups:");
      expect(content).toContain("npm:");
      expect(content).toContain("- \"*\"");
    });

    it("renders dependencies label", async () => {
      const content = await read(configPath);
      expect(content).toContain("- \"dependencies\"");
    });

    it("renders directory: /", async () => {
      const content = await read(configPath);
      expect(content).toContain("directory: \"/\"");
    });
  });
});
