# BackGen Roadmap

> Generate production-ready backend foundations so developers can focus on business logic, not boilerplate.

## Vision

BackGen evolves through three stages:

| Stage | What | Differentiator |
|-------|------|----------------|
| **Stage 1** | Scaffolder | CLI + templates |
| **Stage 2** | Backend framework accelerator | Plugins + resources + presets + hardening |
| **Stage 3** | Backend platform | Marketplace + schema-first + AI modeling |

End state — developer runs:

```bash
backgen init saas-core
backgen add clerk
backgen add stripe
backgen add resend
backgen add s3
backgen add monitoring
backgen upgrade
backgen generate schema schema.yaml
```

Production-ready multi-tenant backend in under 5 minutes.

---

## Current State (V4 Complete)

### Architecture

| Component | Status |
|-----------|--------|
| CLI (Commander.js, subcommands) | Done |
| Plugin system (interfaces, registry, installer) | Done |
| Manifest (.backgenrc.json, versions, source) | Done |
| Template engine (Handlebars + eq helper) | Done |
| File mutation API (append/prepend/replace) | Done |
| Checkpoint/resume system | Done |
| Domain presets (5) | Done |
| E2E test suite (121 tests) | Done |
| npm published (`@ibrahimkhaled19/backgen`) | Done |

### Commands

| Command | Description | Status |
|---------|-------------|--------|
| `backgen init [name\|preset]` | Generate project, interactive or `--defaults` | Done |
| `backgen add [plugin...]` | Install plugins, multi-select, conflict-check | Done |
| `backgen remove [plugin...]` | Uninstall plugins, multi-select | Done |
| `backgen sync` | Reconcile manifest with project | Done |
| `backgen doctor` | Health check | Done |
| `backgen generate resource\|migration\|seed\|factory <name>` | CRUD scaffolding | Done |

### Plugins

| Plugin | Category | Status |
|--------|----------|--------|
| JWT | auth | Done |
| Clerk | auth | Done (conflicts: jwt) |
| Stripe | payment | Done |
| S3 | storage | Done |
| Rate Limit | production | Done (opt-in via `backgen add ratelimit`) |
| Hardening | production | Deprecated in V4.6.1 (features now default, plugin hidden from picker) |
| Sanitize | production | Deprecated in V4.6.1 (features now default, plugin hidden from picker) |
| CI/GitHub | devops | Done (ci-github, dependabot, codeql, docker-registry, release) |

### Domain Presets

| Preset | Resources |
|--------|-----------|
| Healthcare | Patient, Doctor, Appointment, Prescription, MedicalRecord, Availability, Review |
| SaaS | User, Organization, Membership, Subscription, Invoice |
| E-commerce | Product, Category, Order, OrderItem, Cart, Payment |
| CRM | Contact, Company, Deal, Activity, Pipeline |
| LMS | Course, Lesson, Enrollment, Progress, Certificate |

### Init Output

`backgen init` generates project with:
- Express + TypeScript (strict mode)
- Prisma + PostgreSQL
- Zod validation (env, request, response)
- Swagger/OpenAPI
- Docker + docker-compose
- Winston logging
- ESLint + Vitest
- `.backgenrc.json` manifest
- **Hardened by default:** helmet, env-driven CORS, xss + mongo-sanitize, request ID, request timeout, graceful shutdown, health checks, error envelope, body size limit
- **Middleware in subfolders:** `core/` (errors, logger, validate), `security/` (cors-strict, sanitize), `observability/` (request-id, request-timeout, health)

No auth by default. User chooses: `backgen add jwt` or `backgen add clerk`.

---

## V4.5: SaaS Core (Multi-Tenant Foundation)

**Goal:** Multi-tenant infra without billing. SaaS shell any team can build on.

**Why first:** Most startups are SaaS. Multi-tenant is the hardest infra to retrofit. Ship it before billing, not after.

**Why slimmed:** Earlier roadmap piled billing + audit into V4.5. That bloated scope. Billing + audit moved to V9 (Enterprise) where they belong.

```bash
backgen init saas-core
```

### Includes

