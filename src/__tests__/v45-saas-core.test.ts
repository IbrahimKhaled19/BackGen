import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import { rmSync } from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI = path.resolve(__dirname, "../../dist/index.js");
const TEST_DIR = path.resolve(__dirname, "../../.test-output-v45");

function safeRm(dir: string): void {
  for (let i = 0; i < 15; i++) {
    try { rmSync(dir, { recursive: true, force: true }); return; } catch {
      execSync("node -e \"setTimeout(() => {}, 1000)\"", { stdio: "ignore" });
    }
  }
}

function cli(args: string, cwd = TEST_DIR): string {
  return execSync(`node ${CLI} ${args}`, {
    cwd,
    encoding: "utf-8",
    stdio: "pipe",
  });
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readFile(p: string): Promise<string> {
  return fs.readFile(p, "utf-8");
}

describe("V4.5 SaaS Core preset", () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    // Clean up leftover dirs from previous runs
    for (const name of ["my-saas", "no-auth", "mid-test", "app-ts-test", "manifest-test", "legacy", "old-saas"]) {
      safeRm(path.join(TEST_DIR, name));
    }
  });

  afterAll(() => Promise.resolve());

  it("creates Organization, Team models with saas-core preset", async () => {
    cli("init my-saas --preset saas-core --defaults --skip-install");

    const projectDir = path.join(TEST_DIR, "my-saas");
    const schema = await readFile(path.join(projectDir, "prisma", "schema.prisma"));

    expect(schema).toMatch(/model Organization\b/);
    expect(schema).toMatch(/model Team\b/);
    // Organization should have soft-delete field
    expect(schema).toMatch(/model Organization[\s\S]*deletedAt DateTime\?/);
  });

  it("skips Membership/Invitation when no auth plugin installed", async () => {
    cli("init no-auth --preset saas-core --defaults --skip-install");

    const projectDir = path.join(TEST_DIR, "no-auth");
    const schema = await readFile(path.join(projectDir, "prisma", "schema.prisma"));

    // Organization + Team generated
    expect(schema).toMatch(/model Organization\b/);
    expect(schema).toMatch(/model Team\b/);

    // Membership + Invitation skipped (require User model)
    expect(schema).not.toMatch(/model Membership\b/);
    expect(schema).not.toMatch(/model Invitation\b/);
  });

  it("generates tenant and RBAC middleware files", async () => {
    cli("init mid-test --preset saas-core --defaults --skip-install");

    const projectDir = path.join(TEST_DIR, "mid-test");

    expect(await exists(path.join(projectDir, "src", "middleware", "tenant.ts"))).toBe(true);
    expect(await exists(path.join(projectDir, "src", "middleware", "rbac.ts"))).toBe(true);

    const tenant = await readFile(path.join(projectDir, "src", "middleware", "tenant.ts"));
    expect(tenant).toMatch(/tenantMiddleware/);
    expect(tenant).toMatch(/req\.organization/);
    expect(tenant).toMatch(/x-org-id/);

    const rbac = await readFile(path.join(projectDir, "src", "middleware", "rbac.ts"));
    expect(rbac).toMatch(/requireRole/);
    expect(rbac).toMatch(/"OWNER"/);
    expect(rbac).toMatch(/"ADMIN"/);
    expect(rbac).toMatch(/"MEMBER"/);
    expect(rbac).toMatch(/"VIEWER"/);
  });

  it("registers tenantMiddleware in app.ts after preset install", async () => {
    cli("init app-ts-test --preset saas-core --defaults --skip-install");

    const projectDir = path.join(TEST_DIR, "app-ts-test");
    const app = await readFile(path.join(projectDir, "src", "app.ts"));

    expect(app).toMatch(/tenantMiddleware/);
    expect(app).toMatch(/import\s*\{[^}]*tenantMiddleware[^}]*\}\s*from\s*["']\.\/middleware\/tenant/);
  });

  it("records preset name in .backgenrc.json", async () => {
    cli("init manifest-test --preset saas-core --defaults --skip-install");

    const projectDir = path.join(TEST_DIR, "manifest-test");
    const manifest = JSON.parse(
      await readFile(path.join(projectDir, ".backgenrc.json"))
    );

    expect(manifest.version).toBe("1.3.0");
    expect(manifest.project.preset).toBe("saas-core");
  });

  it("manifest without preset field reads without error (backward compat)", async () => {
    cli("init legacy --defaults --skip-install");

    const projectDir = path.join(TEST_DIR, "legacy");
    const manifestPath = path.join(projectDir, ".backgenrc.json");
    const raw = await readFile(manifestPath);
    const manifest = JSON.parse(raw);

    // Old manifests (no preset field) should still parse
    expect(manifest.version).toBeDefined();
    expect(manifest.project.preset).toBeUndefined();

    // Sync should not crash
    cli("sync", projectDir);
  });

  it("deprecated 'saas' preset still works (no removal)", async () => {
    cli("init old-saas --preset saas --defaults --skip-install");

    const projectDir = path.join(TEST_DIR, "old-saas");
    const schema = await readFile(path.join(projectDir, "prisma", "schema.prisma"));

    // Should still have the old resources including billing
    expect(schema).toMatch(/model Organization\b/);
    expect(schema).toMatch(/model Subscription\b/);
  });
});

