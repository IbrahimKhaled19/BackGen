# BackGen

[![CI](https://github.com/IbrahimKhaled19/BackGen/actions/workflows/ci.yml/badge.svg)](https://github.com/IbrahimKhaled19/BackGen/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@ibrahimkhaled19/backgen.svg)](https://www.npmjs.com/package/@ibrahimkhaled19/backgen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[![npm downloads](https://img.shields.io/npm/dm/@ibrahimkhaled19/backgen.svg)](https://www.npmjs.com/package/@ibrahimkhaled19/backgen)
[![GitHub stars](https://img.shields.io/github/stars/IbrahimKhaled19/BackGen?style=social)](https://github.com/IbrahimKhaled19/BackGen)

## 🤖 AI-Ready

[![BackGen MCP server](https://glama.ai/mcp/servers/IbrahimKhaled19/BackGen/badges/score.svg)](https://glama.ai/mcp/servers/IbrahimKhaled19/BackGen)
[![BackGen MCP server](https://glama.ai/mcp/servers/IbrahimKhaled19/BackGen/badges/card.svg)](https://glama.ai/mcp/servers/IbrahimKhaled19/BackGen)

BackGen ships a built-in **MCP (Model Context Protocol) server** that AI assistants
(Claude, Cursor, GitHub Copilot, VS Code) can use to scaffold projects on your behalf.

Run via CLI:
```bash
backgen mcp
```

Or configure your AI tool's MCP client:
```json
{
  "mcpServers": {
    "backgen": {
      "command": "npx",
      "args": ["-y", "@ibrahimkhaled19/backgen", "backgen-mcp"]
    }
  }
}
```

**Available MCP tools:**

| Tool | Description |
|------|-------------|
| `init_project` | Scaffold a new production-ready backend project with chosen ORM, preset, and plugins |
| `add_plugin` | Install a plugin (jwt, clerk, stripe, s3, ratelimit, ci-github, dependabot, codeql, docker-registry, release) |
| `remove_plugin` | Remove a previously installed plugin |
| `generate_resource` | Generate a CRUD resource with fields, relations, validation, and Swagger |
| `generate_seed` | Generate a database seed file for a resource |
| `generate_factory` | Generate a test factory for a resource |
| `doctor` | Validate an existing BackGen project for configuration issues |
| `list_plugins` | List all available plugins with descriptions |
| `list_presets` | List all available domain presets |
| `project_info` | Show project metadata from the manifest |

Then just ask: *"Scaffold a SaaS backend with Prisma, JWT auth, and Stripe payments"*

---

<img width="1600" height="900" alt="BackGen CLI generating Express.js backend with Prisma, Drizzle, and Mongoose — Swagger docs, Docker, auth, and multi-tenant SaaS preset" src="https://github.com/user-attachments/assets/cd3888d3-fa9d-4e4e-a595-4f10ae039871" />
> Generate production-ready backend foundations so developers can focus on business logic, not boilerplate.

BackGen is a CLI tool that generates complete Express.js backend projects on **Prisma, Drizzle, or Mongoose** — with authentication, multi-tenant infrastructure, production hardening, Docker, and testing — all working out of the box.

```bash
npx @ibrahimkhaled19/backgen init my-api --orm drizzle
cd my-api
npm run dev
```

Swagger docs at `http://localhost:3000/docs` in under 60 seconds. Pick your ORM, keep everything else.

---

## Features

- **Express + TypeScript** — strict mode, ESLint 9 (flat config), Vitest
- **Multi-ORM** — Prisma, Drizzle, or Mongoose. Pick at `init` time, switch later via the manifest
- **SaaS-ready** — `saas-core` preset ships Organizations, Memberships, Invitations, RBAC, tenant-scoped queries
- **Hardened by default** — helmet, strict CORS, request ID, request timeout, xss + mongo-sanitize, graceful shutdown, `/health` + `/ready`, error envelope
- **Plugin System** — JWT, Clerk, Stripe, S3, ratelimit via `backgen add`
- **Resource Generator** — CRUD modules with relations, validation, Swagger
- **Domain Presets** — saas-core, healthcare, SaaS, ecommerce, CRM, LMS — full domain in one command
- **Seed & Factory Generators** — development data and test factories
- **Docker** — multi-stage Dockerfile + docker-compose
- **Swagger/OpenAPI** — auto-generated API documentation
- **Manifest** — `.backgenrc.json` tracks ORM, plugins, versions, and ownership for **upgrade/rollback**

---

## Quick Start

```bash
# Install globally
npm install -g @ibrahimkhaled19/backgen

# Create a project (pick your ORM)
backgen init my-api --orm prisma
backgen init my-api --orm drizzle
backgen init my-api --orm mongoose

# Create a full multi-tenant domain
backgen init my-saas --preset saas-core --defaults

# Add authentication
backgen add jwt
backgen add clerk

# Add production hardening
backgen add ratelimit

# Generate a resource
backgen generate resource Product name:string price:number stock:number

# Start developing
cd my-api
npm run dev
```

---

## Commands

### `backgen init [name]`

Generate a new backend project.

```bash
backgen init my-api                              # interactive ORM picker
backgen init my-api --orm prisma                 # explicit ORM
backgen init my-api --orm drizzle --defaults     # Drizzle, non-interactive
backgen init my-api --orm mongoose --skip-install
backgen init my-api --preset saas-core --defaults   # full multi-tenant domain
backgen init my-api --preset healthcare            # healthcare domain
```

**Output:**
- Express app with TypeScript strict mode
- ORM-specific data layer (Prisma / Drizzle / Mongoose)
- Environment validation (Zod)
- Swagger/OpenAPI documentation
- Docker + docker-compose
- Hardened by default: helmet, CORS, request ID, timeout, xss + mongo-sanitize, graceful shutdown, health checks
- ESLint 9 + Vitest
- `.backgenrc.json` manifest (records `project.orm` + plugins)

No auth by default — choose your auth provider with `backgen add`.

---

### `backgen add [plugin]`

Install a plugin. Interactive multi-select if no argument.

```bash
backgen add                 # interactive multi-select
backgen add jwt             # JWT authentication
backgen add clerk           # Clerk auth-as-a-service
backgen add stripe          # Stripe payments
backgen add s3              # AWS S3 storage
backgen add ratelimit       # Per-IP / per-user rate limiting
backgen add devops          # Install all devops plugins at once
```

**Available Plugins:**

| Plugin | Category | Description |
|--------|----------|-------------|
| `jwt` | auth | JWT authentication with refresh tokens |
| `clerk` | auth | Clerk auth-as-a-service (conflicts with jwt) |
| `stripe` | payment | Stripe checkout, webhooks, customers |
| `s3` | storage | AWS S3 upload, download, presigned URLs |
| `ratelimit` | production | Per-IP rate limiting with Redis-ready store |
| `ci-github` | devops | GitHub Actions CI pipeline (lint, typecheck, test, build, optional deploy) |
| `dependabot` | devops | Automated dependency updates via Dependabot |
| `codeql` | devops | CodeQL security analysis on push and schedule |
| `docker-registry` | devops | Docker image build and publish to GHCR |
| `release` | devops | Semantic release with npm publish and GitHub releases |

**Conflict detection:** `jwt` and `clerk` cannot be installed together.

---

## Domain Presets

Generate a complete domain in one command. Each preset creates multiple resources with relations, auto-installs JWT auth, and wires everything together.

```bash
backgen init my-api --preset healthcare
backgen init my-api --preset saas --defaults
```

### healthcare

Patient, Doctor, Appointment, Prescription, MedicalRecord — appointments between patients and doctors, prescriptions linked to patients, medical records per patient.

### saas

Organization, Team, Membership, Subscription, Invoice — organizations with teams and memberships, subscriptions with invoices.

### ecommerce

Category, Product, Cart, Order, OrderItem, Payment — products in categories, carts with items, orders with line items and payments.

### crm

Contact, Company, Deal, Activity — companies with contacts, deals tracked through pipeline, activity logging.

### lms

Course, Lesson, Enrollment, Progress, Certificate — courses with lessons, student enrollments, progress tracking, certificates.

---

### `backgen remove [plugin]`

Remove a plugin. Interactive multi-select if no argument. Supports `devops` shorthand to remove all devops plugins.

```bash
backgen remove              # interactive multi-select
backgen remove stripe       # remove specific plugin
backgen remove devops       # remove all devops plugins
```

---

### `backgen generate resource <name> [fields...]`

Generate a CRUD resource module.

```bash
# Interactive
backgen generate resource Product

# Non-interactive
backgen generate resource Product name:string price:number stock:number

# With relations
backgen generate resource Appointment date:datetime status:string \
  --relations "doctor:Doctor,patient:Patient"

# With --fields flag
backgen generate resource Product --fields "name:string,price:number"
```

**Generated files:**
```
src/modules/product/
  product.controller.ts    # CRUD endpoints
  product.service.ts       # business logic
  product.repository.ts    # database operations
  product.validation.ts    # Zod schemas
  product.types.ts         # TypeScript interfaces
  product.routes.ts        # route definitions + Swagger
  product.test.ts          # test placeholder
```

**Field types:** `string`, `number`, `boolean`, `date`, `datetime`

**Relations:** `doctor:Doctor` (belongsTo), `patients:Patient` (hasMany)

---

### `backgen generate seed <resource>`

Generate seed data for development.

```bash
backgen generate seed Product --count 10
```

Output: `prisma/seeds/product.ts` (Prisma), `db/seeds/product.ts` (Drizzle), or `seeds/product.ts` (Mongoose)

---

### `backgen generate factory <resource>`

Generate a test factory.

```bash
backgen generate factory Product
```

Output: `src/factories/product.factory.ts`

Usage:
```ts
import { createProduct } from "./factories/product.factory.js";
const product = await createProduct({ name: "Widget" });
```

---

### `backgen generate route [name]`

Generate a custom route module with a complete controller, service, validation, types, and route file -- including Swagger annotations. Routes are automatically registered in `app.ts` with the `REGISTER_ROUTES` marker.

Use this when you need a custom endpoint that doesn't fit the CRUD pattern (e.g., dashboards, reports, webhooks, custom actions). For standard CRUD, use `generate resource` instead.

```bash
backgen generate route                  # interactive prompt
backgen generate route reports          # generate a /api/reports module
backgen generate route webhooks         # generate a /api/webhooks module
```

**Generated files:**
```
src/modules/reports/
  reports.controller.ts    # request handlers
  reports.service.ts       # business logic
  reports.validation.ts    # Zod schemas
  reports.types.ts         # TypeScript interfaces
  reports.routes.ts        # route definitions + Swagger
```

**Key differences from `generate resource`:**
- No database model, repository, or test file
- No field specification required
- Pure controller/service pattern for custom endpoints
- Mounted at `/api/<name>` with full Swagger docs

---

### `backgen generate migration [name]`

Generate a database migration (ORM-aware).

```bash
backgen generate migration add-product-table   # runs prisma migrate dev / drizzle-kit generate / no-op for Mongoose
```

---

### `backgen sync`

Reconcile `.backgenrc.json` with the project. Regenerates missing plugin files.

```bash
backgen sync
```

---

### `backgen mcp`

Start BackGen as an MCP server over stdio. Used by AI assistants (Claude, Cursor, VS Code) to scaffold projects programmatically.

```bash
backgen mcp
```

This is the same server exposed via the `npx @ibrahimkhaled19/backgen backgen-mcp` binary. It registers all 10 MCP tools listed in the [AI-Ready](#-ai-ready) section.

---

### `backgen health`

Show system health information.

```bash
backgen health
```

**Displays:**
- Node.js version
- Platform and architecture
- BackGen version

---

### `backgen doctor`

Check project health with ownership integrity diagnostics.

```bash
backgen doctor              # health check + ownership audit
backgen doctor --fix        # auto-fix missing manifest entries
```

**Checks:**
- Node.js version (>= 18)
- npm availability
- .env file
- DATABASE_URL
- Prisma schema / Drizzle config / Mongoose connection
- Dependencies
- Package manager version
- **File integrity** — all manifest-tracked files exist on disk
- **Ownership integrity** — framework vs user file classification

---

### `backgen upgrade`

Upgrade a generated project to the latest template version. Creates a backup, then applies pending migrations sequentially.

```bash
backgen upgrade              # show pending migrations, prompt before applying
backgen upgrade --yes        # skip confirmation, apply all pending
```

**What happens:**
- Reads current `generatedVersion` from `.backgenrc.json`
- Loads pending core + plugin migrations
- Creates backup in `.backgen/backups/pre-<version>/`
- Applies migrations in order (semver-sorted)
- Updates ownership register + `generatedVersion` in manifest

---

### `backgen rollback`

Restore a project to its pre-upgrade state from the most recent backup.

```bash
backgen rollback              # show latest backup, prompt before restoring
backgen rollback --yes        # skip confirmation
```

**What happens:**
- Lists available backups in `.backgen/backups/`
- Restores the most recent backup (all tracked files + manifest)
- Project returns to exact pre-upgrade state

---

### `backgen rotate-secrets`

Rotate JWT secrets in the project's `.env` file. Generates cryptographically secure 256-bit random hex values for `JWT_SECRET` and `JWT_REFRESH_SECRET`, backs up the current `.env` to `.env.backup`, and writes new values.

All existing tokens are immediately invalidated on next server restart -- users must re-login.

```bash
backgen rotate-secrets
```

**What happens:**
- Generates two 256-bit random hex secrets via `crypto.randomBytes`
- Old `.env` saved to `.env.backup`
- Previous values preserved as comments in the new `.env`
- Print summary of changes

---

## Plugin System

Every plugin implements the `BackGenPlugin` interface:

```ts
interface BackGenPlugin {
  name: string;
  category: string;
  description: string;
  version: string;

  dependencies?: string[];
  devDependencies?: string[];
  requires?: string[];
  conflicts?: string[];

  env?: Record<string, string>;
  templates: string[];
  migrations?: PluginMigration[];   // versioned plugin migration scripts

  install(ctx: InstallContext): Promise<void>;
  uninstall?(ctx: InstallContext): Promise<void>;
}
```

Plugins can:
- Install npm dependencies
- Inject environment variables
- Register routes in app.ts
- Replace existing middleware
- Add database models (Prisma / Drizzle / Mongoose)
- Carry versioned migrations for own upgrades

---

## Project Manifest

`.backgenrc.json` tracks plugins, versions, generated version, and file ownership:

```json
{
  "version": "1.0.0",
  "generatedVersion": "1.9.0",
  "project": {
    "name": "my-api",
    "framework": "express",
    "database": "postgresql",
    "orm": "prisma",
    "preset": "saas-core"
  },
  "plugins": {
    "jwt": {
      "version": "1.0.0",
      "installedAt": "2026-06-01",
      "source": "core"
    }
  },
  "files": {
    "src/app.ts": { "owner": "shared", "version": "1.9.0" },
    "src/server.ts": { "owner": "framework", "version": "1.9.0" },
    "src/config/env.ts": { "owner": "framework-editable", "version": "1.9.0" },
    "prisma/schema.prisma": { "owner": "user" },
    "src/modules/user/user.service.ts": { "owner": "user" },
    "docker-compose.yml": { "owner": "shared", "version": "1.9.0" }
  }
}
```

**Ownership levels:**
| Level | Description | Upgrade behavior |
|-------|-------------|-----------------|
| `framework` | BackGen owns fully | Safe to overwrite |
| `framework-editable` | Generated but user may customize | Smart merge via migration |
| `shared` | Generated skeleton, user extends (e.g. docker-compose) | Migration-aware update |
| `user` | User owns entirely | Never touched |

---

## Generated Project Structure

```
my-api/
├── prisma/                       # Prisma ORM only
│   ├── schema.prisma
│   └── seeds/
├── src/db/                       # Drizzle ORM only
│   ├── schema/
│   │   └── index.ts
│   └── seeds/
├── src/models/                   # Mongoose ORM only
│   └── seeds/
├── src/
│   ├── app.ts                    # Express app setup
│   ├── server.ts                 # Server entry point
│   ├── config/
│   │   ├── env.ts                # Zod env validation
│   │   ├── database.ts           # Prisma client / Drizzle db / Mongoose connection
│   │   └── swagger.ts            # Swagger config
│   ├── middleware/
│   │   ├── auth.ts               # JWT/Clerk auth
│   │   ├── validate.ts           # Zod validation
│   │   ├── error.ts              # Global error handler
│   │   └── logger.ts             # Request logging
│   ├── modules/
│   │   ├── auth/                 # Auth module (if jwt installed)
│   │   ├── stripe/               # Stripe module (if installed)
│   │   └── <resource>/           # Generated resources
│   ├── services/
│   │   └── logger.service.ts     # Winston logger
│   ├── utils/
│   │   ├── api-error.ts          # Error class
│   │   ├── async-handler.ts      # Async wrapper
│   │   └── response.ts           # Response formatters
│   └── factories/                # Test factories
├── .env.example
├── .backgenrc.json               # Manifest
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

---

## Development

```bash
# Clone
git clone https://github.com/your-username/backgen.git
cd backgen

# Install
npm install

# Build
npm run build

# Test
npm run test

# Lint
npm run lint
```

### Test Suite

277+ tests covering:
- CLI help and version
- Init: project structure, configs, manifest (all 3 ORMs)
- Init with domain presets: preset-specific resources and relations
- Init with saas-core preset: multi-tenant organizations, memberships, RBAC
- Add plugin: files, routes, env vars, manifest (V4.6 plugin suite)
- Generate resource: module files, ORM model, routes, validation
- Generate with relations: foreign keys, ORM includes
- Seed and factory generators (all 3 ORMs)
- Drizzle: schema generation, client setup, codegen
- Mongoose: model generation, schema definition, connection
- Remove plugin: file + dependency + manifest cleanup
- Sync: file restoration
- Doctor: health checks, ownership integrity
- Upgrade: migration engine, pending detection, backup creation
- Rollback: backup listing, file restoration, manifest recovery
- Error handling: unknown plugin, non-empty directory

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| CLI | Commander.js |
| Prompts | Inquirer.js |
| Templates | Handlebars |
| Spinner | Ora |
| Colors | Chalk |
| Testing | Vitest |
| Linting | ESLint 9 (flat config) |
| Language | TypeScript (strict) |

### Generated Projects

| Layer | Technology |
|-------|------------|
| Framework | Express.js |
| Language | TypeScript (strict) |
| Database | PostgreSQL |
| ORM | Prisma / Drizzle / Mongoose |
| Validation | Zod |
| Auth | JWT or Clerk |
| Payments | Stripe |
| Storage | AWS S3 |
| Docs | Swagger/OpenAPI |
| Logging | Winston + Morgan |
| Testing | Vitest |
| Deployment | Docker |

---

## BackGen vs Alternatives

| Tool | ORM Choice | Auth | Plugin System | Presets | Upgrade Engine | Docs Site |
|------|-----------|------|---------------|---------|----------------|-----------|
| **BackGen** | Prisma, Drizzle, Mongoose | JWT, Clerk | ◈ 7+ plugins | 5 domains | ◈ Backup + rollback | — |
| NestJS CLI | No (fixed NestJS) | Built-in | ◈ Modules | — | — | ◈ |
| Express Generator | No (fixed plain JS) | — | — | — | — | — |
| T3 Stack | Prisma | NextAuth | — | — | — | ◈ |
| AdonisJS | Lucid ORM | Built-in | ◈ Ace | — | — | ◈ |
| LoopBack | Built-in | Built-in | ◈ | — | — | ◈ |

**Key differentiators:**
- ◈ **ORM-switchable** — change Prisma ↔ Drizzle ↔ Mongoose via manifest, not rewrite
- ◈ **Domain presets** — healthcare, SaaS, ecommerce, CRM, LMS in one command
- ◈ **Upgrade engine** — versioned migrations + backup + rollback for generated projects
- ◈ **Multi-ORM from day one** — not locked into one data layer

---

## Roadmap

| Version | Focus | Status |
|---------|-------|--------|
| V1 | Foundation | Done |
| V2 | Plugin System | Done |
| V3 | Resource Generator | Done |
| V4 | Domain Presets | Done |
| V4.5 | SaaS Essentials | Done |
| V4.6 | Production Hardening | Done |
| V4.6.1 | Base Hardening Default-On | Done |
| V5 | Multi-ORM (Prisma, Drizzle, Mongoose) | Done |
| V6 | DevOps & Infrastructure | Done |
| V6.1 | Ownership Tracking & Doctor --fix | Done |
| V6.2 | Upgrade Engine & Migration Runner | Done |
| V6.3 | Backups & Rollback | Done |
| V6.4 | Plugin Migrations | Done |
| V7 | Upgrade Polish & Diffing | In Progress |
| V8 | Schema-First Development | Planned |
| V9 | Enterprise Features | Planned |
| V10 | Plugin Authoring SDK | Planned |
| V11 | Marketplace | Planned |
| V12 | AI Context Layer | Planned |

See [docs/ROADMAP.md](docs/ROADMAP.md) for details.

---

## License

MIT