| Component | What |
|-----------|------|
| Organizations | Tenant root model, slug, settings |
| Memberships | User↔Org join, role enum |
| Invitations | Email invite, accept/decline, expiry |
| Teams | Optional sub-org grouping |
| RBAC | Owner / Admin / Member / Viewer |
| Tenant Middleware | Auto-scope queries to `req.org` |
| Soft Delete | `deletedAt` on tenant-scoped models |
| Audit Trail Stub | Hook points for V9 audit plugin |

### Excludes (moved to V9)

- Stripe billing/subscriptions
- Invoice generation
- Full audit log API
- Feature flags
- Advanced permissions (ABAC)

### Init Workflow

```bash
backgen init saas-core
backgen add jwt          # or clerk
backgen add resend       # V6: invite emails
backgen add stripe       # V9: billing later
```

### Why This Order

SaaS Core ships a usable shell. V4.6 hardens it. V9 layers billing/audit. No rewrites.

---

## V4.6: Production Hardening (NEW)

**Goal:** Generated apps pass first deploy. Close the gap between `npm run dev` and production.

**Why this version:** Every preset in V4 generates code that works locally but fails on real deploys. Rate limits, request IDs, graceful shutdown, sanitization — table stakes. Address before adding more features.

**Why before V5:** Hardening is a template concern, not a generator concern. Do it once for Prisma+Express, then port to Drizzle/Mongoose in V5.

### Features

| Concern | Implementation |
|---------|----------------|
| Rate Limiting | `express-rate-limit` per route, Redis-backed option, `/api/*` default |
| Request ID | `x-request-id` middleware, propagate to logs + error responses |
| Graceful Shutdown | SIGTERM/SIGINT handlers, drain connections, close Prisma |
| Input Sanitization | `xss` + `mongo-sanitize` on body params, before Zod |
| Soft Delete | `deletedAt DateTime?` base, query helpers (`findActive`, `softDelete`) |
| Transactions | `prisma.$transaction` wrapper, retry on serialization failure |
| Security Headers | `helmet` (already present), CSP, HSTS, referrer policy |
| Health Checks | `/health` (liveness), `/ready` (DB ping, deps) |
| Error Envelope | Consistent `{ error, code, requestId, details }` shape |
| Timeout | Request timeout middleware (default 30s, configurable) |
| Body Size Limit | `express.json({ limit: "1mb" })` + per-route override |
| CORS | Strict origin allowlist from env, not `*` |

### Plugins Added

```bash
backgen add ratelimit         # rate limit + Redis option (opt-in: different APIs need different limits)
```

Soft delete available per-resource: `backgen generate resource <name> --softDelete`.

### V4.6.1: Harden-by-default + Middleware Restructure

**Goal:** Close V4.6's gap — hardening shouldn't be opt-in. Every generated project ships production-ready out of the box.

**What changed:**

| Before (V4.6 opt-in) | After (V4.6.1 default) |
|----------------------|------------------------|
| `backgen add sanitize` | xss + mongo-sanitize in `app.ts` by default |
| `backgen add health` | `/health` + `/ready` in `app.ts` by default |
| `backgen add ratelimit` | Still opt-in (auth=5/min ≠ API=100/min) |
| `--hardened` flag | Removed — all new projects are hardened |
| Flat `src/middleware/*.ts` | Organized into `core/`, `security/`, `observability/` subfolders |

**New default middleware order:**
```
helmet() → corsStrict → requestId → requestTimeout →
express.json({ limit }) → sanitizeNoSql → sanitizeBody → requestLogger
```

**Plugin deprecation:**
- `hardening` & `sanitize` plugins: `available: false` (hidden from picker, `listPlugins()` still resolves for manifest compat)
- `ratelimit` plugin: stays `available: true`, writes to `security/` subfolder
- Deprecated plugins have no-op `install()` — safe for existing manifests

**Auto-migration:**
`backgen sync --yes` detects V4.6.0 flat middleware files, moves to subfolders, rewrites `app.ts` imports, normalizes `../` → `../../` paths. Dry-run by default; `--yes` skips confirm.

**New env vars:**
`BODY_SIZE_LIMIT`, `REQUEST_TIMEOUT_MS`, `CORS_ALLOWED_ORIGINS`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `REDIS_URL`

