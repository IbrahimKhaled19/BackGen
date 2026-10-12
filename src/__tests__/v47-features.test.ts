import { describe, it, expect } from "vitest";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import {
  schemaToTsType,
  schemaToZod,
  categorizePaths,
  type OpenAPIDoc,
  type SchemaObject,
} from "../core/openapi-codegen.js";
import { PrismaSchemaGenerator } from "../core/schema-generator.prisma.js";
import { DrizzleSchemaGenerator } from "../core/schema-generator.drizzle.js";
import { cli } from "./helpers.js";

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function s(schema: Partial<SchemaObject>): SchemaObject {
  return schema as SchemaObject;
}

async function tmpDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

// â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("openapi-codegen â€” schemaToTsType", () => {
  it("converts basic types", () => {
    expect(schemaToTsType(s({ type: "string" }))).toBe("string");
    expect(schemaToTsType(s({ type: "integer" }))).toBe("number");
    expect(schemaToTsType(s({ type: "number" }))).toBe("number");
    expect(schemaToTsType(s({ type: "boolean" }))).toBe("boolean");
  });

  it("converts array types", () => {
    expect(schemaToTsType(s({ type: "array", items: { type: "string" } }))).toBe("string[]");
    expect(schemaToTsType(s({ type: "array", items: { type: "integer" } }))).toBe("number[]");
  });

  it("resolves $ref references", () => {
    expect(schemaToTsType(s({ $ref: "#/components/schemas/User" }))).toBe("User");
    expect(schemaToTsType(s({ $ref: "#/definitions/Order" }))).toBe("Order");
  });

  it("handles null/undefined schema", () => {
    expect(schemaToTsType(undefined)).toBe("any");
  });

  it("handles oneOf and allOf", () => {
    expect(
      schemaToTsType(s({ oneOf: [{ type: "string" }, { type: "integer" }] }))
    ).toBe("string | number");
  });
});

describe("openapi-codegen â€” schemaToZod", () => {
  it("generates Zod schemas for primitives", () => {
    expect(schemaToZod(s({ type: "string" }), 0).trim()).toBe("z.string()");
    expect(schemaToZod(s({ type: "integer" }), 0).trim()).toBe("z.number().int()");
    expect(schemaToZod(s({ type: "boolean" }), 0).trim()).toBe("z.boolean()");
    expect(schemaToZod(s({ type: "number" }), 0).trim()).toBe("z.number()");
  });

  it("generates Zod schemas for arrays", () => {
    expect(schemaToZod(s({ type: "array", items: { type: "string" } }), 0).trim()).toContain(
      "z.array(z.string())"
    );
  });

  it("generates Zod schemas for nullable", () => {
    expect(schemaToZod(s({ type: "string", nullable: true }), 0).trim()).toContain(".nullable()");
  });

  it("marks only required object fields as non-optional", () => {
    const result = schemaToZod(
      s({
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          email: { type: "string" },
        },
        required: ["id", "email"],
      }),
      0
    ).trim();

    expect(result).toContain("id: z.number().int()");
    expect(result).toContain("name: z.string().optional()");
    expect(result).toContain("email: z.string(),");
    expect(result).not.toContain("email: z.string().optional()");
  });
});

describe("openapi-codegen â€” categorizePaths", () => {
  it("groups paths by tag", () => {
    const doc: OpenAPIDoc = {
      openapi: "3.0.0",
      paths: {
        "/users": { get: { operationId: "listUsers", tags: ["Users"], responses: {} } },
        "/users/{id}": {
          get: {
            operationId: "getUser",
            tags: ["Users"],
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: {},
          },
        },
        "/orders": {
          post: { operationId: "createOrder", tags: ["Orders"], responses: {} },
        },
      },
    };

    const result = categorizePaths(doc);
    expect(Object.keys(result)).toEqual(["Users", "Orders"]);
    expect(result["Users"]).toHaveLength(2);
    expect(result["Orders"]).toHaveLength(1);
  });

  it("falls back to first path segment when no tag", () => {
    const result = categorizePaths({
      openapi: "3.0.0",
      paths: { "/api/v1/products": { get: { operationId: "listProducts", responses: {} } } },
    });
    expect(Object.keys(result)).toContain("api");
  });

  it("returns empty for docs with no paths", () => {
    expect(categorizePaths({ openapi: "3.0.0" })).toEqual({});
  });
});

// â”€â”€ Regression: generated Prisma models must have an id â”€â”€â”€â”€â”€â”€â”€â”€

