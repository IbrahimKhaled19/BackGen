import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI = path.resolve(__dirname, "../../dist/index.js");
const TEST_DIR = path.resolve(__dirname, "../../.test-output-v45");

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
  beforeAll(() => {
    return fs.rm(TEST_DIR, { recursive: true, force: true }).then(() =>
      fs.mkdir(TEST_DIR, { recursive: true })
    );
  });

  afterAll(() => {
    return fs.rm(TEST_DIR, { recursive: true, force: true });
  });

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

    expect(manifest.version).toBe("1.1.0");
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
  beforeAll(() => {
    return fs.rm(TEST_DIR, { recursive: true, force: true }).then(() =>
      fs.mkdir(TEST_DIR, { recursive: true })
    );
  });

  afterAll(() => {
    return fs.rm(TEST_DIR, { recursive: true, force: true });
  });

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
