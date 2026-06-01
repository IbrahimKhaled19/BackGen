# BackGen Roadmap

> Generate production-ready backend foundations so developers can focus on business logic, not boilerplate.

## Vision

BackGen evolves through three stages:

| Stage | What | Differentiator |
|-------|------|----------------|
| **Stage 1** | Scaffolder | CLI + templates |
| **Stage 2** | Backend framework accelerator | Plugins + resources + presets |
| **Stage 3** | Backend platform | Marketplace + schema-first + AI modeling |

End state — developer runs:

```bash
backgen init healthcare
backgen add clerk
backgen add stripe
backgen add resend
backgen add s3
backgen add monitoring
backgen generate schema schema.yaml
```

Production-ready backend in under 5 minutes.

---

## Current State (V2 Complete)

### Architecture

| Component | Status |
|-----------|--------|
| CLI (Commander.js) | Done |
| Plugin system (interfaces, registry, installer) | Done |
| Manifest (.backgenrc.json) | Done |
| Template engine (Handlebars + eq helper) | Done |
| File mutation API | Done |
| Checkpoint/resume system | Done |
| E2E test suite (50 tests) | Done |

### Commands

| Command | Description | Status |
|---------|-------------|--------|
| `backgen init [name]` | Generate project with interactive wizard | Done |
| `backgen add [plugin]` | Install plugin with interactive selector | Done |
| `backgen remove <plugin>` | Uninstall plugin | Done |
| `backgen sync` | Reconcile manifest with project | Done |
| `backgen doctor` | Project health check | Done |
| `backgen generate resource <name>` | CRUD resource generator | Done |

### Plugins

| Plugin | Category | Command | Status |
|--------|----------|---------|--------|
| JWT | auth | `backgen add jwt` | Done |
| Clerk | auth | `backgen add clerk` | Done |
| Stripe | payment | `backgen add stripe` | Done |
| S3 | storage | `backgen add s3` | Done |

### Init Output

`backgen init` generates a bare project with:
- Express + TypeScript (strict mode)
- Prisma + PostgreSQL
- Zod validation
- Swagger/OpenAPI
- Docker + docker-compose
- Winston logging
- ESLint + Vitest
- `.backgenrc.json` manifest

No auth by default. Users choose: `backgen add jwt` or `backgen add clerk`.

---

## V3: Resource Generator (NEXT)

**Goal:** Make `backgen generate resource` powerful enough for real products.

**Why this is next:** Saves more real-world time than adding more providers. A developer building a healthcare app needs Appointment with Doctor/Patient relations — not a tenth auth provider.

### Features

#### Relations

```bash
backgen generate resource Appointment \
  --fields "date:datetime,status:string" \
  --relations "doctor:Doctor,patient:Patient"
```

Generates:
- Prisma model with `@relation` directives
- Service with relation queries (include/select)
- Controller with nested responses
- Validation with foreign key schemas

#### Non-Interactive Mode

```bash
backgen generate resource Product \
  --fields "name:string,price:number,stock:number"
```

For CI/CD pipelines, AI agents, automation scripts.

#### Migration Generator

```bash
backgen generate migration
```

Creates Prisma migration from schema changes.

#### Seed Generator

```bash
backgen generate seed User --count 10
```

Creates seed data for development.

#### Factory Generator

```bash
backgen generate factory User
```

Creates test factories for integration tests.

### Implementation

| Task | Description |
|------|-------------|
| `--fields` flag | Non-interactive field specification |
| `--relations` flag | Relation definitions |
| Relation parsing | `name:Type` format |
| Prisma template update | `@relation` directives |
| Service template update | `include`/`select` queries |
| Validation template update | Foreign key validation |
| Migration generator | `prisma migrate` wrapper |
| Seed generator | Template-based seed data |
| Factory generator | Test data factories |

---

## V4: Domain Presets

**Goal:** One command to generate a complete domain-specific backend.

### Presets

| Preset | Command | Resources |
|--------|---------|-----------|
| Healthcare | `backgen init healthcare` | Patient, Doctor, Appointment, Prescription, MedicalRecord, Availability, Review |
| SaaS | `backgen init saas` | User, Organization, Membership, Subscription, Invoice |
| E-commerce | `backgen init ecommerce` | Product, Category, Order, OrderItem, Cart, Payment |
| CRM | `backgen init crm` | Contact, Company, Deal, Activity, Pipeline |
| LMS | `backgen init lms` | Course, Lesson, Enrollment, Progress, Certificate |
| Fintech | `backgen init fintech` | Account, Transaction, Transfer, Balance, AuditLog |
| Marketplace | `backgen init marketplace` | Seller, Product, Order, Review, Commission |

### Each Preset Includes

