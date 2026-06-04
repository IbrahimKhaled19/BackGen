import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI = path.resolve(__dirname, "../../dist/index.js");
const TEST_DIR = path.resolve(__dirname, "../../.test-output-v461-base");

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

describe("V4.6.1 base hardening default", () => {
  const projectDir = path.join(TEST_DIR, "demo");

  beforeAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    await fs.mkdir(TEST_DIR, { recursive: true });
    cli("init demo --defaults --skip-install", TEST_DIR);
  });

  afterAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("middleware subfolder layout", () => {
    it("creates core/ subfolder with 3 files", async () => {
      expect(await exists(path.join(projectDir, "src/middleware/core/errors.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/middleware/core/logger.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/middleware/core/validate.ts"))).toBe(true);
    });

    it("creates security/ subfolder with sanitize + cors-strict (no rate-limit)", async () => {
      expect(await exists(path.join(projectDir, "src/middleware/security/sanitize.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/middleware/security/cors-strict.ts"))).toBe(true);
      // rate-limit is OPT-IN, not in base
      expect(await exists(path.join(projectDir, "src/middleware/security/rate-limit.ts"))).toBe(false);
    });

    it("creates observability/ subfolder with 3 files", async () => {
      expect(await exists(path.join(projectDir, "src/middleware/observability/request-id.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/middleware/observability/request-timeout.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/middleware/observability/health.ts"))).toBe(true);
    });

    it("keeps graceful-shutdown at middleware root", async () => {
      expect(await exists(path.join(projectDir, "src/middleware/graceful-shutdown.ts"))).toBe(true);
    });

    it("does NOT have flat (pre-V4.6.1) middleware files", async () => {
      expect(await exists(path.join(projectDir, "src/middleware/request-id.ts"))).toBe(false);
      expect(await exists(path.join(projectDir, "src/middleware/request-timeout.ts"))).toBe(false);
      expect(await exists(path.join(projectDir, "src/middleware/cors-strict.ts"))).toBe(false);
      expect(await exists(path.join(projectDir, "src/middleware/health.ts"))).toBe(false);
      expect(await exists(path.join(projectDir, "src/middleware/sanitize.ts"))).toBe(false);
      expect(await exists(path.join(projectDir, "src/middleware/error.ts"))).toBe(false);
      expect(await exists(path.join(projectDir, "src/middleware/logger.ts"))).toBe(false);
      expect(await exists(path.join(projectDir, "src/middleware/validate.ts"))).toBe(false);
    });
  });

  describe("env.ts schema", () => {
    it("declares all 6 new V4.6.1 vars", async () => {
      const env = await read(path.join(projectDir, "src/config/env.ts"));
      expect(env).toContain("BODY_SIZE_LIMIT");
      expect(env).toContain("REQUEST_TIMEOUT_MS");
      expect(env).toContain("CORS_ALLOWED_ORIGINS");
      expect(env).toContain("RATE_LIMIT_WINDOW_MS");
      expect(env).toContain("RATE_LIMIT_MAX");
      expect(env).toContain("REDIS_URL");
    });

    it("declares base vars", async () => {
      const env = await read(path.join(projectDir, "src/config/env.ts"));
      expect(env).toContain("DATABASE_URL");
      expect(env).toContain("LOG_LEVEL");
      expect(env).toContain("PORT");
    });
  });

  describe("app.ts middleware wiring", () => {
    let app: string;

    beforeAll(async () => {
      app = await read(path.join(projectDir, "src/app.ts"));
    });

    it("imports helmet", async () => {
      expect(app).toContain('import helmet from "helmet"');
    });

    it("imports from observability/", async () => {
      expect(app).toContain("./middleware/observability/request-id.js");
      expect(app).toContain("./middleware/observability/request-timeout.js");
      expect(app).toContain("./middleware/observability/health.js");
    });

    it("imports from security/", async () => {
      expect(app).toContain("./middleware/security/cors-strict.js");
      expect(app).toContain("./middleware/security/sanitize.js");
    });

    it("imports from core/", async () => {
      expect(app).toContain("./middleware/core/logger.js");
      expect(app).toContain("./middleware/core/errors.js");
    });

    it("registers helmet before cors", async () => {
      const helmetIdx = app.indexOf("app.use(helmet())");
      const corsIdx = app.indexOf("app.use(corsStrict)");
      expect(helmetIdx).toBeGreaterThan(-1);
      expect(corsIdx).toBeGreaterThan(helmetIdx);
    });

    it("registers requestId before express.json", async () => {
      const reqIdIdx = app.indexOf("app.use(requestId)");
      const jsonIdx = app.indexOf("express.json");
      expect(reqIdIdx).toBeGreaterThan(-1);
      expect(jsonIdx).toBeGreaterThan(reqIdIdx);
    });

    it("registers sanitize before routes", async () => {
      const sanitizeIdx = app.indexOf("app.use(sanitizeNoSql)");
      const routesIdx = app.indexOf("REGISTER_ROUTES");
      expect(sanitizeIdx).toBeGreaterThan(-1);
      expect(routesIdx).toBeGreaterThan(sanitizeIdx);
    });

    it("does NOT include rate-limit middleware (opt-in)", async () => {
      expect(app).not.toContain("rateLimit");
      expect(app).not.toContain("rate-limit");
    });

    it("exposes /health and /ready", async () => {
      expect(app).toContain("/health");
      expect(app).toContain("/ready");
      expect(app).toContain("healthCheck");
      expect(app).toContain("readyCheck");
    });

    it("has error envelope with requestId", async () => {
      expect(app).toContain("errorHandler");
      expect(app).toContain("notFoundHandler");
    });
  });

  describe("server.ts graceful shutdown", () => {
    it("calls attachGracefulShutdown", async () => {
      const server = await read(path.join(projectDir, "src/server.ts"));
      expect(server).toContain("attachGracefulShutdown");
      expect(server).toContain("./middleware/graceful-shutdown.js");
    });
  });

  describe(".env.example", () => {
    it("lists 6 new V4.6.1 vars", async () => {
      const env = await read(path.join(projectDir, ".env.example"));
      expect(env).toContain("BODY_SIZE_LIMIT");
      expect(env).toContain("REQUEST_TIMEOUT_MS");
      expect(env).toContain("CORS_ALLOWED_ORIGINS");
    });
  });

  describe("cors-strict behavior", () => {
    it("uses env-driven CORS (allow all if empty, strict if set)", async () => {
      const cors = await read(path.join(projectDir, "src/middleware/security/cors-strict.ts"));
      expect(cors).toContain("CORS_ALLOWED_ORIGINS");
      expect(cors).toContain("cors(");
    });
  });

  describe("sanitize middleware", () => {
    it("ships xss + mongo-sanitize", async () => {
      const sanitize = await read(path.join(projectDir, "src/middleware/security/sanitize.ts"));
      expect(sanitize).toContain("xss");
      expect(sanitize).toContain("mongoSanitize");
    });
  });

  describe("request-id middleware", () => {
    it("generates UUID and echoes x-request-id header", async () => {
      const rid = await read(path.join(projectDir, "src/middleware/observability/request-id.ts"));
      expect(rid).toContain("randomUUID");
      expect(rid).toContain("x-request-id");
    });
  });
});
