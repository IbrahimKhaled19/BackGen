import * as fs from "fs/promises";
import * as path from "path";

// ── Types ──────────────────────────────────────────────────────

export interface OpenAPIDoc {
  openapi?: string;
  info?: { title?: string; version?: string };
  paths?: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, SchemaObject>;
  };
  definitions?: Record<string, SchemaObject>; // Swagger 2.0
}

interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  patch?: Operation;
  delete?: Operation;
  parameters?: ParameterObject[];
  summary?: string;
}

interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses?: Record<string, ResponseObject>;
}

interface ParameterObject {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required?: boolean;
  schema?: SchemaObject;
  description?: string;
}

interface RequestBodyObject {
  required?: boolean;
  content?: Record<string, MediaTypeObject>;
  description?: string;
}

interface MediaTypeObject {
  schema?: SchemaObject;
}

interface ResponseObject {
  description?: string;
  content?: Record<string, MediaTypeObject>;
}

interface SchemaObject {
  type?: string;
  format?: string;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  $ref?: string;
  items?: SchemaObject;
  additionalProperties?: boolean | SchemaObject;
  enum?: unknown[];
  description?: string;
  nullable?: boolean;
  oneOf?: SchemaObject[];
  allOf?: SchemaObject[];
}

// ── Helpers ────────────────────────────────────────────────────

/** @internal Exported for testing */
export function refToName($ref: string): string {
  return $ref.split("/").pop() ?? "Unknown";
}

/** @internal Exported for testing */
export function schemaToTsType(schema: SchemaObject | undefined): string {
  if (!schema) return "any";
  if (schema.$ref) return refToName(schema.$ref);
  if (schema.oneOf) {
    return schema.oneOf.map(schemaToTsType).join(" | ");
  }
  if (schema.allOf) {
    return schema.allOf.map(schemaToTsType).join(" & ");
  }
  switch (schema.type) {
    case "string":
      return "string";
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      return "object";
    case "array":
      return `${schemaToTsType(schema.items)}[]`;
    default:
      return "string";
  }
}

/** @internal Exported for testing */
export function schemaToZod(schema: SchemaObject | undefined, indent: number = 6): string {
  const pad = " ".repeat(indent);
  if (!schema) return `${pad}z.any()`;
  if (schema.$ref) return `${pad}zodRef("${refToName(schema.$ref)}")`;
  if (schema.oneOf) {
    const variants = schema.oneOf.map((s) => schemaToZod(s, 0).trim()).join(",\n${pad}");
    return `${pad}z.union([\n${pad}${variants}\n${pad}])`;
  }
  if (schema.nullable) {
    return `${pad}${schemaToZod({ ...schema, nullable: undefined }, 0).trim()}.nullable()`;
  }
  switch (schema.type) {
    case "integer":
      return `${pad}z.number().int()`;
    case "number":
      return `${pad}z.number()`;
    case "boolean":
      return `${pad}z.boolean()`;
    case "array": {
      const item = schemaToZod(schema.items, 0).trim();
      return `${pad}z.array(${item})`;
    }
    case "object": {
      if (!schema.properties) return `${pad}z.object({}).passthrough()`;
      const props = Object.entries(schema.properties).map(([key, prop]) => {
        const required = schema.required?.includes(key);
        const propZod = schemaToZod(prop, 0).trim();
        return `${pad}  ${key}: ${propZod}${required ? "" : ".optional()"},`;
      });
      return `z.object({\n${props.join("\n")}\n${pad}})`;
    }
    default:
      return `${pad}z.string()`;
  }
}