- Domain-specific Prisma models
- Pre-built CRUD endpoints
- Role-based access control
- Common integrations (auth, payments, email)
- Seed data
- Docker configuration

---

## V4.5: SaaS Essentials

**Goal:** The most commercially valuable preset — a huge percentage of startups are SaaS products.

**Why dedicated release:** Multi-tenant SaaS is complex enough to warrant its own focus. Generic presets can't handle the nuances.

```bash
backgen init saas
```

### Includes

| Component | What |
|-----------|------|
| Organizations | Multi-tenant org model |
| Teams | Team membership, roles |
| Invitations | Email invitations, accept/decline |
| RBAC | Owner, admin, member, viewer roles |
| Subscriptions | Plan management, upgrades |
| Billing | Stripe integration, invoices |
| Audit Logs | Who did what when |
| Tenant Middleware | Automatic tenant scoping |

### This Becomes the Flagship

If BackGen can generate a production-ready multi-tenant SaaS foundation, that alone drives adoption.

---

## V5: Multi-ORM Support

**Goal:** Resource generators work across ORMs. Affects every future feature.

**Why reorder:** ORM choice impacts all code generation. Get this right before building more infrastructure.

### Supported ORMs

| ORM | Database | Status |
|-----|----------|--------|
| Prisma | PostgreSQL, MySQL, MongoDB, SQLite | Done (PostgreSQL) |
| Drizzle | PostgreSQL, MySQL, SQLite | Planned |
| Mongoose | MongoDB | Planned |

### Generator Abstraction

```ts
interface ResourceGenerator {
  generateModel(fields: FieldDefinition[]): string;
  generateService(resourceName: string): string;
  generateRepository(resourceName: string): string;
}
```

Implementations:
- `PrismaResourceGenerator`
- `DrizzleResourceGenerator`
- `MongooseResourceGenerator`

### Command

```bash
backgen init my-api --orm drizzle
backgen generate resource Product --orm prisma
```

---

## V6: DevOps & Infrastructure

**Goal:** CI/CD and observability — developers use these daily.

**Why move earlier:** `backgen add ci github` and `backgen add logging pino` are used far more often than Kubernetes.

### CI/CD

```bash
backgen add ci github
```

Generates `.github/workflows/ci.yml`:
- Lint
- Test
- Build
- Deploy (configurable target)

```bash
backgen add ci gitlab
```

### Logging

```bash
backgen add logging pino
```

Options:
- Pino (fast, JSON structured)
- Winston (flexible, transports)

### Monitoring

```bash
backgen add monitoring
```

Options:
- Prometheus metrics
- Grafana dashboards
- OpenTelemetry tracing
- Sentry error tracking

### Infrastructure Plugins

```bash
backgen add jobs bullmq       # Background jobs
backgen add ratelimit redis   # Rate limiting
backgen add webhook           # Webhook delivery
backgen add versioning        # API versioning
```

---

## V7: Developer Experience

**Goal:** Lifecycle commands that increase retention. Help after project creation.

**Why dedicated release:** Doctor, sync, upgrade, graph — these keep developers in the BackGen ecosystem long after init.

### Commands

| Command | Purpose |
|---------|---------|
| `backgen doctor` | Health check (already done) |
| `backgen sync` | Reconcile manifest (already done) |
| `backgen upgrade` | Upgrade templates, dependencies |
| `backgen graph` | Visualize module dependencies |
| `backgen codemod` | Apply code modifications |

### Upgrade System

```bash
backgen upgrade
```

- Compare current templates with installed versions
- Apply safe migrations
- Show diff before applying
- Rollback support

### Dependency Graph

```bash
backgen graph
```

Outputs:
```
auth.controller
  → auth.service
    → prisma (database)
    → jwt (token)
  → auth.validation
    → zod
```

### Code Mods

```bash
backgen codemod add-swagger-tags
backgen codemod upgrade-express-5
```

Automated code transformations.

---

## V8: Schema-First Development

**Goal:** Define entire backend in YAML, generate everything.

**Why huge:** This is the kind of feature teams pay for. Define domain once, get complete backend.

### Schema Format

```yaml
# backgen.yaml
project:
  name: healthcare-api
  framework: express
  database: postgresql
  orm: prisma

plugins:
  - jwt
  - stripe

resources:
  Patient:
    fields:
      name: string
      email: string
      phone: string
      dateOfBirth: date
    relations:
      appointments: Appointment[]

  Doctor:
    fields:
      name: string
      email: string
      specialty: string
    relations:
      appointments: Appointment[]
      availability: Availability[]

  Appointment:
    fields:
      date: datetime
      status: string
      notes: string
    relations:
      patient: Patient
      doctor: Doctor

relations:
  Appointment:
    patient: Patient (belongsTo)
    doctor: Doctor (belongsTo)
```

