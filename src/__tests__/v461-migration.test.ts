import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI = path.resolve(__dirname, "../../dist/index.js");
const TEST_DIR = path.resolve(__dirname, "../../.test-output-v461-migrate");

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

async function write(p: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content, "utf-8");
}

// Stub V4.6.0-style content for each flat middleware file.
const V460_STUBS: Record<string, string> = {
  "src/middleware/request-id.ts": `// V4.6.0 stub
export function requestId() { return "rid-v460"; }
`,
  "src/middleware/request-timeout.ts": `// V4.6.0 stub
export function requestTimeout() { return "timeout-v460"; }
`,
  "src/middleware/cors-strict.ts": `// V4.6.0 stub
export const corsStrict = "cors-v460";
`,
  "src/middleware/health.ts": `// V4.6.0 stub
export const healthCheck = "h-v460";
export const readyCheck = "r-v460";
`,
  "src/middleware/rate-limit.ts": `// V4.6.0 stub
export const rateLimit = "rl-v460";
`,
  "src/middleware/sanitize.ts": `// V4.6.0 stub
export const sanitizeBody = "sb-v460";
export const sanitizeNoSql = "sn-v460";
`,
  "src/middleware/error.ts": `// V4.6.0 stub
export const errorHandler = "e-v460";
`,
  "src/middleware/logger.ts": `// V4.6.0 stub
export const requestLogger = "l-v460";
`,
  "src/middleware/validate.ts": `// V4.6.0 stub
export const validate = "v-v460";
`,
};

const V460_APP_TS = `import express from "express";
import { requestId } from "./middleware/request-id.js";
import { requestTimeout } from "./middleware/request-timeout.js";
import { corsStrict } from "./middleware/cors-strict.js";
import { healthCheck, readyCheck } from "./middleware/health.js";
import { rateLimit } from "./middleware/rate-limit.js";
import { sanitizeBody, sanitizeNoSql } from "./middleware/sanitize.js";
import { errorHandler } from "./middleware/error.js";
import { requestLogger } from "./middleware/logger.js";
import { validate } from "./middleware/validate.js";

const app = express();
app.use(corsStrict);
app.use(requestId);
app.use(requestTimeout);
app.use(express.json());
app.use(sanitizeNoSql);
app.use(sanitizeBody);
app.use(requestLogger);
app.get("/health", healthCheck);
app.get("/ready", readyCheck);
app.use(errorHandler);
export { app };
`;

describe("V4.6.0 → V4.6.1 migration", () => {
  const projectDir = path.join(TEST_DIR, "demo");

  beforeAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    await fs.mkdir(TEST_DIR, { recursive: true });

    // Init project, then forcibly flatten back to V4.6.0 layout.
    cli("init demo --defaults --skip-install", TEST_DIR);

    // Delete any V4.6.1 subfolder files (so they don't block migration)
    for (const sub of ["observability", "security", "core"]) {
      await fs.rm(path.join(projectDir, "src/middleware", sub), { recursive: true, force: true });
    }

    // Write V4.6.0 flat stubs
    for (const [rel, content] of Object.entries(V460_STUBS)) {
      await write(path.join(projectDir, rel), content);
    }

    // Write V4.6.0-style app.ts
    await write(path.join(projectDir, "src/app.ts"), V460_APP_TS);

    // Run sync with --yes to auto-confirm migration
    cli("sync --yes", projectDir);
  });

  afterAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("file moves", () => {
    it("removes old flat files", async () => {
      expect(await exists(path.join(projectDir, "src/middleware/request-id.ts"))).toBe(false);
      expect(await exists(path.join(projectDir, "src/middleware/request-timeout.ts"))).toBe(false);
      expect(await exists(path.join(projectDir, "src/middleware/cors-strict.ts"))).toBe(false);
      expect(await exists(path.join(projectDir, "src/middleware/health.ts"))).toBe(false);
      expect(await exists(path.join(projectDir, "src/middleware/rate-limit.ts"))).toBe(false);
      expect(await exists(path.join(projectDir, "src/middleware/sanitize.ts"))).toBe(false);
      expect(await exists(path.join(projectDir, "src/middleware/error.ts"))).toBe(false);
      expect(await exists(path.join(projectDir, "src/middleware/logger.ts"))).toBe(false);
      expect(await exists(path.join(projectDir, "src/middleware/validate.ts"))).toBe(false);
    });

    it("creates observability/ files", async () => {
      expect(await exists(path.join(projectDir, "src/middleware/observability/request-id.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/middleware/observability/request-timeout.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/middleware/observability/health.ts"))).toBe(true);
    });

    it("creates security/ files", async () => {
      expect(await exists(path.join(projectDir, "src/middleware/security/cors-strict.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/middleware/security/rate-limit.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/middleware/security/sanitize.ts"))).toBe(true);
    });

    it("creates core/ files", async () => {
      expect(await exists(path.join(projectDir, "src/middleware/core/errors.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/middleware/core/logger.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/middleware/core/validate.ts"))).toBe(true);
    });

    it("preserves file content during move", async () => {
      const rid = await read(path.join(projectDir, "src/middleware/observability/request-id.ts"));
      expect(rid).toContain("V4.6.0 stub");
      expect(rid).toContain("requestId");
    });
  });

  describe("app.ts import rewrites", () => {
    let app: string;

    beforeAll(async () => {
      app = await read(path.join(projectDir, "src/app.ts"));
    });

    it("rewrites request-id import", async () => {
      expect(app).toContain("./middleware/observability/request-id.js");
      expect(app).not.toContain('./middleware/request-id.js"');
    });

    it("rewrites request-timeout import", async () => {
      expect(app).toContain("./middleware/observability/request-timeout.js");
    });

    it("rewrites cors-strict import", async () => {
      expect(app).toContain("./middleware/security/cors-strict.js");
    });

    it("rewrites health import", async () => {
      expect(app).toContain("./middleware/observability/health.js");
    });

    it("rewrites rate-limit import", async () => {
      expect(app).toContain("./middleware/security/rate-limit.js");
    });

    it("rewrites sanitize import", async () => {
      expect(app).toContain("./middleware/security/sanitize.js");
    });

    it("rewrites error import to core/errors", async () => {
      expect(app).toContain("./middleware/core/errors.js");
      expect(app).not.toContain('./middleware/error.js"');
    });

    it("rewrites logger import to core/logger", async () => {
      expect(app).toContain("./middleware/core/logger.js");
    });

    it("rewrites validate import to core/validate", async () => {
      expect(app).toContain("./middleware/core/validate.js");
    });
  });

  describe("idempotency", () => {
    it("second sync with --yes is a no-op (no flat files to move)", async () => {
      // Re-running sync should not error or re-move
      expect(() => cli("sync --yes", projectDir)).not.toThrow();
      // Files still in V4.6.1 subfolders
      expect(await exists(path.join(projectDir, "src/middleware/observability/request-id.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/middleware/security/cors-strict.ts"))).toBe(true);
    });
  });
});