describe("V4.5 --soft-delete flag on resource generator", () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    // Clean up leftover dirs
    for (const name of ["sd-test", "no-sd"]) {
      safeRm(path.join(TEST_DIR, name));
    }
  });

  afterAll(() => Promise.resolve());

  it("adds deletedAt field when --soft-delete is used", async () => {
    cli("init sd-test --defaults --skip-install");

    const projectDir = path.join(TEST_DIR, "sd-test");
    cli("generate resource Article title:string body:string --soft-delete", projectDir);

    const schema = await readFile(path.join(projectDir, "prisma", "schema.prisma"));
    expect(schema).toMatch(/model Article[\s\S]*deletedAt DateTime\?/);

    const types = await readFile(path.join(projectDir, "src", "modules", "article", "article.types.ts"));
    expect(types).toMatch(/deletedAt: Date \| null/);

    const repo = await readFile(path.join(projectDir, "src", "modules", "article", "article.repository.ts"));
    expect(repo).toMatch(/where\.deletedAt = null/);
    expect(repo).toMatch(/async restore\(/);
  });

  it("omits deletedAt when --soft-delete not used (default behavior)", async () => {
    cli("init no-sd --defaults --skip-install");

    const projectDir = path.join(TEST_DIR, "no-sd");
    cli("generate resource Note content:string", projectDir);

    const schema = await readFile(path.join(projectDir, "prisma", "schema.prisma"));
    expect(schema).toMatch(/model Note\b/);
    expect(schema).not.toMatch(/model Note[\s\S]*deletedAt/);
  });
});

