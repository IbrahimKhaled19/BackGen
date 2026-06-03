import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI = path.resolve(__dirname, "../../dist/index.js");
const TEST_DIR = path.resolve(__dirname, "../../.test-output-v46-hardening");

function cli(args: string, cwd = TEST_DIR): string {
  return execSync(`node ${CLI} ${args}`, {
    cwd,
    encoding: "utf-8",
    timeout: 120000,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

async function read(p: string): Promise<string> {
  return fs.readFile(p, "utf-8");
}

async function readJson(p: string): Promise<Record<string, unknown>> {
  return JSON.parse(await read(p));
}

describe("V4.6 hardening plugin", () => {
  const projectDir = path.join(TEST_DIR, "demo");

  beforeAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    await fs.mkdir(TEST_DIR, { recursive: true });
    cli("init demo --defaults --skip-install", TEST_DIR);
    cli("add hardening", projectDir);
  });

  afterAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  it("creates request-id middleware", async () => {
    const m = await read(path.join(projectDir, "src/middleware/request-id.ts"));
    expect(m).toContain("requestId");
    expect(m).toContain("x-request-id");
    expect(m).toContain("randomUUID");
  });

  it("creates request-timeout middleware", async () => {
    const m = await read(path.join(projectDir, "src/middleware/request-timeout.ts"));
    expect(m).toContain("requestTimeout");
    expect(m).toContain("408");
  });

  it("creates cors-strict middleware", async () => {
    const m = await read(path.join(projectDir, "src/middleware/cors-strict.ts"));
    expect(m).toContain("corsStrict");
    expect(m).toContain("CORS_ALLOWED_ORIGINS");
    expect(m).toContain("Access-Control-Allow-Origin");
  });

  it("creates health/ready middleware", async () => {
    const m = await read(path.join(projectDir, "src/middleware/health.ts"));
    expect(m).toContain("readyCheck");
    expect(m).toContain("prisma");
    expect(m).toContain('SELECT 1');
  });

  it("creates graceful-shutdown helper", async () => {
    const m = await read(path.join(projectDir, "src/middleware/graceful-shutdown.ts"));
    expect(m).toContain("attachGracefulShutdown");
    expect(m).toContain("SIGTERM");
    expect(m).toContain("SIGINT");
    expect(m).toContain("prisma.$disconnect");
  });

  it("creates error-envelope utility", async () => {
    const u = await read(path.join(projectDir, "src/utils/error-envelope.ts"));
    expect(u).toContain("sendError");
    expect(u).toContain("requestId");
    expect(u).toContain("RATE_LIMITED");
  });

  it("registers hardening middleware in app.ts", async () => {
    const app = await read(path.join(projectDir, "src/app.ts"));
    expect(app).toContain("requestId");
    expect(app).toContain("corsStrict");
    expect(app).toContain("requestTimeout");
    expect(app).toContain("BODY_SIZE_LIMIT");
    expect(app).toContain("readyCheck");
  });

  it("adds hardening env vars to .env.example", async () => {
    const env = await read(path.join(projectDir, ".env.example"));
    expect(env).toContain("BODY_SIZE_LIMIT");
    expect(env).toContain("REQUEST_TIMEOUT_MS");
    expect(env).toContain("CORS_ALLOWED_ORIGINS");
  });

  it("adds env schema entries in config/env.ts", async () => {
    const env = await read(path.join(projectDir, "src/config/env.ts"));
    expect(env).toContain("BODY_SIZE_LIMIT");
    expect(env).toContain("REQUEST_TIMEOUT_MS");
    expect(env).toContain("CORS_ALLOWED_ORIGINS");
  });

  it("records hardening in manifest", async () => {
    const m = await readJson(path.join(projectDir, ".backgenrc.json"));
    expect(m.plugins).toHaveProperty("hardening");
  });
});