**Test suite:** 48 new V4.6.1-specific tests across 3 suites (base hardening, migration, plugin deprecation). Full suite: 121 tests.

### Verification

Each feature ships with:
- Unit test
- Integration test (supertest)
- Load test (autocannon) for rate limit
- Docs entry in generated README

### Why Not V6

V6 = DevOps tooling (CI/CD, log shipping, monitoring). V4.6 = app code. Different layer.

---

## V5: Multi-ORM Support

**Goal:** Resource generators work across ORMs. Single generator abstraction, multiple backends.

**Why before V8:** Schema-first (V8) needs to emit code for whichever ORM user picked. Multi-ORM is prerequisite, not parallel.

**Why after V4.6:** V4.6 templates written for Prisma. Port hardening to Drizzle/Mongoose during V5. Don't harden twice.

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
  generateValidation(fields: FieldDefinition[]): string;
  generateMigration(): Promise<string>;
}
```

Implementations:
- `PrismaResourceGenerator`
- `DrizzleResourceGenerator`
- `MongooseResourceGenerator`

### Command

```bash
backgen init my-api --orm drizzle
backgen init my-api --orm mongoose
backgen generate resource Product --orm prisma
```

### Migration Concerns

| Concern | Approach |
|---------|----------|
| Prisma → Drizzle schema | Convert directives, drop `@relation` for explicit FKs |
| Drizzle types | `InferSelectModel`, `InferInsertModel` |
| Mongoose | `Schema<Document>`, `Model<T>`, separate `_id` vs `id` |
| Validation | Zod schemas remain ORM-agnostic |
| Transactions | Drizzle `db.transaction`, Mongoose `session.withTransaction` |

### Port Checklist

- [ ] V4.6 hardening middleware (works for any ORM, no port)
- [ ] Plugin env injection (ORM-agnostic)
- [ ] File mutation API (ORM-agnostic)
- [ ] Resource generator (per-ORM implementation)
- [ ] Manifest schema (add `orm` field, version 1.1.0)

---

## V6: DevOps & Infrastructure

**Goal:** CI/CD, logging, monitoring, background jobs. Tools developers use daily.

**Why move earlier:** `backgen add ci-github` and `backgen add monitoring` are first-day needs, not enterprise needs.

### CI/CD (Done)

5 plugins shipped — full CI/CD pipeline:

```bash
backgen add ci-github       # CI: lint, typecheck, test, build
backgen add dependabot      # Dependency updates
backgen add codeql          # Security analysis
backgen add docker-registry # Docker build + GHCR publish
backgen add release         # npm publish + GitHub releases
```

### Logging

```bash
backgen add logging pino
backgen add logging winston   # default
```

Pino faster, JSON native. Winston flexible, more transports.

### Monitoring

```bash
backgen add monitoring
```

Options:
- Prometheus metrics endpoint
- OpenTelemetry tracing
- Sentry error tracking

### Infrastructure Plugins

```bash
backgen add jobs bullmq           # Background jobs (Redis)
backgen add ratelimit redis       # Rate limiting with shared store
backgen add webhook               # Webhook delivery + signing
backgen add versioning            # API versioning (v1, v2 namespaces)
backgen add email resend          # Transactional email
backgen add email sendgrid
backgen add email postmark
backgen add cache redis           # Cache layer
backgen add search meilisearch    # Full-text search
backgen add search algolia
backgen add queue sqs             # AWS SQS
backgen add storage gcs           # Google Cloud Storage
```

### Observability Defaults

`backgen init` includes:
- `/health` (liveness)
- `/ready` (DB + Redis ping)
- `/metrics` (Prometheus)
- Structured logs with `requestId`
- Error tracking hook (no-op if Sentry not configured)

---

## V7: Developer Experience (Slim)

**Goal:** Lifecycle commands that keep developers in the BackGen ecosystem.

**Why slimmed:** Earlier roadmap had `graph`, `codemod`, `upgrade`. First two were speculative. Cut. Focus on commands with clear ROI.

### Commands

| Command | Status | Purpose |
|---------|--------|---------|
| `backgen doctor` | Done | Health check |
| `backgen sync` | Done | Reconcile manifest |
| `backgen upgrade` | Planned | Upgrade templates + deps safely |
| `backgen doctor --fix` | Planned | Auto-fix common issues |

### Upgrade System

```bash
backgen upgrade
backgen upgrade --patch
backgen upgrade --plugin stripe
```

- Compare installed plugin versions with latest bundled
- Show diff before applying
- Dry-run by default
- Rollback via `backgen upgrade --rollback`
- Backward-compatible manifest migrations

### Doctor Enhancements

```bash
backgen doctor           # health report
backgen doctor --fix     # auto-fix: missing .env keys, prisma generate, etc.
backgen doctor --strict  # exit 1 on warnings
```

Checks expand to:
- Plugin health (env vars present, deps installed)
- Schema drift (manifest vs project state)
- Security (secrets in env, no hardcoded keys)
- Performance (bundle size, dep count)

### Cut From Roadmap

- `backgen graph` — text-based dep graph, low ROI, defer to V8
- `backgen codemod` — needs stable AST transforms, defer until plugin pattern stabilizes

---

## V8: Schema-First Development

**Goal:** Define entire backend in YAML. Generate everything.

**Why after V5:** Generator abstraction needed to emit code for Prisma/Drizzle/Mongoose. Multi-ORM is prerequisite.

**Why huge:** Teams will pay for this. Define domain once, get complete backend. Closer to a product than a CLI.

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
  - resend

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
      status: enum(Scheduled|Completed|Cancelled)
      notes: text
    relations:
      patient: Patient
      doctor: Doctor
```

