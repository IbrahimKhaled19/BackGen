# BackGen Roadmap

> Generate production-ready backend foundations so developers can focus on business logic, not boilerplate.

## Vision

BackGen is the **create-next-app of backend development**. Not just scaffolding — the entire backend lifecycle.

A mature BackGen should let a developer do:

```bash
backgen init healthcare
backgen add clerk
backgen add stripe
backgen add resend
backgen add s3
backgen add monitoring
backgen generate resource Appointment
```

And have a production-ready backend with auth, payments, storage, notifications, observability, testing, documentation, CI/CD, and deployment in under 5 minutes.

---

## Current State (V2 Complete)

### Core Architecture

| Component | Status |
|-----------|--------|
| CLI (Commander.js) | Done |
| Plugin system (interfaces, registry, installer) | Done |
| Manifest (.backgenrc.json) | Done |
| Template engine (Handlebars) | Done |
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

## V3: Resource Generator with Relations

**Goal:** Make `backgen generate resource` powerful enough for real products.

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

Useful for:
- CI/CD pipelines
- AI agents
- Automation scripts

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
| Add `--fields` flag | Non-interactive field specification |
| Add `--relations` flag | Relation definitions |
| Parse relation syntax | `name:Type` format |
| Update Prisma template | `@relation` directives |
| Update service template | `include`/`select` queries |
| Update validation template | Foreign key validation |
| Migration generator | `prisma migrate` wrapper |
| Seed generator | Template-based seed data |
| Factory generator | Test data factories |

---

## V4: Domain Presets

**Goal:** One command to generate a complete domain-specific backend.

### Presets

| Preset | Command | Resources |
|--------|---------|-----------|
| Healthcare | `backgen init healthcare` | Patient, Doctor, Appointment, Prescription, MedicalRecord |
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

### Implementation

| Task | Description |
|------|-------------|
| Preset registry | Map preset names to resource sets |
| Preset templates | Domain-specific model definitions |
| Preset installer | Generate all resources in order |
| Preset validation | Verify preset completeness |

---

## V5: Infrastructure Features

### Multi-Database Support

| Database | ORM | Status |
|----------|-----|--------|
| PostgreSQL | Prisma | Done |
| MySQL | Prisma | Planned |
| MongoDB | Prisma | Planned |
| SQLite | Prisma | Planned |

### Background Jobs

```bash
backgen add jobs bullmq
```

Generates:
- Job queue setup
- Worker configuration
- Job definitions
- Retry logic

### Rate Limiting

```bash
backgen add ratelimit redis
```

Supports:
- Redis-backed
- In-memory
- Per-route configuration

### API Versioning

```bash
backgen add versioning
```

Generates:
- `/api/v1/` and `/api/v2/` structure
- Version-based routing
- Deprecation headers

### Webhooks

```bash
backgen add webhook
```

Generates:
- Signature verification
- Retry support
- Event logging
- Delivery tracking

---

## V6: Enterprise Features

### Multi-Tenant SaaS

```bash
backgen add tenancy
```

Generates:
- Tenant model
- Organization model
- Membership model
- Invitation system
- Tenant-scoped queries
- Tenant middleware

### Audit Logging

```bash
backgen add audit
```

Tracks:
- User actions
- Resource changes
- Authentication events
- IP addresses
- User agents

### Feature Flags

```bash
backgen add flags
```

Generates:
- Feature flag service
- `isFeatureEnabled("new-dashboard")` function
- Flag management API
- Percentage rollouts

### Permissions

```bash
backgen add permissions
```

Supports:
- RBAC (Role-Based Access Control)
- ABAC (Attribute-Based Access Control)
- Permission middleware
- Role hierarchy

---

## V7: Developer Experience

### OpenAPI Import

```bash
backgen import openapi api.yaml
```

Generates:
- Routes
- Controllers
- Validation schemas
- DTOs
- Tests

### Prisma Import

```bash
backgen import prisma schema.prisma
```

Generates:
- Services
- Controllers
- Routes
- Validation

### ERD Generator

```bash
backgen generate erd
```

Outputs:
- `erd.svg` entity relationship diagram
- Auto-generated from Prisma schema

### Documentation Generator

```bash
backgen docs
```

Generates:
- `API_REFERENCE.md`
- `ARCHITECTURE.md`
- `DEVELOPMENT.md`

### Dependency Graph

```bash
backgen graph
```

Visualizes:
```
Controller
 ↓
Service
 ↓
Repository
```

---

## V8: AI-Friendly Features

### Explain Command

```bash
backgen explain UserService
```

Explains generated code in plain English.

### Refactor Command

```bash
backgen refactor auth
```

Upgrades module architecture with breaking change detection.

### Review Command

```bash
backgen review
```

Checks:
- Architecture violations
- Security issues
- Missing tests
- Code quality

### Generate from Prompt

```bash
backgen generate module \
  --prompt "Appointment booking system"
```

Produces:
```
Appointment
Schedule
Doctor
Patient
```

Resources automatically.

---

## V9: DevOps Features

### Kubernetes

```bash
backgen add kubernetes
```

Generates:
- `deployment.yaml`
- `service.yaml`
- `ingress.yaml`
- `configmap.yaml`
- `secret.yaml`

### GitHub Actions

```bash
backgen add github-actions
```

Creates CI/CD pipeline:
- Lint
- Test
- Build
- Deploy

### Monitoring

```bash
backgen add monitoring
```

Options:
- Prometheus metrics
- Grafana dashboards
- OpenTelemetry tracing

### Logging

```bash
backgen add logging pino
```

Options:
- Pino (fast, JSON)
- Winston (flexible, transports)

---

## V10: Marketplace Ecosystem

The long-term differentiator.

### Community Plugins

```bash
backgen marketplace
```

Browse and install community packages:

```bash
backgen add @backgen/stripe
backgen add @backgen/clerk
backgen add @backgen/resend
backgen add @backgen/aws-s3
backgen add @company/custom-auth
```

### Plugin Structure

```
packages/
  plugin-stripe/
    index.ts
    templates/
  plugin-s3/
    index.ts
    templates/
```

Each plugin exports:
```ts
export default stripePlugin;
```

Registry loads:
```ts
import stripePlugin from "@backgen/plugin-stripe";
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

| Version | Focus | Key Features |
|---------|-------|--------------|
| V1 | Foundation | CLI, templates, init, generate resource |
| V2 | Plugin System | Plugins, manifest, add/remove/sync, Stripe/S3/Clerk |
| V3 | Resource Generator | Relations, --fields, migrations, seeds, factories |
| V4 | Domain Presets | healthcare, saas, ecommerce, crm, lms, fintech |
| V5 | Infrastructure | Multi-DB, jobs, rate limiting, versioning, webhooks |
| V6 | Enterprise | Tenancy, audit, flags, permissions |
| V7 | DX | OpenAPI import, Prisma import, ERD, docs, graph |
| V8 | AI Features | explain, refactor, review, generate from prompt |
| V9 | DevOps | Kubernetes, GitHub Actions, monitoring, logging |
| V10 | Marketplace | Community plugins, third-party ecosystem |

---

## Design Principles

1. **Deterministic, not AI-generated** — Templates produce consistent, predictable code
2. **Zero runtime dependency** — Generated projects own all code
3. **Plugin-first** — Everything is a plugin, including auth
4. **Manifest is truth** — `.backgenrc.json` tracks everything
5. **Fail safe** — Checkpoint/resume, non-fatal npm install
6. **Test everything** — 50 E2E tests cover all commands
7. **Developer owns code** — No BackGen artifacts in generated projects
