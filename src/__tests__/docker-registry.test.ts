import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as path from "path";
import * as fs from "fs/promises";
import { fileURLToPath } from "url";
import { dockerRegistryPlugin } from "../plugins/docker-registry/index.js";
import {
  getPlugin,
  listPlugins,
  listAvailablePlugins,
  getPluginsByCategory,
} from "../core/plugin-registry.js";
import { TemplateEngine } from "../core/template-engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DIR = path.resolve(__dirname, "../../.test-output-docker-registry-unit");

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

describe("docker-registry plugin", () => {
  describe("plugin object properties", () => {
    it("has name 'docker-registry'", () => {
      expect(dockerRegistryPlugin.name).toBe("docker-registry");
    });

    it("has category 'devops'", () => {
      expect(dockerRegistryPlugin.category).toBe("devops");
    });

    it("has version '1.0.0'", () => {
      expect(dockerRegistryPlugin.version).toBe("1.0.0");
    });

    it("is available", () => {
      expect(dockerRegistryPlugin.available).toBe(true);
    });

    it("lists docker-publish.yml.hbs as its only template", () => {
      expect(dockerRegistryPlugin.templates).toEqual(["docker-publish.yml.hbs"]);
    });

    it("has empty dependencies", () => {
      expect(dockerRegistryPlugin.dependencies).toEqual([]);
    });

    it("has empty conflicts", () => {
      expect(dockerRegistryPlugin.conflicts).toEqual([]);
    });

    it("has a description mentioning Docker", () => {
      expect(dockerRegistryPlugin.description).toContain("Docker");
    });
  });

  describe("registry integration", () => {
    it("is registered via getPlugin('docker-registry')", () => {
      const plugin = getPlugin("docker-registry");
      expect(plugin).toBeDefined();
      expect(plugin!.name).toBe("docker-registry");
    });

    it("appears in listPlugins()", () => {
      const names = listPlugins().map((p) => p.name);
      expect(names).toContain("docker-registry");
    });

    it("appears in listAvailablePlugins()", () => {
      const names = listAvailablePlugins().map((p) => p.name);
      expect(names).toContain("docker-registry");
    });

    it("appears in getPluginsByCategory('devops')", () => {
      const names = getPluginsByCategory("devops").map((p) => p.name);
      expect(names).toContain("docker-registry");
    });
  });

  describe("install() renders Docker workflow", () => {
    const projectDir = path.join(TEST_DIR, "demo");
    const workflowPath = path.join(projectDir, ".github", "workflows", "docker-publish.yml");

    beforeAll(async () => {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
      await fs.mkdir(projectDir, { recursive: true });

      const engine = new TemplateEngine(".");

      await dockerRegistryPlugin.install({
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

    it("creates .github/workflows/docker-publish.yml", async () => {
      expect(await exists(workflowPath)).toBe(true);
    });

    it("renders workflow name 'Docker'", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("Docker");
    });

    it("renders docker/build-push-action", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("docker/build-push-action");
    });

    it("renders docker/login-action", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("docker/login-action");
    });

    it("renders docker/setup-buildx-action", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("docker/setup-buildx-action");
    });

    it("renders ghcr.io registry", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("ghcr.io");
    });

    it("renders actions/checkout@v4", async () => {
      const content = await read(workflowPath);
      expect(content).toContain("actions/checkout@v4");
    });
  });
});