### Command

```bash
backgen generate schema backgen.yaml
backgen schema diff
backgen schema validate
backgen schema apply
```

Generates:
- All Prisma models with relations
- All CRUD endpoints (controller, service, validation, routes)
- All tests (unit + integration)
- Swagger documentation
- Seed data
- Migration plan

### Imports

```bash
backgen import openapi api.yaml
backgen import prisma schema.prisma
backgen import postman collection.json
```

Reverse: given existing schema, generate BackGen project.

### Drift Detection

```bash
backgen schema diff
```

Output:
```
- Appointment.status: enum(Scheduled|Completed|Cancelled) → string
+ Patient.middleName: string?
+ new resource: Insurance
```

Apply with `backgen schema apply` (with confirmation).

### Why Now

V4.5 (multi-tenant) + V5 (multi-ORM) + V6 (plugins) + V7 (upgrade) = stable foundation. V8 layers declarative generation on top.

---

## V9: Enterprise Features

**Goal:** Move billing, audit, advanced permissions out of V4.5 into proper Enterprise tier.

**Why this version:** SaaS Core (V4.5) shipped without billing. Teams that need billing layer it in here. Audit + flags + advanced RBAC round out the platform.

### Billing (moved from V4.5)

```bash
backgen add billing stripe
```

- Plan model (free, pro, enterprise)
- Subscription state machine
- Webhook handler (subscription.created/updated/cancelled)
- Invoice generation
- Usage-based pricing support
- Customer portal link

### Audit Logging

```bash
backgen add audit
```

- Auto-capture: create, update, delete on tagged models
- Auth events (login, logout, password change)
- IP + user agent
- Audit log API (`GET /audit-logs?resource=Patient&userId=...`)
- Export to S3/Postgres

### Feature Flags

```bash
backgen add flags
```

- `isFeatureEnabled("new-dashboard")` runtime check
- Flag management API
- Percentage rollouts
- User/segment targeting
- A/B test variant assignment

### Advanced Permissions (ABAC)

```bash
backgen add permissions
```

- Attribute-based access control
- Permission rules as code (`can('read', 'Patient', { owner: user.id })`)
- Policy evaluation middleware
- Role hierarchy (Owner > Admin > Member > Viewer + custom)

### Why Not V4.5

V4.5 was bloated. Splitting:
- V4.5 = tenant infra
- V9 = money (billing), trust (audit), flexibility (flags, ABAC)

---

## V10: Plugin Authoring (NEW)

**Goal:** Make plugin authoring a first-class workflow. No marketplace (V11) without authors.