describe("PrismaSchemaGenerator.addModel", () => {
  it("emits a uuid primary key so the generated types and repository compile", async () => {
    const dir = await tmpDir("bg-prisma-");
    await fs.mkdir(path.join(dir, "prisma"), { recursive: true });
    const schemaPath = path.join(dir, "prisma", "schema.prisma");
    await fs.writeFile(schemaPath, 'model Existing {\n  id String @id\n}\n', "utf-8");

    const gen = new PrismaSchemaGenerator();
    await gen.addModel(
      dir,
      "Product",
      [
        { name: "name", type: "string", zodType: "z.string()", tsType: "string" },
        { name: "price", type: "number", zodType: "z.number()", tsType: "number" },
      ],
      [],
      false
    );

    const schema = await fs.readFile(schemaPath, "utf-8");
    expect(schema).toMatch(/model Product \{/);
    expect(schema).toContain("id String @id @default(uuid())");
    expect(schema).toContain("name String");
    expect(schema).toContain("price Float");
    // The existing model must survive intact
    expect(schema).toContain("model Existing {");
  });

  it("adds a tombstone column only when soft delete is requested", async () => {
    const dir = await tmpDir("bg-prisma-soft-");
    await fs.mkdir(path.join(dir, "prisma"), { recursive: true });
    await fs.writeFile(
      path.join(dir, "prisma", "schema.prisma"),
      'model Seed {\n  id String @id\n}\n',
      "utf-8"
    );

    const gen = new PrismaSchemaGenerator();
    await gen.addModel(
      dir,
      "Ticket",
      [{ name: "title", type: "string", zodType: "z.string()", tsType: "string" }],
      [],
      true
    );

    const schema = await fs.readFile(path.join(dir, "prisma", "schema.prisma"), "utf-8");
    expect(schema).toContain("deletedAt DateTime?");
  });
});

// â”€â”€ Regression: generated Drizzle models must import relations â”€â”€

describe("DrizzleSchemaGenerator.addModel", () => {
  it("imports `relations` from drizzle-orm when the model has relations", async () => {
    const dir = await tmpDir("bg-drizzle-");
    await fs.mkdir(path.join(dir, "src", "db", "schema"), { recursive: true });

    const gen = new DrizzleSchemaGenerator();
    await gen.addModel(
      dir,
      "Appointment",
      [{ name: "status", type: "string", zodType: "z.string()", tsType: "string" }],
      [{ name: "doctor", type: "belongsTo", target: "Doctor" }],
      false
    );

    const schema = await fs.readFile(
      path.join(dir, "src", "db", "schema", "appointment.ts"),
      "utf-8"
    );

    expect(schema).toContain('import { relations } from "drizzle-orm";');
    expect(schema).toContain("export const AppointmentDoctorRelation = relations(");
    // No unused specifiers left in the pg-core import
    const importLine = schema.split("\n").find((l) => l.includes("drizzle-orm/pg-core")) ?? "";
    expect(importLine).not.toContain("integer");
    expect(importLine).not.toContain("primaryKey");
  });
});

// â”€â”€ Regression: soft-delete must hide tombstones on the by-id path â”€â”€

describe("soft delete hides tombstones on every read path", () => {
  it("findById filters deletedAt, and still passes `where`", async () => {
    const root = await tmpDir("bg-soft-");
    cli(["init", "demo-api", "--defaults", "--skip-install"], root);
    const projectDir = path.join(root, "demo-api");
    cli(["generate", "resource", "Product", "name:string", "--soft-delete"], projectDir);

    const repo = await fs.readFile(
      path.join(projectDir, "src", "modules", "product", "product.repository.ts"),
      "utf-8"
    );

    // The by-id query must exclude tombstones, not just the list query
    const findById = repo.slice(repo.indexOf("async findById"), repo.indexOf("async findAll"));
    expect(findById).toContain("where.deletedAt = null");
    // ...and must still pass the where clause to Prisma
    expect(findById).toMatch(/findFirst\(\{\s*\n\s*where,/);
  });
});

// â”€â”€ Regression: worker + oauth2 plugins must install from dist/ â”€

describe("v4.7 plugins install from the published build", () => {
  it("`backgen add worker` creates a compilable worker module", async () => {
    const root = await tmpDir("bg-worker-");
    cli(["init", "demo-api", "--defaults", "--skip-install"], root);
    const projectDir = path.join(root, "demo-api");
    cli(["add", "worker", "--skip-install"], projectDir);

    const moduleDir = path.join(projectDir, "src", "modules", "worker");
    const names = await fs.readdir(moduleDir);

    // Files must be named so their relative imports resolve
    for (const expected of ["index.ts", "queue.ts", "base-handler.ts", "dashboard.ts", "types.ts"]) {
      expect(names).toContain(expected);
    }

    const queue = await fs.readFile(path.join(moduleDir, "queue.ts"), "utf-8");
    expect(queue).toContain('from "../../config/env.js"');
    expect(queue).toContain('from "./index.js"');
    expect(queue).toContain("env.REDIS_DB");

    // REDIS_DB must exist in the env schema or the template does not compile
    const env = await fs.readFile(path.join(projectDir, "src", "config", "env.ts"), "utf-8");
    expect(env).toContain("REDIS_DB");

    // The dashboard is mounted, so the exported symbol must match
    const app = await fs.readFile(path.join(projectDir, "src", "app.ts"), "utf-8");
    expect(app).toContain('import { workerDashboard } from "./modules/worker/dashboard.js";');
    const dashboard = await fs.readFile(path.join(moduleDir, "dashboard.ts"), "utf-8");
    expect(dashboard).toContain("export const router = Router();");
    expect(dashboard).toContain('from "./queue.js"');
  });

  it("`backgen generate job` writes handlers next to the worker module", async () => {
    const root = await tmpDir("bg-job-");
    cli(["init", "demo-api", "--defaults", "--skip-install"], root);
    const projectDir = path.join(root, "demo-api");
    cli(["add", "worker", "--skip-install"], projectDir);
    cli(["generate", "job", "send-email", "--queue", "emails", "--retry", "5"], projectDir);

    const moduleDir = path.join(projectDir, "src", "modules", "worker");
    const handler = await fs.readFile(path.join(moduleDir, "sendEmail.ts"), "utf-8");

    expect(handler).toContain('from "./base-handler.js"');
    expect(handler).toContain('from "./index.js"');
    expect(handler).toContain('export const JOB_NAME = "emails.sendEmail";');
    expect(handler).toContain("retry: 5");
    await expect(fs.access(path.join(moduleDir, "sendEmail.test.ts"))).resolves.toBeUndefined();
  });

  it("`backgen add oauth2` requires jwt and extends the Prisma User model", async () => {
    const root = await tmpDir("bg-oauth2-");
    cli(["init", "demo-api", "--defaults", "--skip-install"], root);
    const projectDir = path.join(root, "demo-api");

    // Without jwt it must refuse, not silently produce broken code
    expect(() => cli(["add", "oauth2", "--skip-install"], projectDir)).toThrow();

    cli(["add", "jwt", "--skip-install"], projectDir);
    cli(["add", "oauth2", "--skip-install"], projectDir);

    const schema = await fs.readFile(path.join(projectDir, "prisma", "schema.prisma"), "utf-8");
    expect(schema).toContain("oauthIdentities UserOAuthIdentity[]");
    expect(schema).toContain("model UserOAuthIdentity");

    // No tokens in the redirect URL, and no in-process state store
    const controller = await fs.readFile(
      path.join(projectDir, "src", "modules", "auth", "oauth2.controller.ts"),
      "utf-8"
    );
    expect(controller).not.toContain('searchParams.set("access_token"');
    expect(controller).not.toContain("new Map<string");
    expect(controller).not.toContain("setInterval");
    expect(controller).toContain('res.cookie("access_token"');
  });
});

// â”€â”€ Regression: uninstall must not undo other plugins â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("plugin uninstall is scoped to its own edits", () => {
  it("removing jwt leaves stripe and s3 registered in app.ts", async () => {
    const root = await tmpDir("bg-uninstall-");
    cli(["init", "demo-api", "--defaults", "--skip-install"], root);
    const projectDir = path.join(root, "demo-api");

    cli(["add", "jwt", "--skip-install"], projectDir);
    cli(["add", "stripe", "--skip-install"], projectDir);
    cli(["add", "s3", "--skip-install"], projectDir);

    cli(["remove", "jwt"], projectDir);

    const app = await fs.readFile(path.join(projectDir, "src", "app.ts"), "utf-8");
    expect(app).not.toContain("/api/auth");
    expect(app).not.toContain("optionalAuthMiddleware");
    // Plugins installed after jwt must survive the revert
    expect(app).toContain("/api/payments");
    expect(app).toContain("/api/storage");

    // Markers must still be present for future plugins
    expect(app).toContain("// {{REGISTER_ROUTES}}");

    // The shared auth stub must be restored, not deleted â€” every other route
    // module imports it, so removing it would break the whole project.
    const auth = await fs.readFile(path.join(projectDir, "src", "middleware", "auth.ts"), "utf-8");
    expect(auth).toContain("backgen add jwt");
    expect(auth).not.toContain("jwt.verify");
  });

  it("removing a plugin keeps env vars added after it", async () => {
    const root = await tmpDir("bg-uninstall-env-");
    cli(["init", "demo-api", "--defaults", "--skip-install"], root);
    const projectDir = path.join(root, "demo-api");

    cli(["add", "jwt", "--skip-install"], projectDir);
    const envPath = path.join(projectDir, ".env.example");
    await fs.appendFile(envPath, "\n# hand written\nMY_OWN_SETTING=keep-me\n", "utf-8");

    cli(["remove", "jwt"], projectDir);

    const env = await fs.readFile(envPath, "utf-8");
    expect(env).not.toContain("JWT_SECRET=");
    expect(env).toContain("MY_OWN_SETTING=keep-me");
  });
});