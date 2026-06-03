# BackGen

[![CI](https://github.com/IbrahimKhaled19/BackGen/actions/workflows/ci.yml/badge.svg)](https://github.com/IbrahimKhaled19/BackGen/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@ibrahimkhaled19/backgen.svg)](https://www.npmjs.com/package/@ibrahimkhaled19/backgen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<img width="1600" height="900" alt="showcase" src="https://github.com/user-attachments/assets/cd3888d3-fa9d-4e4e-a595-4f10ae039871" />
> Generate production-ready backend foundations so developers can focus on business logic, not boilerplate.

BackGen is a CLI tool that generates complete Express.js backend projects with authentication, database, API documentation, Docker, and testing — all working out of the box.

```bash
npx backgen init my-api
cd my-api
npm run dev
```

Swagger docs at `http://localhost:3000/docs` in under 60 seconds.

---

## Features

- **Express + TypeScript** — strict mode, ESLint, Vitest
- **Prisma + PostgreSQL** — schema, migrations, Prisma Studio
- **Plugin System** — auth, payments, storage via `backgen add`
- **Resource Generator** — CRUD modules with relations, validation, Swagger
- **Domain Presets** — healthcare, SaaS, ecommerce, CRM, LMS — full domain in one command
- **Seed & Factory Generators** — development data and test factories
- **Docker** — multi-stage Dockerfile + docker-compose
- **Swagger/OpenAPI** — auto-generated API documentation
- **Manifest** — `.backgenrc.json` tracks everything for sync/upgrade

---

## Quick Start

```bash
# Install globally
npm install -g backgen

# Create a project
backgen init my-api

# Create a full domain from a preset
backgen init healthcare-api --preset healthcare

# Add authentication
backgen add jwt

# Add payments
backgen add stripe

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
backgen init my-api
backgen init my-api --defaults               # non-interactive
backgen init my-api --skip-install           # skip npm install
backgen init my-api --preset healthcare      # generate full domain
backgen init my-api --preset saas --defaults  # domain + non-interactive
```

**Output:**
- Express app with TypeScript strict mode
- Prisma schema (PostgreSQL)
- Environment validation (Zod)
- Swagger/OpenAPI documentation
- Docker + docker-compose
- ESLint + Vitest
- `.backgenrc.json` manifest

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
```

**Available Plugins:**

| Plugin | Category | Description |
|--------|----------|-------------|
| `jwt` | auth | JWT authentication with refresh tokens |
| `clerk` | auth | Clerk auth-as-a-service (conflicts with jwt) |
| `stripe` | payment | Stripe checkout, webhooks, customers |
| `s3` | storage | AWS S3 upload, download, presigned URLs |

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

Output: `prisma/seeds/product.ts`

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

Generate a Prisma migration.

```bash
backgen generate migration add-product-table
```

---

### `backgen sync`

Reconcile `.backgenrc.json` with the project. Regenerates missing plugin files.

```bash
backgen sync
```

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
- Prisma schema
- Dependencies

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
- Add Prisma models

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
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seeds/                 # Seed data
├── src/
│   ├── app.ts                 # Express app setup
│   ├── server.ts              # Server entry point
│   ├── config/
│   │   ├── env.ts             # Zod env validation
│   │   ├── database.ts        # Prisma client
│   │   └── swagger.ts         # Swagger config
│   ├── middleware/
│   │   ├── auth.ts            # JWT/Clerk auth
│   │   ├── validate.ts        # Zod validation
│   │   ├── error.ts           # Global error handler
│   │   └── logger.ts          # Request logging
│   ├── modules/
│   │   ├── auth/              # Auth module (if jwt installed)
│   │   ├── stripe/            # Stripe module (if installed)
│   │   └── <resource>/        # Generated resources
│   ├── services/
│   │   └── logger.service.ts  # Winston logger
│   ├── utils/
│   │   ├── api-error.ts       # Error class
│   │   ├── async-handler.ts   # Async wrapper
│   │   └── response.ts        # Response formatters
│   └── factories/             # Test factories
├── .env.example
├── .backgenrc.json            # Manifest
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

59 tests covering:
- CLI help and version
- Init: project structure, configs, manifest
- Init with domain presets: preset-specific resources and relations
- Add plugin: files, routes, env vars, manifest
- Generate resource: module files, Prisma model, routes, validation
- Generate with relations: foreign keys, Prisma includes
- Seed and factory generators
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
| ORM | Prisma |
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
| V4.5 | SaaS Essentials | Next |
| V5 | Multi-ORM | Planned |
| V6 | DevOps & Infrastructure | Planned |
| V7 | Developer Experience | Planned |
| V8 | Schema-First Development | Planned |
| V9 | Enterprise Features | Planned |
| V10 | AI Features | Planned |
| V11 | Kubernetes | Planned |
| V12 | Marketplace | Planned |

See [docs/ROADMAP.md](docs/ROADMAP.md) for details.

---

## License

MIT
