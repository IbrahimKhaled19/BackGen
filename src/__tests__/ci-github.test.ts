import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as path from "path";
import * as fs from "fs/promises";
import { fileURLToPath } from "url";
import { ciGithubPlugin } from "../plugins/ci-github/index.js";
import {
  getPlugin,
  listPlugins,
  listAvailablePlugins,
  getPluginsByCategory,
} from "../core/plugin-registry.js";
import { TemplateEngine } from "../core/template-engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DIR = path.resolve(__dirname, "../../.test-output-ci-github-unit");

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

describe("ci-github plugin", () => {
  describe("plugin object properties", () => {
    it("has name 'ci-github'", () => {
      expect(ciGithubPlugin.name).toBe("ci-github");
    });

    it("has category 'devops'", () => {
      expect(ciGithubPlugin.category).toBe("devops");
    });

    it("has version '1.0.0'", () => {
      expect(ciGithubPlugin.version).toBe("1.0.0");
    });

    it("is available", () => {
      expect(ciGithubPlugin.available).toBe(true);
    });

    it("lists ci.yml.hbs as its only template", () => {
      expect(ciGithubPlugin.templates).toEqual(["ci.yml.hbs"]);
    });

    it("has empty dependencies", () => {
      expect(ciGithubPlugin.dependencies).toEqual([]);
    });

    it("has empty conflicts", () => {
      expect(ciGithubPlugin.conflicts).toEqual([]);
    });

    it("has a description mentioning CI", () => {
      expect(ciGithubPlugin.description).toContain("CI");
    });
  });

  describe("registry integration", () => {
    it("is registered via getPlugin('ci-github')", () => {
      const plugin = getPlugin("ci-github");
      expect(plugin).toBeDefined();
      expect(plugin!.name).toBe("ci-github");
    });

    it("appears in listPlugins()", () => {
      const names = listPlugins().map((p) => p.name);
      expect(names).toContain("ci-github");
    });

    it("appears in listAvailablePlugins()", () => {
      const names = listAvailablePlugins().map((p) => p.name);
      expect(names).toContain("ci-github");
    });

    it("appears in getPluginsByCategory('devops')", () => {
      const names = getPluginsByCategory("devops").map((p) => p.name);
      expect(names).toContain("ci-github");
    });
  });

  describe("install() renders CI workflow", () => {
    const projectDir = path.join(TEST_DIR, "demo");
    const workflowPath = path.join(projectDir, ".github", "workflows", "ci.yml");

    beforeAll(async () => {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
      await fs.mkdir(projectDir, { recursive: true });

      const engine = new TemplateEngine(".");

      await ciGithubPlugin.install({
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

    it("creates .github/workflows/ci.yml", async () => {
      expect(await exists(workflowPath)).toBe(true);
    });

    it("renders actions/checkout@v4.2.2", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("actions/checkout@v4.2.2");
    });

    it("renders actions/setup-node@v4.3.0", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("actions/setup-node@v4.3.0");
    });

    it("renders npm run lint", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("npm run lint");
    });

    it("renders npm test", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("npm test");
    });

    it("renders npm run build", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("npm run build");
    });

    it("does NOT render deploy step when deploy=false", async () => {
      const content = await read(workflowPath);
      expect(content).not.toContain("Deploy");
    });

    it("renders npm run typecheck", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("npm run typecheck");
    });
  });
});