**Why this version:** Marketplace without authoring tools = empty shelf. V10 ships the toolkit, V11 ships the shelf.

### Plugin Template

```bash
backgen create plugin my-plugin
```

Generates:
```
my-plugin/
  index.ts               # BackGenPlugin export
  templates/             # Handlebars templates
  src/
  __tests__/             # Plugin test fixtures
  README.md
  backgen.plugin.json    # Manifest
  package.json
  tsconfig.json
```

### Authoring Commands

| Command | Purpose |
|---------|---------|
| `backgen create plugin <name>` | Scaffold plugin package |
| `backgen plugin validate` | Lint plugin structure |
| `backgen plugin test` | Run plugin tests in isolated project |
| `backgen plugin publish` | Publish to npm with `backgen-plugin` keyword |
| `backgen plugin docs` | Generate plugin docs from templates + manifest |

### Test Fixtures

Standardized test harness:
- Isolated project per test
- Mock `InstallContext`
- Snapshot test for generated files
- Diff test for file mutations
- Manifest assertions

### Manifest Schema

Versioned:
```json
{
  "schemaVersion": "1.0.0",
  "name": "@acme/stripe-extras",
  "version": "1.0.0",
  "category": "payment",
  "compatibility": {
    "backgen": ">=1.5.0"
  }
}
```

Breaking changes get `schemaVersion: "2.0.0"`.

### Documentation Site

- Plugin authoring guide
- Template API reference
- Manifest schema reference
- Example plugins (community-contributed)
- Plugin review checklist

### Why Before Marketplace

Marketplace (V11) needs:
- Plugin template (V10)
- Validation (V10)
- Test harness (V10)
- Docs (V10)

Without these, marketplace = npm search with extra steps.

---

## V11: Marketplace Ecosystem

**Goal:** Community plugin discovery + install. The long-term differentiator.

**Why after V10:** See above. Can't curate what users can't author.

```bash
backgen marketplace
backgen marketplace search "auth"
backgen add @backgen/stripe-extras
backgen add @company/custom-auth
backgen plugin publish
```

### Registry

Central plugin registry (separate service):
- Plugin metadata + version history
- Search by category, framework, ORM
- Compatibility matrix
- Download counts + ratings
- Verified publisher badges

### Curation

- Automated checks: manifest valid, tests pass, security scan
- Manual review for "verified" badge
- Deprecation policy (12-month support window)
- Yanking for security issues

### Plugin Lifecycle

```bash
backgen plugin publish       # → registry
backgen plugin unpublish     # soft delete, 30-day grace
backgen plugin deprecate     # mark old versions
backgen plugin transfer      # change ownership
```

### Revenue (Optional)

- Free tier: unlimited community plugins
- Verified badge: paid review
- Featured placement: sponsored

Not in scope for V11 initial release. Add if traction.

---

## V12: AI-Assisted Scaffolding (Stretch)

**Goal:** One unique AI feature. Defer everything else to Cursor/Copilot.

**Why demoted:** Earlier roadmap had `backgen explain`, `backgen refactor`, `backgen review`. All compete with Cursor/Copilot and lose. Keep only what BackGen can do better.

**Why kept:** Schema-aware AI generation is genuinely valuable. BackGen has the schema context; general AI tools don't.

### In Scope

```bash
backgen suggest
```

Reads current project state, suggests:
- Missing resources (e.g., User model has no `sessions` table)
- Missing relations (e.g., Appointment has no `cancellationReason` field)
- Missing plugins (e.g., no rate limiting on `/api/auth/*`)
- Missing tests (e.g., 3 resources have no integration tests)

```bash
backgen generate module --prompt "Appointment booking with reminders"
```

Suggests:
- Appointment, Reminder, Schedule, Doctor, Patient, Availability
- Auto-generates with sensible defaults
- User reviews + applies

### Out of Scope (defer to general AI tools)

- `backgen explain` — Cursor does this
- `backgen refactor` — Cursor does this
- `backgen review` — Cursor/PR review tools do this
- Code completion — never compete with Copilot

### Why This Is The Only AI Feature

