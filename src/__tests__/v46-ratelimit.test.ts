import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "child_process";
import { rmSync } from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

function safeRm(dir: string): void {
  for (let i = 0; i < 15; i++) {
    try { rmSync(dir, { recursive: true, force: true }); return; } catch {
      execSync("node -e \"setTimeout(() => {}, 1000)\"", { stdio: "ignore" });
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI = path.resolve(__dirname, "../../dist/index.js");
const TEST_DIR = path.resolve(__dirname, "../../.test-output-v46-ratelimit");

function cli(args: string, cwd = TEST_DIR): string {
  return execSync(`node ${CLI} ${args}`, {
    cwd,
    encoding: "utf-8",
    timeout: 120000,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

async function exists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

async function read(p: string): Promise<string> {
  return fs.readFile(p, "utf-8");
}

async function readJson(p: string): Promise<Record<string, unknown>> {
  return JSON.parse(await read(p));
}

describe("V4.6 ratelimit plugin", () => {
  const projectDir = path.join(TEST_DIR, "demo");

  beforeAll(async () => {
    safeRm(TEST_DIR);
    await fs.mkdir(TEST_DIR, { recursive: true });
    cli("init demo --defaults --skip-install", TEST_DIR);
    cli("add ratelimit", projectDir);
  });

  it("creates rate-limit middleware in security/", async () => {
    expect(await exists(path.join(projectDir, "src/middleware/security/rate-limit.ts"))).toBe(true);
  });

  it("uses express-rate-limit", async () => {
    const m = await read(path.join(projectDir, "src/middleware/security/rate-limit.ts"));
    expect(m).toContain("rateLimit");
    expect(m).toContain("windowMs");
    expect(m).toContain("max");
  });

  it("uses env-driven config", async () => {
    const m = await read(path.join(projectDir, "src/middleware/security/rate-limit.ts"));
    expect(m).toContain("env.RATE_LIMIT_WINDOW_MS");
    expect(m).toContain("env.RATE_LIMIT_MAX");
  });

  it("registers rate limit on /api in app.ts", async () => {
    const app = await read(path.join(projectDir, "src/app.ts"));
    expect(app).toContain("rateLimit");
    expect(app).toContain("/api");
  });

  it("adds rate limit env vars", async () => {
    const env = await read(path.join(projectDir, ".env.example"));
    expect(env).toContain("RATE_LIMIT_WINDOW_MS");
    expect(env).toContain("RATE_LIMIT_MAX");
    expect(env).toContain("REDIS_URL");
  });

  it("adds env schema entries in config/env.ts", async () => {
    const env = await read(path.join(projectDir, "src/config/env.ts"));
    expect(env).toContain("RATE_LIMIT_WINDOW_MS");
    expect(env).toContain("RATE_LIMIT_MAX");
    expect(env).toContain("REDIS_URL");
  });

  it("records ratelimit in manifest", async () => {
    const m = await readJson(path.join(projectDir, ".backgenrc.json"));
    expect(m.plugins).toHaveProperty("ratelimit");
  });
});
