import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "child_process";
import { rmSync } from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI = path.resolve(__dirname, "../../dist/index.js");
const TEST_DIR = path.resolve(__dirname, "../../.test-output");

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

function safeRm(dir: string): void {
  for (let i = 0; i < 10; i++) {
    try { rmSync(dir, { recursive: true, force: true }); return; } catch {}
    // On Windows, cmd.exe rd /s /q handles locked handles better than node rmSync
    try { execSync(`rd /s /q "${dir}"`, { shell: "cmd.exe", stdio: "ignore" }); } catch {}
    try { rmSync(dir, { recursive: true, force: true }); return; } catch {}
    execSync("node -e \"setTimeout(() => {}, 500)\"", { stdio: "ignore" });
  }
}

describe("BackGen E2E", () => {
  const projectDir = path.join(TEST_DIR, "my-api");

  beforeAll(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    // Clean up leftover dirs from previous runs
    safeRm(path.join(TEST_DIR, "my-api"));
    safeRm(path.join(TEST_DIR, "demo-drizzle"));
    safeRm(path.join(TEST_DIR, "demo-mongo"));
    safeRm(path.join(TEST_DIR, "demo-mongo-gen"));
    cli("init my-api --defaults --skip-install");
  });

  // ── Init ──────────────────────────────────────────────

  describe("init", () => {
    it("creates project directory", async () => {
      expect(await exists(projectDir)).toBe(true);
    });

    it("creates package.json with dependencies", async () => {
      const pkg = await readJson(path.join(projectDir, "package.json"));
      expect(pkg.name).toBe("my-api");
      expect(pkg.dependencies).toHaveProperty("express");
      expect(pkg.dependencies).toHaveProperty("@prisma/client");
      expect(pkg.dependencies).toHaveProperty("dotenv");
      expect(pkg.dependencies).toHaveProperty("zod");
    });

    it("creates tsconfig.json with strict mode", async () => {
      const ts = await readJson(path.join(projectDir, "tsconfig.json"));
      expect(ts.compilerOptions.strict).toBe(true);
    });

    it("creates .env.example with base vars only", async () => {
      const env = await read(path.join(projectDir, ".env.example"));
      expect(env).toContain("DATABASE_URL");
      expect(env).toContain("LOG_LEVEL");
      expect(env).not.toContain("JWT_SECRET");
    });

    it("creates app.ts with no auth routes", async () => {
      const app = await read(path.join(projectDir, "src/app.ts"));
      expect(app).toContain("express");
      expect(app).toContain("{{REGISTER_ROUTES}}");
      expect(app).not.toContain("authRoutes");
      expect(app).not.toContain("authMiddleware");
    });

    it("creates Prisma schema without auth models", async () => {
      const schema = await read(path.join(projectDir, "prisma/schema.prisma"));
      expect(schema).toContain("generator client");
      expect(schema).toContain("postgresql");
      expect(schema).not.toContain("model User");
    });

    it("creates .backgenrc.json manifest", async () => {
      const manifest = await readJson(path.join(projectDir, ".backgenrc.json"));
      expect(manifest.version).toBe("1.3.0");
      expect(manifest.project.name).toBe("my-api");
      expect(manifest.project.framework).toBe("express");
      expect(manifest.plugins).toEqual({});
    });

    it("creates shared middleware (core/security/observability subfolders)", async () => {
      expect(await exists(path.join(projectDir, "src/middleware/core/validate.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/middleware/core/errors.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/middleware/core/logger.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/middleware/security/sanitize.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/middleware/security/cors-strict.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/middleware/observability/request-id.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/middleware/observability/request-timeout.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/middleware/observability/health.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/middleware/graceful-shutdown.ts"))).toBe(true);
    });

    it("does NOT create auth middleware", async () => {
      expect(await exists(path.join(projectDir, "src/middleware/auth.ts"))).toBe(false);
    });

    it("does NOT create auth module", async () => {
      expect(await exists(path.join(projectDir, "src/modules/auth"))).toBe(false);
    });

    it("creates utils", async () => {
      expect(await exists(path.join(projectDir, "src/utils/api-error.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/utils/async-handler.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/utils/response.ts"))).toBe(true);
    });

    it("creates Docker files", async () => {
      expect(await exists(path.join(projectDir, "Dockerfile"))).toBe(true);
      expect(await exists(path.join(projectDir, "docker-compose.yml"))).toBe(true);
    });

    it("creates swagger config", async () => {
      expect(await exists(path.join(projectDir, "src/config/swagger.ts"))).toBe(true);
    });

    it("creates logger service", async () => {
      expect(await exists(path.join(projectDir, "src/services/logger.service.ts"))).toBe(true);
    });
  });

  // ── Init (Drizzle) ──────────────────────────────────────

  describe("init (Drizzle)", () => {
    const drizzleDir = path.join(TEST_DIR, "demo-drizzle");

    beforeAll(async () => {
      safeRm(drizzleDir);
      cli("init demo-drizzle --defaults --orm drizzle --skip-install", TEST_DIR);
    });

    it("creates project directory", async () => {
      expect(await exists(drizzleDir)).toBe(true);
    });

    it("creates package.json with Drizzle deps", async () => {
      const pkg = await readJson(path.join(drizzleDir, "package.json"));
      expect(pkg.name).toBe("demo-drizzle");
      expect(pkg.dependencies).toHaveProperty("drizzle-orm");
      expect(pkg.dependencies).toHaveProperty("pg");
      expect(pkg.dependencies).not.toHaveProperty("@prisma/client");
      expect(pkg.dependencies).not.toHaveProperty("mongoose");
    });

    it("creates Drizzle schema directory", async () => {
      expect(await exists(path.join(drizzleDir, "src/db/schema"))).toBe(true);
    });

    it("creates Drizzle config", async () => {
      expect(await exists(path.join(drizzleDir, "drizzle.config.ts"))).toBe(true);
    });

    it("does NOT create Prisma directory", async () => {
      expect(await exists(path.join(drizzleDir, "prisma"))).toBe(false);
    });

    it("creates .env.example with postgres URL", async () => {
      const env = await read(path.join(drizzleDir, ".env.example"));
      expect(env).toContain("postgresql://");
    });

    it("creates env.ts with URL validation", async () => {
      const envTs = await read(path.join(drizzleDir, "src/config/env.ts"));
      expect(envTs).toContain("z.string().url()");
    });

    it("creates .backgenrc.json with drizzle orm", async () => {
      const manifest = await readJson(path.join(drizzleDir, ".backgenrc.json"));
      expect(manifest.project.orm).toBe("drizzle");
    });
  });

  // ── Init (Mongoose) ─────────────────────────────────────

  describe("init (Mongoose)", () => {
    const mongoDir = path.join(TEST_DIR, "demo-mongo");

    beforeAll(async () => {
      safeRm(mongoDir);
      cli("init demo-mongo --defaults --orm mongoose --skip-install", TEST_DIR);
    });

    it("creates project directory", async () => {
      expect(await exists(mongoDir)).toBe(true);
    });

    it("creates package.json with Mongoose deps", async () => {
      const pkg = await readJson(path.join(mongoDir, "package.json"));
      expect(pkg.name).toBe("demo-mongo");
      expect(pkg.dependencies).toHaveProperty("mongoose");
      expect(pkg.dependencies).not.toHaveProperty("@prisma/client");
      expect(pkg.dependencies).not.toHaveProperty("drizzle-orm");
    });

    it("creates Mongoose models directory", async () => {
      expect(await exists(path.join(mongoDir, "src/models"))).toBe(true);
    });

    it("does NOT create Prisma or Drizzle directories", async () => {
      expect(await exists(path.join(mongoDir, "prisma"))).toBe(false);
      expect(await exists(path.join(mongoDir, "src/db"))).toBe(false);
    });

    it("creates .env.example with MongoDB URL", async () => {
      const env = await read(path.join(mongoDir, ".env.example"));
      expect(env).toContain("mongodb://");
    });

    it("creates env.ts with string validation (not URL)", async () => {
      const envTs = await read(path.join(mongoDir, "src/config/env.ts"));
      expect(envTs).toContain("DATABASE_URL: z.string()"); // mongoose uses z.string(), not z.string().url()
    });

    it("creates .backgenrc.json with mongoose orm", async () => {
      const manifest = await readJson(path.join(mongoDir, ".backgenrc.json"));
      expect(manifest.project.orm).toBe("mongoose");
    });
  });

  // ── Generate Resource (Mongoose) ────────────────────

  describe("generate resource (Mongoose)", () => {
    const mongoGenDir = path.join(TEST_DIR, "demo-mongo-gen");

    beforeAll(() => {
      cli("init demo-mongo-gen --orm mongoose --defaults --skip-install", TEST_DIR);
      cli("generate resource Product name:string price:number stock:number", mongoGenDir);
    });

    it("creates resource module files", async () => {
      expect(await exists(path.join(mongoGenDir, "src/modules/product/product.controller.ts"))).toBe(true);
      expect(await exists(path.join(mongoGenDir, "src/modules/product/product.service.ts"))).toBe(true);
      expect(await exists(path.join(mongoGenDir, "src/modules/product/product.repository.ts"))).toBe(true);
      expect(await exists(path.join(mongoGenDir, "src/modules/product/product.routes.ts"))).toBe(true);
      expect(await exists(path.join(mongoGenDir, "src/modules/product/product.types.ts"))).toBe(true);
      expect(await exists(path.join(mongoGenDir, "src/modules/product/product.validation.ts"))).toBe(true);
      expect(await exists(path.join(mongoGenDir, "src/modules/product/product.test.ts"))).toBe(true);
    });

    it("creates Mongoose model file", async () => {
      const model = await read(path.join(mongoGenDir, "src/models", "Product.model.ts"));
      expect(model).toContain("mongoose.model");
      expect(model).toContain("new Schema");
      expect(model).toContain("name: { type: String }");
      expect(model).toContain("price: { type: Number }");
    });

    it("registers resource routes in app.ts", async () => {
      const app = await read(path.join(mongoGenDir, "src/app.ts"));
      expect(app).toContain("productRoutes");
      expect(app).toContain("/api/products");
    });

    it("adds Mongoose model to barrel", async () => {
      const barrel = await read(path.join(mongoGenDir, "src/models", "index.ts"));
      expect(barrel).toContain("export { Product } from \"./Product.model.js\"");
    });
  });

  // ── Add Plugin: JWT ──────────────────────────────────

  describe("add jwt", () => {
    beforeAll(() => {
      cli("add jwt", projectDir);
    });

    it("creates auth module files", async () => {
      expect(await exists(path.join(projectDir, "src/modules/auth/auth.controller.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/modules/auth/auth.service.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/modules/auth/auth.routes.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/modules/auth/auth.types.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/modules/auth/auth.validation.ts"))).toBe(true);
    });

    it("creates auth middleware", async () => {
      expect(await exists(path.join(projectDir, "src/middleware/auth.ts"))).toBe(true);
    });

    it("creates role middleware", async () => {
      expect(await exists(path.join(projectDir, "src/middleware/role.ts"))).toBe(true);
    });

    it("registers auth routes in app.ts", async () => {
      const app = await read(path.join(projectDir, "src/app.ts"));
      expect(app).toContain("authRoutes");
      expect(app).toContain("/api/auth");
    });

    it("adds JWT env vars to .env.example", async () => {
      const env = await read(path.join(projectDir, ".env.example"));
      expect(env).toContain("JWT_SECRET");
      expect(env).toContain("JWT_REFRESH_SECRET");
    });

    it("adds jwt to manifest", async () => {
      const manifest = await readJson(path.join(projectDir, ".backgenrc.json"));
      expect(manifest.plugins).toHaveProperty("jwt");
      expect((manifest.plugins as Record<string, Record<string, string>>).jwt.version).toBe("1.0.0");
    });
  });

  // ── Add Plugin: Stripe ────────────────────────────────

  describe("add stripe", () => {
    beforeAll(() => {
      cli("add stripe", projectDir);
    });

    it("creates stripe module files", async () => {
      expect(await exists(path.join(projectDir, "src/modules/stripe/stripe.controller.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/modules/stripe/stripe.service.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/modules/stripe/stripe.routes.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/modules/stripe/stripe.types.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/modules/stripe/stripe.validation.ts"))).toBe(true);
    });

    it("registers stripe routes in app.ts", async () => {
      const app = await read(path.join(projectDir, "src/app.ts"));
      expect(app).toContain("stripeRoutes");
      expect(app).toContain("/api/payments");
    });

    it("adds Stripe env vars to .env.example", async () => {
      const env = await read(path.join(projectDir, ".env.example"));
      expect(env).toContain("STRIPE_SECRET_KEY");
      expect(env).toContain("STRIPE_WEBHOOK_SECRET");
    });

    it("adds stripe to manifest", async () => {
      const manifest = await readJson(path.join(projectDir, ".backgenrc.json"));
      expect(manifest.plugins).toHaveProperty("stripe");
    });
  });

  // ── Add Plugin: S3 ────────────────────────────────────

  describe("add s3", () => {
    beforeAll(() => {
      cli("add s3", projectDir);
    });

    it("creates storage module files", async () => {
      expect(await exists(path.join(projectDir, "src/modules/storage/s3.controller.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/modules/storage/s3.service.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/modules/storage/s3.routes.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/modules/storage/s3.types.ts"))).toBe(true);
    });

    it("registers storage routes in app.ts", async () => {
      const app = await read(path.join(projectDir, "src/app.ts"));
      expect(app).toContain("storageRoutes");
      expect(app).toContain("/api/storage");
    });

    it("adds S3 env vars to .env.example", async () => {
      const env = await read(path.join(projectDir, ".env.example"));
      expect(env).toContain("AWS_ACCESS_KEY_ID");
      expect(env).toContain("AWS_S3_BUCKET");
    });

    it("adds s3 to manifest", async () => {
      const manifest = await readJson(path.join(projectDir, ".backgenrc.json"));
      expect(manifest.plugins).toHaveProperty("s3");
    });
  });

  // ── Generate Resource ─────────────────────────────────

  describe("generate resource", () => {
    beforeAll(() => {
      cli("generate resource Product name:string price:number stock:number", projectDir);
    });

    it("creates resource module files", async () => {
      expect(await exists(path.join(projectDir, "src/modules/product/product.controller.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/modules/product/product.service.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/modules/product/product.repository.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/modules/product/product.routes.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/modules/product/product.types.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/modules/product/product.validation.ts"))).toBe(true);
      expect(await exists(path.join(projectDir, "src/modules/product/product.test.ts"))).toBe(true);
    });

    it("registers resource routes in app.ts", async () => {
      const app = await read(path.join(projectDir, "src/app.ts"));
      expect(app).toContain("productRoutes");
      expect(app).toContain("/api/products");
    });

    it("adds Prisma model to schema", async () => {
      const schema = await read(path.join(projectDir, "prisma/schema.prisma"));
      expect(schema).toContain("model Product");
      expect(schema).toContain("name String");
      expect(schema).toContain("price Float");
      expect(schema).toContain("stock Float");
    });

    it("generates correct Zod validation", async () => {
      const val = await read(path.join(projectDir, "src/modules/product/product.validation.ts"));
      expect(val).toContain("z.string()");
      expect(val).toContain("z.number()");
    });

    it("rejects duplicate resource", () => {
      expect(() => {
        cli("generate resource Product name:string", projectDir);
      }).toThrow();
    });
  });

  // ── Generate Resource with Relations ──────────────────

  describe("generate resource with relations", () => {
    beforeAll(() => {
      cli("generate resource Appointment date:datetime status:string --relations doctor:Doctor", projectDir);
    });

    it("creates appointment module", async () => {
      expect(await exists(path.join(projectDir, "src/modules/appointment/appointment.controller.ts"))).toBe(true);
    });

    it("adds relation fields to Prisma schema", async () => {
      const schema = await read(path.join(projectDir, "prisma/schema.prisma"));
      expect(schema).toContain("model Appointment");
      expect(schema).toContain("doctorId String");
      expect(schema).toMatch(/doctor\s+Doctor @relation/);
      expect(schema).toContain("DateTime");
    });

    it("includes foreign key in validation", async () => {
      const val = await read(path.join(projectDir, "src/modules/appointment/appointment.validation.ts"));
      expect(val).toContain("doctorId");
      expect(val).toContain("z.string().uuid()");
    });
  });

  // ── Seed Generator ────────────────────────────────────

  describe("generate seed", () => {
    beforeAll(() => {
      cli("generate seed Product --count 5", projectDir);
    });

    it("creates seed file", async () => {
      expect(await exists(path.join(projectDir, "prisma/seeds/product.ts"))).toBe(true);
    });

    it("generates correct number of records", async () => {
      const seed = await read(path.join(projectDir, "prisma/seeds/product.ts"));
      expect(seed).toContain("i <= 5");
    });

    it("includes resource fields", async () => {
      const seed = await read(path.join(projectDir, "prisma/seeds/product.ts"));
      expect(seed).toContain("name:");
      expect(seed).toContain("price:");
    });
  });

  // ── Factory Generator ─────────────────────────────────

  describe("generate factory", () => {
    beforeAll(() => {
      cli("generate factory Product", projectDir);
    });

    it("creates factory file", async () => {
      expect(await exists(path.join(projectDir, "src/factories/product.factory.ts"))).toBe(true);
    });

    it("exports create function", async () => {
      const factory = await read(path.join(projectDir, "src/factories/product.factory.ts"));
      expect(factory).toContain("createProduct");
    });

    it("exports list function", async () => {
      const factory = await read(path.join(projectDir, "src/factories/product.factory.ts"));
      expect(factory).toContain("createProductList");
    });
  });

  // ── Sync ──────────────────────────────────────────────

  describe("sync", () => {
    it("runs without error", () => {
      expect(() => cli("sync", projectDir)).not.toThrow();
    });

    it("reinstalls missing plugin files", async () => {
      // Delete auth module (jwt plugin)
      safeRm(path.join(projectDir, "src/modules/auth"));
      expect(await exists(path.join(projectDir, "src/modules/auth"))).toBe(false);

      // Sync should restore it (jwt is still in manifest)
      cli("sync", projectDir);
      expect(await exists(path.join(projectDir, "src/modules/auth/auth.controller.ts"))).toBe(true);
    });
  });

  // ── Remove Plugin ─────────────────────────────────────

  describe("remove plugin", () => {
    it("removes plugin from manifest", async () => {
      // stripe was installed in add stripe test — remove it
      let manifest = await readJson(path.join(projectDir, ".backgenrc.json"));
      expect(manifest.plugins).toHaveProperty("stripe");

      cli("remove stripe", projectDir);
      manifest = await readJson(path.join(projectDir, ".backgenrc.json"));
      expect(manifest.plugins).not.toHaveProperty("stripe");
    });
  });

  // ── Doctor ────────────────────────────────────────────

  describe("doctor", () => {
    it("runs without error", () => {
      expect(() => cli("doctor", projectDir)).not.toThrow();
    });

    it("reports Node.js and npm checks", () => {
      const output = cli("doctor", projectDir);
      expect(output).toContain("Node.js");
      expect(output).toContain("npm");
    });
  });

  // ── Error Handling ────────────────────────────────────

  describe("error handling", () => {
    it("rejects unknown plugin", () => {
      expect(() => cli("add unknown-plugin", projectDir)).toThrow();
    });

    it("rejects init on non-empty directory", () => {
      expect(() => cli("init my-api --defaults", TEST_DIR)).toThrow();
    });
  });
});
