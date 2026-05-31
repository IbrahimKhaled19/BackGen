# Implementation Plan: BackGen CLI Core

**Feature:** specs/001-backgen-cli-core/spec.md
**Created:** 2026-05-31
**Status:** In Progress

---

## Technical Context

### Technology Stack (CLI Tool)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript | Type safety, same as generated projects |
| Runtime | Node.js 18+ | LTS, wide adoption |
| CLI Framework | Commander.js | Mature, well-documented, minimal |
| Prompts | Inquirer.js | Interactive terminal prompts |
| Template Engine | Handlebars | Per spec ({{ResourceName}} placeholders) |
| Testing | Vitest | Fast, TypeScript-native |
| Package Manager | npm | Per assumption |

### Technology Stack (Generated Projects)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Express.js | Per MVP scope |
| Language | TypeScript (strict) | Per constitution |
| Database | PostgreSQL | Per MVP scope |
| ORM | Prisma | Per MVP scope |
| Auth | JWT + refresh tokens | Per MVP scope |
| Authorization | RBAC (Admin/User) | Per MVP scope |
| Validation | Zod | Per constitution |
| Documentation | Swagger/OpenAPI | Per MVP scope |
| Testing | Vitest | Per MVP scope |
| Logging | morgan + winston | Per clarification |
| Deployment | Docker | Per MVP scope |

### Architecture Decisions

1. **Template-based generation** (FR-5): All code from Handlebars templates, no dynamic AI generation
2. **Zero runtime dependency** (FR-6): Generated projects standalone, no BackGen imports
3. **Checkpoint/resume** (EC-1): Generation saves progress, resumes on failure
4. **Layered architecture** (Constitution P3): Controller → Service → Repository

### NEEDS CLARIFICATION

None. All technical decisions resolved via spec, constitution, and clarifications.

---

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| P1: TypeScript Strict | PASS | Generated tsconfig: `"strict": true` |
| P2: No Any | PASS | Templates use explicit types |
| P3: Separation of Concerns | PASS | Templates enforce Controller → Service → Repository |
| P4: Input Validation | PASS | Zod schemas in validation templates |
| P5: Endpoint Requirements | PASS | Auth middleware + validation middleware + error handler |
| P6: Module Completeness | PASS | Resource generator produces all 6 components |
| P7: Environment Validation | PASS | Zod env schema at startup |
| P8: No Hardcoded Secrets | PASS | All secrets from .env |
| P9: Build Integrity | PASS | lint/typecheck/test must pass post-generation |
| P10: Production Quality | PASS | Senior-engineer-quality templates |

**Gate:** All principles pass. No violations.

---

## Phase 0: Research

**Output:** research.md (see below)

Research topics:
1. Commander.js CLI structure patterns
2. Handlebars template organization
3. Checkpoint/resume implementation patterns
4. Express + Prisma + JWT project structure best practices
5. Swagger/OpenAPI auto-generation with Express

---

## Phase 1: Design & Contracts

**Outputs:**
- data-model.md — Entity definitions for generated projects
- contracts/ — CLI command interface contracts
- quickstart.md — Developer quickstart guide

---

## Phase 2: Implementation Plan

### Task Breakdown

#### T1: CLI Scaffolding

- Initialize BackGen CLI project (package.json, tsconfig, vitest)
- Set up Commander.js with `init`, `generate`, `add`, `doctor` commands
- Implement command routing and help text
- **Output:** Working CLI skeleton with all commands stubbed

#### T2: Template Engine Core

- Set up Handlebars template loading and rendering
- Create template directory structure for Express/PostgreSQL/Prisma stack
- Implement placeholder resolution (ResourceName, resourceName, resourcePlural)
- **Output:** Template engine that renders templates with context

#### T3: Init Command

- Implement interactive wizard (Inquirer.js prompts)
- Directory validation (abort if not empty)
- Project config collection (name, framework, database, auth, RBAC, Docker)
- Checkpoint system: save progress after each generation step
- Generate complete project structure:
  - src/ (app.ts, server.ts, config/, middleware/, modules/, services/, utils/, types/)
  - prisma/ (schema, migrations)
  - tests/
  - Dockerfile, docker-compose.yml
  - .env.example, .gitignore, README.md
  - package.json with all dependencies
  - tsconfig.json (strict: true)
  - ESLint config
  - Vitest config
- Run npm install post-generation
- **Output:** `BackGen init` generates working project

#### T4: Auth Module Template

- JWT authentication with refresh tokens
- Register, login, refresh, logout endpoints
- Auth middleware (token verification)
- Password hashing (bcrypt)
- User model in Prisma
- **Output:** Working auth module in generated projects

#### T5: RBAC Module Template

- Role-based access control (Admin, User)
- Role middleware
- Role assignment on registration
- **Output:** Working authorization in generated projects

#### T6: Resource Generator

- `BackGen generate resource <Name>` command
- Interactive field collection (name, type from: string, number, boolean, date)
- Duplicate resource detection (abort if exists)
- Generate per resource:
  - Prisma model
  - Controller (CRUD operations)
  - Service (business logic placeholder)
  - Repository (database operations)
  - Validation (Zod schemas)
  - Types (TypeScript interfaces)
  - Routes (with auth middleware)
  - Tests (unit + integration)
  - Swagger annotations
- Update Prisma schema and run migration
- **Output:** `BackGen generate resource` produces complete CRUD module

#### T7: Swagger/OpenAPI Integration

- swagger-jsdoc + swagger-ui-express setup
- Auto-generated API docs from route annotations
- Swagger config in generated project
- **Output:** /docs endpoint with full API documentation

#### T8: Logging Integration

- morgan for HTTP request logging
- winston for structured application logging
- Log level configuration via LOG_LEVEL env var
- Error logging with stack traces
- **Output:** Generated projects have production-ready logging

#### T9: Docker Configuration

- Dockerfile (multi-stage build)
- docker-compose.yml (app + PostgreSQL)
- .dockerignore
- **Output:** `docker-compose up` works out of box

#### T10: Doctor Command

- Check Node.js version
- Check npm availability
- Check PostgreSQL connection
- Check .env completeness
- Check Prisma schema validity
- Check dependency health
- **Output:** `BackGen doctor` reports project health

#### T11: Add Feature Command

- `BackGen add <feature>` command
- Feature registry (auth, payment, storage, notification)
- Feature installation (template copy + integration)
- **Output:** `BackGen add` installs features into existing projects

#### T12: Tests & Validation

- CLI integration tests
- Template rendering tests
- Generated project validation (lint, typecheck, test pass)
- End-to-end: init → start → hit endpoint
- **Output:** Full test suite, CI-ready

### Dependencies

```
T1 (CLI Scaffolding)
  └─ T2 (Template Engine)
       ├─ T3 (Init Command)
       │    ├─ T4 (Auth Module)
       │    │    └─ T5 (RBAC Module)
       │    ├─ T7 (Swagger)
       │    ├─ T8 (Logging)
       │    └─ T9 (Docker)
       ├─ T6 (Resource Generator)
       └─ T10 (Doctor)
T11 (Add Feature) — depends on T3
T12 (Tests) — depends on all above
```

### Estimated Effort

| Task | Complexity |
|------|------------|
| T1: CLI Scaffolding | Low |
| T2: Template Engine | Medium |
| T3: Init Command | High |
| T4: Auth Module | High |
| T5: RBAC Module | Medium |
| T6: Resource Generator | High |
| T7: Swagger | Medium |
| T8: Logging | Low |
| T9: Docker | Low |
| T10: Doctor | Medium |
| T11: Add Feature | Medium |
| T12: Tests | High |