BackGen has schema context. Use it. Don't try to be a general AI coding assistant.

---

## Production Gaps Tracking

Production hardening items from V4 audit, mapped to V4.6 → V4.6.1:

| Gap | V4.6 Feature | V4.6.1 Status |
|-----|--------------|---------------|
| No rate limiting | `backgen add ratelimit` | Opt-in (unchanged) |
| No request ID | middleware + logger integration | **Default** |
| No graceful shutdown | SIGTERM handler + Prisma disconnect | **Default** |
| No input sanitization | `backgen add sanitize` | **Default** (xss + mongo-sanitize in app.ts) |
| No soft delete | `backgen add softdelete` | Per-resource `--softDelete` flag (unchanged) |
| No transaction wrapper | `prisma.$transaction` helper | Built-in Prisma (unchanged) |
| No health check | `/health`, `/ready` | **Default** |
| Generic CORS | Strict origin allowlist | **Default** (env-driven, empty=allow all) |
| No timeout | Request timeout middleware | **Default** |
| No body size limit | `express.json({ limit })` | **Default** |

**V4.6.1 delta:** 8/10 gaps now default. Only rate limiting + soft delete remain opt-in.

---

## Roadmap Summary

| Version | Focus | Key Features | Stage |
|---------|-------|--------------|-------|
| V1 | Foundation | CLI, templates, init, generate resource | Scaffolder |
| V2 | Plugin System | Plugins, manifest, add/remove/sync | Scaffolder |
| V3 | Resource Generator | Relations, --fields, migrations, seeds | Accelerator |
| V4 | Domain Presets | healthcare, saas, ecommerce, crm, lms | Accelerator |
| **V4.5** | **SaaS Core** | **Multi-tenant, orgs, teams, RBAC (no billing)** | **Accelerator ✅** |
| **V4.6** | **Production Hardening** | **Rate limit, request ID, graceful shutdown, soft delete** | **Accelerator ✅** |
| **V4.6.1** | **Harden-by-default** | **8/10 gaps default, middleware subfolders, plugin deprecation, auto-migration** | **Accelerator ✅** |
| V5 | Multi-ORM | Prisma, Drizzle, Mongoose generators | Accelerator |
| V6 | DevOps | CI/CD, logging, monitoring, jobs, webhooks | Accelerator |
| V7 | DX (slim) | upgrade, doctor --fix | Accelerator |
| V8 | Schema-First | YAML definition, OpenAPI/Prisma import, drift | Platform |
| V9 | Enterprise | Billing, audit, flags, ABAC | Platform |
| **V10** | **Plugin Authoring** | **Template, validation, test harness, docs** | **Platform** |
| V11 | Marketplace | Community plugin registry + install | Platform |
| V12 | AI (stretch) | suggest, generate module from prompt | Platform |

---

## Design Principles

1. **Deterministic, not AI-generated** — Templates produce consistent, predictable code
2. **Zero runtime dependency** — Generated projects own all code
3. **Plugin-first** — Everything is a plugin, including auth
4. **Manifest is truth** — `.backgenrc.json` tracks everything
5. **Fail safe** — Checkpoint/resume, non-fatal npm install
6. **Test everything** — 121 E2E tests + integration per resource
7. **Developer owns code** — No BackGen artifacts in generated projects
8. **Domain over tools** — `backgen init saas-core` beats `backgen explain code` for adoption
9. **Harden before scale** — V4.6 ships before V6+ because deploys fail without it
10. **Author before distribute** — V10 plugin authoring ships before V11 marketplace
11. **Schema context wins** — Only AI feature we ship is schema-aware suggestions

---

## Stage Gates

| Stage | Entry Criteria | Exit Criteria |
|-------|----------------|---------------|
| 1 → 2 | Plugin system, manifest, 4 plugins, E2E tests | ✅ Met (V4) |
| 2 → 3 | Multi-ORM support, production hardening, schema-first generation | V8 complete |
| 3 → mature | Marketplace live, 20+ community plugins, plugin authoring docs | V11 complete + 12-month adoption window |

Stage 3 doesn't end at V12. It transitions from "platform" to "ecosystem." BackGen's value compounds with each community plugin.