### Command

```bash
backgen generate schema backgen.yaml
```

Generates:
- All Prisma models with relations
- All CRUD endpoints
- All validation schemas
- All tests
- Swagger documentation
- Seed data

### OpenAPI Import

```bash
backgen import openapi api.yaml
```

Generates routes, controllers, validation, DTOs, tests from OpenAPI spec.

### Prisma Import

```bash
backgen import prisma schema.prisma
```

Generates services, controllers, routes, validation from existing Prisma schema.

---

## V9: Enterprise Features

### Multi-Tenant

```bash
backgen add tenancy
```

- Tenant model, organization, membership, invitation
- Tenant-scoped queries
- Tenant middleware

### Audit Logging

```bash
backgen add audit
```

- User actions, resource changes, auth events
- IP addresses, user agents
- Audit log API

### Feature Flags

```bash
backgen add flags
```

- `isFeatureEnabled("new-dashboard")`
- Flag management API
- Percentage rollouts

### Permissions

```bash
backgen add permissions
```

- RBAC, ABAC
- Permission middleware
- Role hierarchy

---

## V10: AI-Friendly Features

### Explain

```bash
backgen explain UserService
```

Explains generated code in plain English.

### Refactor

```bash
backgen refactor auth
```

Upgrades module architecture with breaking change detection.

### Review

```bash
backgen review
```

Checks architecture violations, security issues, missing tests.

### Generate from Prompt

```bash
backgen generate module \
  --prompt "Appointment booking system"
```

Suggests: Appointment, Schedule, Doctor, Patient, Availability.

---

## V11: Kubernetes

```bash
backgen add kubernetes
```

- deployment.yaml, service.yaml, ingress.yaml
- configmap.yaml, secret.yaml
- Helm chart (optional)

---

## V12: Marketplace Ecosystem

The long-term differentiator.

### Community Plugins

```bash
backgen marketplace
backgen add @backgen/stripe
backgen add @backgen/clerk
backgen add @company/custom-auth
```

### Plugin Structure

```
packages/
  plugin-stripe/
    index.ts
    templates/
```

Each plugin exports:
```ts
export default stripePlugin;
```

### Plugin Interface

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
  upgrade?(ctx: UpgradeContext): Promise<void>;
}
```

### Manifest

```json
{
  "version": "1.0.0",
  "project": {
    "name": "my-api",
    "framework": "express",
    "database": "postgres",
    "orm": "prisma"
  },
  "plugins": {
    "stripe": {
      "version": "1.0.0",
      "installedAt": "2026-06-01",
      "source": "core"
    },
    "@company/custom-auth": {
      "version": "2.1.0",
      "installedAt": "2026-06-01",
      "source": "community"
    }
  }
}
```

---

## Roadmap Summary

| Version | Focus | Key Features | Stage |
|---------|-------|--------------|-------|
| V1 | Foundation | CLI, templates, init, generate resource | Scaffolder |
| V2 | Plugin System | Plugins, manifest, add/remove/sync | Scaffolder |
| **V3** | **Resource Generator** | **Relations, --fields, migrations, seeds** | **Accelerator** |
| V4 | Domain Presets | healthcare, saas, ecommerce, crm, lms | Accelerator |
| V4.5 | SaaS Essentials | Multi-tenant, orgs, teams, billing, audit | Accelerator |
| V5 | Multi-ORM | Prisma, Drizzle, Mongoose generators | Accelerator |
| V6 | DevOps | CI/CD, logging, monitoring, jobs, webhooks | Accelerator |
| V7 | DX | upgrade, graph, codemod | Accelerator |
| V8 | Schema-First | YAML definition, OpenAPI import, Prisma import | Platform |
| V9 | Enterprise | Tenancy, audit, flags, permissions | Platform |
| V10 | AI Features | explain, refactor, review, prompt generation | Platform |
| V11 | Kubernetes | K8s manifests, Helm charts | Platform |
| V12 | Marketplace | Community plugins, third-party ecosystem | Platform |

---

## Design Principles

1. **Deterministic, not AI-generated** — Templates produce consistent, predictable code
2. **Zero runtime dependency** — Generated projects own all code
3. **Plugin-first** — Everything is a plugin, including auth
4. **Manifest is truth** — `.backgenrc.json` tracks everything
5. **Fail safe** — Checkpoint/resume, non-fatal npm install
6. **Test everything** — 50 E2E tests cover all commands
7. **Developer owns code** — No BackGen artifacts in generated projects
8. **Domain over tools** — `backgen init healthcare` beats `backgen explain code` for adoption
9. **Relations over providers** — V3 resource relations save more time than a tenth auth provider