describe("V1.8 Drizzle ORM schema generation", () => {
  const DRIZZLE_DIR = path.resolve(__dirname, "../../.test-output-drizzle");

  beforeAll(async () => {
    await fs.mkdir(DRIZZLE_DIR, { recursive: true }).catch(() => {});
    // Clean up leftover dirs
    for (const name of ["drizzle-base", "drizzle-saas", "drizzle-gen"]) {
      safeRm(path.join(DRIZZLE_DIR, name));
    }
  });

  afterAll(() => Promise.resolve());

  it("init --orm drizzle creates schema barrel and config", async () => {
    cli("init drizzle-base --orm drizzle --defaults --skip-install", DRIZZLE_DIR);

    const projectDir = path.join(DRIZZLE_DIR, "drizzle-base");

    // drizzle.config.ts
    const config = await readFile(path.join(projectDir, "drizzle.config.ts"));
    expect(config).toMatch(/defineConfig/);
    expect(config).toMatch(/schema.*\.\/src\/db\/schema\/index\.ts/);
    expect(config).toMatch(/dialect.*postgresql/);

    // Barrel should exist (even if empty — template registered in generateTemplates)
    const barrel = await readFile(path.join(projectDir, "src", "db", "schema", "index.ts"));
    expect(barrel).toMatch(/Barrel export for Drizzle ORM/);
  });

  it("init --orm drizzle --preset saas-core creates Drizzle schema files", async () => {
    cli("init drizzle-saas --orm drizzle --preset saas-core --defaults --skip-install", DRIZZLE_DIR);

    const projectDir = path.join(DRIZZLE_DIR, "drizzle-saas");

    // Schema files exist
    const schemaFiles = await fs.readdir(path.join(projectDir, "src", "db", "schema"));
    expect(schemaFiles).toContain("index.ts");
    expect(schemaFiles.some((f) => f.startsWith("organization"))).toBe(true);
    expect(schemaFiles.some((f) => f.startsWith("team"))).toBe(true);

    // Barrel exports
    const barrel = await readFile(path.join(projectDir, "src", "db", "schema", "index.ts"));
    expect(barrel).toMatch(/export.*Organization.*organization/);
    expect(barrel).toMatch(/export.*Team.*team/);

    // Schema file has pgTable and columns
    const orgSchema = await readFile(
      path.join(projectDir, "src", "db", "schema", "organization.ts")
    );
    expect(orgSchema).toMatch(/pgTable/);
    expect(orgSchema).toMatch(/name.*text/);
    expect(orgSchema).toMatch(/slug.*text/);
    expect(orgSchema).toMatch(/deletedAt.*timestamp/);
  });

  it("tenant middleware uses Drizzle imports for --orm drizzle", async () => {
    const projectDir = path.join(DRIZZLE_DIR, "drizzle-saas");

    const tenant = await readFile(path.join(projectDir, "src", "middleware", "tenant.ts"));
    // Debug: check ORM in manifest
    const manifest = JSON.parse(
      await readFile(path.join(projectDir, ".backgenrc.json"))
    );
    expect(manifest.project.orm).toBe("drizzle");
    expect(tenant).toMatch(/import.*db.*config\/database/);
    expect(tenant).toMatch(/import.*Organization.*db\/schema/);
    expect(tenant).toMatch(/import.*eq.*and.*isNull.*from.*drizzle-orm/);
    expect(tenant).toMatch(/db\s*\.select/);
    expect(tenant).not.toMatch(/prisma/);
  });

  it("rbac middleware uses Drizzle imports for --orm drizzle", async () => {
    const projectDir = path.join(DRIZZLE_DIR, "drizzle-saas");

    const rbac = await readFile(path.join(projectDir, "src", "middleware", "rbac.ts"));
    const manifest = JSON.parse(
      await readFile(path.join(projectDir, ".backgenrc.json"))
    );
    expect(manifest.project.orm).toBe("drizzle");
    expect(rbac).toMatch(/import.*db.*config\/database/);
    expect(rbac).toMatch(/import.*Membership.*db\/schema/);
    expect(rbac).toMatch(/import.*eq.*and.*isNull.*from.*drizzle-orm/);
    expect(rbac).toMatch(/db\s*\.select/);
    expect(rbac).not.toMatch(/prisma/);
  });

  it("generate resource adds Drizzle schema file and updates barrel", async () => {
    cli("init drizzle-gen --orm drizzle --defaults --skip-install", DRIZZLE_DIR);

    const projectDir = path.join(DRIZZLE_DIR, "drizzle-gen");
    cli("generate resource Post title:string body:string --soft-delete", projectDir);

    // Schema file created
    const postSchema = await readFile(
      path.join(projectDir, "src", "db", "schema", "post.ts")
    );
    expect(postSchema).toMatch(/pgTable\("post"/);
    expect(postSchema).toMatch(/title.*text/);
    expect(postSchema).toMatch(/body.*text/);
    expect(postSchema).toMatch(/deletedAt.*timestamp/);

    // Barrel updated
    const barrel = await readFile(path.join(projectDir, "src", "db", "schema", "index.ts"));
    expect(barrel).toMatch(/export.*Post.*post/);
  });
});

describe("V1.8 Mongoose ORM schema generation", () => {
  const MONGOOSE_DIR = path.resolve(__dirname, "../../.test-output-mongoose");

  beforeAll(async () => {
    await fs.mkdir(MONGOOSE_DIR, { recursive: true }).catch(() => {});
    // Clean up leftover dirs
    for (const name of ["mongoose-base", "mongoose-saas", "mongoose-gen"]) {
      safeRm(path.join(MONGOOSE_DIR, name));
    }
  });

  afterAll(() => Promise.resolve());

  it("init --orm mongoose creates models barrel", async () => {
    cli("init mongoose-base --orm mongoose --defaults --skip-install", MONGOOSE_DIR);

    const projectDir = path.join(MONGOOSE_DIR, "mongoose-base");

    // Barrel should exist (template registered in generateTemplates)
    const barrel = await readFile(path.join(projectDir, "src", "models", "index.ts"));
    expect(barrel).toMatch(/Barrel export for Mongoose models/);

    // Database config uses mongoose
    const dbConfig = await readFile(path.join(projectDir, "src", "config", "database.ts"));
    expect(dbConfig).toMatch(/import mongoose from "mongoose"/);
    expect(dbConfig).toMatch(/connectDatabase/);
  });

  it("init --orm mongoose --preset saas-core creates Mongoose model files", async () => {
    cli("init mongoose-saas --orm mongoose --preset saas-core --defaults --skip-install", MONGOOSE_DIR);

    const projectDir = path.join(MONGOOSE_DIR, "mongoose-saas");

    // Model files exist
    const modelFiles = await fs.readdir(path.join(projectDir, "src", "models"));
    expect(modelFiles).toContain("index.ts");
    expect(modelFiles.some((f) => f.startsWith("Organization"))).toBe(true);
    expect(modelFiles.some((f) => f.startsWith("Team"))).toBe(true);

    // Barrel exports
    const barrel = await readFile(path.join(projectDir, "src", "models", "index.ts"));
    expect(barrel).toMatch(/export.*Organization.*Organization/);
    expect(barrel).toMatch(/export.*Team.*Team/);

    // Model file has mongoose.model and Schema
    const orgModel = await readFile(
      path.join(projectDir, "src", "models", "Organization.model.ts")
    );
    expect(orgModel).toMatch(/mongoose\.model/);
    expect(orgModel).toMatch(/new Schema/);
    expect(orgModel).toMatch(/name.*String/);
    expect(orgModel).toMatch(/slug.*String/);
    expect(orgModel).toMatch(/deletedAt.*Date/);
  });

  it("tenant middleware uses Mongoose imports for --orm mongoose", async () => {
    const projectDir = path.join(MONGOOSE_DIR, "mongoose-saas");

    const tenant = await readFile(path.join(projectDir, "src", "middleware", "tenant.ts"));
    const manifest = JSON.parse(
      await readFile(path.join(projectDir, ".backgenrc.json"))
    );
    expect(manifest.project.orm).toBe("mongoose");
    expect(tenant).toMatch(/import.*Organization.*models\/index/);
    expect(tenant).not.toMatch(/prisma/);
    expect(tenant).not.toMatch(/drizzle/);
  });

  it("rbac middleware uses Mongoose imports for --orm mongoose", async () => {
    const projectDir = path.join(MONGOOSE_DIR, "mongoose-saas");

    const rbac = await readFile(path.join(projectDir, "src", "middleware", "rbac.ts"));
    const manifest = JSON.parse(
      await readFile(path.join(projectDir, ".backgenrc.json"))
    );
    expect(manifest.project.orm).toBe("mongoose");
    expect(rbac).toMatch(/import.*Membership.*models\/index/);
    expect(rbac).not.toMatch(/prisma/);
    expect(rbac).not.toMatch(/drizzle/);
  });

  it("generate resource adds Mongoose model file and updates barrel", async () => {
    cli("init mongoose-gen --orm mongoose --defaults --skip-install", MONGOOSE_DIR);

    const projectDir = path.join(MONGOOSE_DIR, "mongoose-gen");
    cli("generate resource Post title:string body:string --soft-delete", projectDir);

    // Model file created
    const postModel = await readFile(
      path.join(projectDir, "src", "models", "Post.model.ts")
    );
    expect(postModel).toMatch(/mongoose\.model.*Post/);
    expect(postModel).toMatch(/title.*String/);
    expect(postModel).toMatch(/body.*String/);
    expect(postModel).toMatch(/deletedAt.*Date/);

    // Barrel updated
    const barrel = await readFile(path.join(projectDir, "src", "models", "index.ts"));
    expect(barrel).toMatch(/export.*\{ Post \}.*Post\.model/);
  });
});
