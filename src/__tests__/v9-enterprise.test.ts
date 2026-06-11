import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "child_process";
import { rmSync, existsSync, mkdirSync, readFileSync, accessSync } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI = path.resolve(__dirname, "../../dist/index.js");
const TEST_DIR = path.resolve(__dirname, "../../.test-output-v9");

function cli(args: string, cwd = TEST_DIR): string {
  return execSync(`node ${CLI} ${args}`, { cwd, encoding: "utf-8", stdio: "pipe" });
}

function exists(p: string): boolean {
  try { accessSync(p); return true; } catch { return false; }
}

function safeRmDir(dir: string): void {
  for (let i = 0; i < 5; i++) {
    try {
      rmSync(dir, { recursive: true, force: true });
      return;
    } catch {
      if (i < 4) new Promise(r => setTimeout(r, 200));
      else throw new Error(`Cannot remove ${dir} after 5 attempts`);
    }
  }
}

describe("V9 Enterprise", { timeout: 300_000 }, () => {
  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  it("audit plugin installs and adds AuditLog model", () => {
    const projectDir = path.join(TEST_DIR, "audit-test");
    safeRmDir(projectDir);
    mkdirSync(projectDir, { recursive: true });
    cli("init audit-test --defaults --skip-install");
    cli("add audit", projectDir);

    const schema = readFileSync(path.join(projectDir, "prisma", "schema.prisma"), "utf-8");
    expect(schema).toMatch(/model AuditLog\b/);
    expect(schema).toMatch(/actorId\s+String/);
    expect(schema).toMatch(/action\s+String/);
    expect(schema).toMatch(/resourceType\s+String/);
    expect(schema).toMatch(/resourceId\s+String/);
    expect(exists(path.join(projectDir, "src", "modules", "audit", "audit.service.ts"))).toBe(true);
    expect(exists(path.join(projectDir, "src", "modules", "audit", "audit.middleware.ts"))).toBe(true);
    expect(exists(path.join(projectDir, "src", "modules", "audit", "audit.routes.ts"))).toBe(true);
  });

  it("permissions plugin installs and adds Role/Permission models", () => {
    const projectDir = path.join(TEST_DIR, "perms-test");
    safeRmDir(projectDir);
    mkdirSync(projectDir, { recursive: true });
    cli("init perms-test --defaults --skip-install");
    cli("add permissions", projectDir);

    const schema = readFileSync(path.join(projectDir, "prisma", "schema.prisma"), "utf-8");
    expect(schema).toMatch(/model Role\b/);
    expect(schema).toMatch(/model Permission\b/);

    expect(exists(path.join(projectDir, "src", "modules", "permissions", "permission.service.ts"))).toBe(true);
    expect(exists(path.join(projectDir, "src", "modules", "permissions", "permission.middleware.ts"))).toBe(true);
    expect(exists(path.join(projectDir, "src", "modules", "permissions", "permission.routes.ts"))).toBe(true);
    expect(exists(path.join(projectDir, "src", "modules", "permissions", "role.service.ts"))).toBe(true);
    expect(exists(path.join(projectDir, "src", "modules", "permissions", "role.controller.ts"))).toBe(true);
  });

  it("saas-enterprise preset creates enterprise resource models", () => {
    const projectDir = path.join(TEST_DIR, "my-enterprise");
    safeRmDir(projectDir);
    mkdirSync(projectDir, { recursive: true });
    cli("init my-enterprise --preset saas-enterprise --defaults --skip-install");

    const schema = readFileSync(path.join(projectDir, "prisma", "schema.prisma"), "utf-8");
    expect(schema).toMatch(/model Organization\b/);
    expect(schema).toMatch(/model Team\b/);
    expect(schema).toMatch(/model Membership\b/);
    expect(schema).toMatch(/model Invitation\b/);
    expect(schema).toMatch(/model Plan\b/);
    expect(schema).toMatch(/model Subscription\b/);
    expect(schema).toMatch(/model Invoice\b/);
  });

  it("saas-enterprise preset integrates audit plugin", () => {
    const projectDir = path.join(TEST_DIR, "my-enterprise");
    expect(exists(path.join(projectDir, "src", "modules", "audit", "audit.service.ts"))).toBe(true);
  });
});
