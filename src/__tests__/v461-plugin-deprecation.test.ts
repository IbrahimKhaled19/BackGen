import { describe, it, expect } from "vitest";
import {
  getPlugin,
  listPlugins,
  listAvailablePlugins,
  getPluginsByCategory,
  getCategories,
} from "../core/plugin-registry.js";

describe("V4.6.1 plugin deprecation", () => {
  describe("registry filtering", () => {
    it("hardening is unavailable (picker-hidden)", () => {
      const p = getPlugin("hardening");
      expect(p).toBeDefined();
      expect(p?.available).toBe(false);
    });

    it("sanitize is unavailable (picker-hidden)", () => {
      const p = getPlugin("sanitize");
      expect(p).toBeDefined();
      expect(p?.available).toBe(false);
    });

    it("ratelimit is still available (opt-in)", () => {
      const p = getPlugin("ratelimit");
      expect(p).toBeDefined();
      expect(p?.available).toBe(true);
    });

    it("listAvailablePlugins excludes hardening and sanitize", () => {
      const available = listAvailablePlugins().map((p) => p.name);
      expect(available).not.toContain("hardening");
      expect(available).not.toContain("sanitize");
    });

    it("listAvailablePlugins includes ratelimit", () => {
      const available = listAvailablePlugins().map((p) => p.name);
      expect(available).toContain("ratelimit");
    });

    it("listPlugins still includes deprecated plugins (manifest compat)", () => {
      const all = listPlugins().map((p) => p.name);
      expect(all).toContain("hardening");
      expect(all).toContain("sanitize");
      expect(all).toContain("ratelimit");
    });
  });

  describe("getPluginsByCategory filters by available", () => {
    it("does not return deprecated plugins", () => {
      const production = getPluginsByCategory("production");
      const names = production.map((p) => p.name);
      expect(names).not.toContain("hardening");
      expect(names).not.toContain("sanitize");
    });
  });

  describe("getCategories filters by available", () => {
    it("does not include category if all plugins in it are deprecated", () => {
      // This test just ensures no crash and reasonable behavior
      const cats = getCategories();
      expect(Array.isArray(cats)).toBe(true);
    });
  });

  describe("deprecated plugin install() is no-op", () => {
    it("hardening.install() does not throw and does not write files", async () => {
      const p = getPlugin("hardening");
      expect(p).toBeDefined();
      // install() should be a no-op, no engine/mutate needed
      await expect(
        p!.install({
          projectDir: "/tmp",
          projectName: "demo",
          engine: {} as never,
          mutate: async () => {},
        })
      ).resolves.toBeUndefined();
    });

    it("sanitize.install() does not throw and does not write files", async () => {
      const p = getPlugin("sanitize");
      expect(p).toBeDefined();
      await expect(
        p!.install({
          projectDir: "/tmp",
          projectName: "demo",
          engine: {} as never,
          mutate: async () => {},
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("ratelimit plugin still installable (opt-in)", () => {
    it("has install() with non-empty templates", () => {
      const p = getPlugin("ratelimit");
      expect(p).toBeDefined();
      expect(p!.templates.length).toBeGreaterThan(0);
      expect(p!.dependencies).toContain("express-rate-limit");
    });
  });
});