function operationToExpress(method: string, operation: Operation, basePath: string): string {
  const opName = operation.operationId ?? `${method}${basePath.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const hasBody = method === "post" || method === "put" || method === "patch";

  // Gather path params
  const pathParams = (operation.parameters ?? [])
    .filter((p: ParameterObject) => p.in === "path")
    .map((p: ParameterObject) => `:${p.name}`)
    .join("/");

  const fullPath = `${basePath}${pathParams ? `/${pathParams}` : ""}`;

  // Validation schemas derived from the spec — these are what `validate()` uses.
  const bodySchema = hasBody && operation.requestBody?.content?.["application/json"]?.schema
    ? schemaToZod(operation.requestBody.content["application/json"].schema, 0).trim()
    : null;

  const queryParams = (operation.parameters ?? []).filter((p: ParameterObject) => p.in === "query");
  const pathParamList = (operation.parameters ?? []).filter((p: ParameterObject) => p.in === "path");

  const validateSchemas: string[] = [];
  if (bodySchema) {
    validateSchemas.push(`  validate(z.object({ body: ${bodySchema} })),`);
  }
  if (pathParamList.length > 0) {
    const props = pathParamList
      .map((p: ParameterObject) => `${p.name}: ${schemaToZod(p.schema, 0).trim()}`)
      .join(", ");
    validateSchemas.push(`  validate(z.object({ params: z.object({ ${props} }) })),`);
  }
  if (queryParams.length > 0) {
    const props = queryParams
      .map((p: ParameterObject) => `${p.name}: ${schemaToZod(p.schema, 0).trim()}${p.required ? "" : ".optional()"}`)
      .join(", ");
    validateSchemas.push(`  validate(z.object({ query: z.object({ ${props} }) })),`);
  }

  // Build response type
  const successResponse = operation.responses?.["200"] ?? operation.responses?.["201"];
  const responseSchema = successResponse?.content?.["application/json"]?.schema;
  const responseType = responseSchema ? schemaToTsType(responseSchema) : "any";

  const summary = operation.summary ?? operation.description ?? "";

  return `// ═══════════════════════════════════════════════════════════
// ${method.toUpperCase()} ${fullPath}
// ${summary}

/** @swagger
 * ${fullPath}:
 *   ${method}:
 *     summary: ${operation.summary ?? ""}
 *     tags: [${operation.tags?.[0] ?? "default"}]
 *     parameters:
${operation.parameters?.map((p: ParameterObject) => ` *       - in: ${p.in}
 *         name: ${p.name}
 *         ${p.required ? "required: true" : "required: false"}
 *         schema:
 *           type: ${p.schema?.type ?? "string"}`).join("\n") ?? ""}
 */
router.${method}(
  "${fullPath}",
${validateSchemas.length > 0 ? validateSchemas.join("\n") + "\n" : ""}  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // ═══════════════════════════════════════════════════════════
    // BACKGEN:START — Business Logic
    // ═══════════════════════════════════════════════════════════

    // Response type: ${responseType}
    // Validated inputs: req.body / req.params / req.query

    // TODO: Implement ${opName} handler
    res.json({ message: "${opName} endpoint" });

    // ═══════════════════════════════════════════════════════════
    // BACKGEN:END
    // ═══════════════════════════════════════════════════════════
  })
);`;
}

// ── Main Codegen ───────────────────────────────────────────────

export interface GenerateCodeOptions {
  outDir: string;
}

export function categorizePaths(doc: OpenAPIDoc): Record<string, Array<{ path: string; method: string; operation: Operation }>> {
  const grouped: Record<string, Array<{ path: string; method: string; operation: Operation }>> = {};

  if (!doc.paths) return grouped;

  for (const [urlPath, pathItem] of Object.entries(doc.paths)) {
    if (!pathItem) continue;
    const methods: Array<[string, Operation | undefined]> = [
      ["get", pathItem.get],
      ["post", pathItem.post],
      ["put", pathItem.put],
      ["patch", pathItem.patch],
      ["delete", pathItem.delete],
    ];

    for (const [method, operation] of methods) {
      if (!operation) continue;

      // Determine the module (tag or first path segment)
      const tag = operation.tags?.[0] ?? urlPath.split("/").filter(Boolean)[0] ?? "default";
      if (!grouped[tag]) grouped[tag] = [];
      grouped[tag].push({ path: urlPath, method, operation });
    }
  }

  return grouped;
}

function generateModuleController(tag: string, endpoints: Array<{ path: string; method: string; operation: Operation }>): string {
  const routes = endpoints.map((ep) => operationToExpress(ep.method, ep.operation, ep.path));

  // Only import what the generated routes actually reference.
  const body = routes.join("\n\n");
  const usesZod = body.includes("z.");
  const usesValidate = body.includes("validate(");
  const usesAuth = body.includes("authenticate(");

  const imports = [
    'import { Router, type Request, type Response } from "express";',
    usesZod ? 'import { z } from "zod";' : null,
    usesValidate ? 'import { validate } from "../../middleware/core/validate.js";' : null,
    'import { asyncHandler } from "../../utils/async-handler.js";',
    usesAuth ? 'import { authenticate } from "../../middleware/auth.js";' : null,
  ].filter(Boolean);

  return `${imports.join("\n")}

export const router = Router();

// ── ${tag.toUpperCase()} Routes ───────────────────────────────────

${body}

export default router;
`;
}

export async function generateOpenApiCode(
  doc: OpenAPIDoc,
  options: GenerateCodeOptions
): Promise<{ modules: string[] }> {
  const outDir = options.outDir;
  const grouped = categorizePaths(doc);
  const modules: string[] = [];

  // Create output directory
  await fs.mkdir(outDir, { recursive: true });

  // Generate Zod schema file for shared models
  const schemas = doc.components?.schemas ?? doc.definitions ?? {};
  if (Object.keys(schemas).length > 0) {
    let schemaFile = `// Auto-generated from OpenAPI spec
// ⚠️ This file is regenerated — manual changes in BACKGEN blocks are preserved.
import { z } from "zod";

// ── Shared Schemas ─────────────────────────────────────────────\n\n`;

    for (const [name, schema] of Object.entries(schemas)) {
      if (schema.$ref || (!schema.properties && !schema.enum)) continue;

      if (schema.enum) {
        schemaFile += `/** ${schema.description ?? name} */\n`;
        schemaFile += `export const ${name}Schema = z.enum([${schema.enum.map((v) => JSON.stringify(v)).join(", ")}]);\n`;
        schemaFile += `export type ${name} = z.infer<typeof ${name}Schema>;\n\n`;
      } else if (schema.properties) {
        schemaFile += `/** ${schema.description ?? name} */\n`;
        schemaFile += `export const ${name}Schema = ${schemaToZod(schema, 0).trim()};\n`;
        schemaFile += `export type ${name} = z.infer<typeof ${name}Schema>;\n\n`;
      }
    }

    const schemasDir = path.join(outDir, "schemas");
    await fs.mkdir(schemasDir, { recursive: true });
    await fs.writeFile(path.join(schemasDir, "index.ts"), schemaFile, "utf-8");
    modules.push("schemas");
  }

  // Generate module files per tag
  for (const [tag, endpoints] of Object.entries(grouped)) {
    const moduleDir = path.join(outDir, tag);
    await fs.mkdir(moduleDir, { recursive: true });

    // Controller
    const controllerContent = generateModuleController(tag, endpoints);
    await fs.writeFile(path.join(moduleDir, `${tag}.routes.ts`), controllerContent, "utf-8");

    // Index barrel
    const indexContent = `export { router as ${tag}Routes } from "./${tag}.routes.js";\n`;
    await fs.writeFile(path.join(moduleDir, "index.ts"), indexContent, "utf-8");

    modules.push(tag);
  }

  return { modules };
}
