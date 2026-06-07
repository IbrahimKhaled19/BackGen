# BackGen

[![CI](https://github.com/IbrahimKhaled19/BackGen/actions/workflows/ci.yml/badge.svg)](https://github.com/IbrahimKhaled19/BackGen/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@ibrahimkhaled19/backgen.svg)](https://www.npmjs.com/package/@ibrahimkhaled19/backgen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<img width="1600" height="900" alt="showcase" src="https://github.com/user-attachments/assets/cd3888d3-fa9d-4e4e-a595-4f10ae039871" />
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
- **Manifest** — `.backgenrc.json` tracks ORM, plugins, and versions for sync/upgrade

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
```

**Available Plugins:**

| Plugin | Category | Description |
|--------|----------|-------------|
| `jwt` | auth | JWT authentication with refresh tokens |
| `clerk` | auth | Clerk auth-as-a-service (conflicts with jwt) |
| `stripe` | payment | Stripe checkout, webhooks, customers |
| `s3` | storage | AWS S3 upload, download, presigned URLs |
| `ratelimit` | production | Per-IP rate limiting with Redis-ready store |

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

Remove a plugin. Interactive multi-select if no argument.

```bash
backgen remove              # interactive multi-select
backgen remove stripe       # remove specific plugin
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

Check project health.

```bash
backgen doctor
```

**Checks:**
- Node.js version (>= 18)
- npm availability
- .env file
- DATABASE_URL
- Prisma schema / Drizzle config / Mongoose connection
- Dependencies
- Package manager version

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

---

## Project Manifest

`.backgenrc.json` tracks installed plugins:

```json
{
  "version": "1.0.0",
  "project": {
    "name": "my-api",
    "framework": "express",
    "database": "postgresql",
    "orm": "prisma"
  },
  "plugins": {
    "jwt": {
      "version": "1.0.0",
      "installedAt": "2026-06-01",
      "source": "core"
    },
    "stripe": {
      "version": "1.0.0",
      "installedAt": "2026-06-01",
      "source": "core"
    }
  }
}
```

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

87+ tests covering:
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
- Remove plugin: manifest cleanup
- Sync: file restoration
- Doctor: health checks
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
| V6 | DevOps & Infrastructure | Planned |
| V7 | Developer Experience | Planned |
| V8 | Schema-First Development | Planned |
| V9 | Enterprise Features | Planned |
| V10 | Plugin Authoring SDK | Planned |
| V11 | Marketplace | Planned |
| V12 | AI Context Layer | Planned |

See [docs/ROADMAP.md](docs/ROADMAP.md) for details.

---

## License

MIT
