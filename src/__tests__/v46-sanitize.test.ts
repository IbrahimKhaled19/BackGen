import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI = path.resolve(__dirname, "../../dist/index.js");
const TEST_DIR = path.resolve(__dirname, "../../.test-output-v46-sanitize");

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

describe("V4.6 sanitize plugin", () => {
  const projectDir = path.join(TEST_DIR, "demo");

  beforeAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    await fs.mkdir(TEST_DIR, { recursive: true });
    cli("init demo --defaults --skip-install", TEST_DIR);
    cli("add sanitize", projectDir);
  });

  afterAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  it("creates sanitize middleware", async () => {
    expect(await exists(path.join(projectDir, "src/middleware/sanitize.ts"))).toBe(true);
  });

  it("uses xss for XSS protection", async () => {
    const m = await read(path.join(projectDir, "src/middleware/sanitize.ts"));
    expect(m).toContain("xss");
    expect(m).toContain("sanitizeInput");
  });

  it("uses express-mongo-sanitize for NoSQL injection", async () => {
    const m = await read(path.join(projectDir, "src/middleware/sanitize.ts"));
    expect(m).toContain("mongoSanitize");
  });

  it("cleans body, params, query", async () => {
    const m = await read(path.join(projectDir, "src/middleware/sanitize.ts"));
    expect(m).toContain("req.body");
    expect(m).toContain("req.params");
  });

  it("registers sanitize in app.ts", async () => {
    const app = await read(path.join(projectDir, "src/app.ts"));
    expect(app).toContain("sanitizeInput");
  });

  it("records sanitize in manifest", async () => {
    const m = await readJson(path.join(projectDir, ".backgenrc.json"));
    expect(m.plugins).toHaveProperty("sanitize");
  });
});
