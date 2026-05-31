# Tasks: BackGen CLI Core

**Feature:** specs/001-backgen-cli-core/spec.md
**Plan:** .specify/impl/plan.md
**Created:** 2026-05-31

---

## User Stories

| ID | Story | Priority |
|----|-------|----------|
| US1 | New Project Initialization | P1 |
| US2 | Add Resource to Existing Project | P2 |
| US3 | Add Feature to Existing Project | P3 |
| US4 | Project Health Check | P3 |

---

## Phase 1: Setup

Project initialization for BackGen CLI tool.

- [x] T001 Initialize BackGen CLI project with package.json in package.json
- [x] T002 Create TypeScript configuration with strict mode in tsconfig.json
- [x] T003 Configure ESLint for TypeScript in .eslintrc.json
- [x] T004 Configure Vitest for testing in vitest.config.ts
- [x] T005 Create project directory structure per plan in src/
- [x] T006 Install dependencies: commander, inquirer, handlebars, chalk, ora in package.json
- [x] T007 Install dev dependencies: typescript, vitest, @types/node in package.json
- [x] T008 Create CLI entry point with shebang in src/index.ts

---

## Phase 2: Foundational

Blocking prerequisites for all user stories.

- [x] T009 Implement Commander.js CLI skeleton with init/generate/add/doctor commands in src/cli.ts
- [x] T010 Create command router connecting CLI commands to handlers in src/commands/index.ts
- [x] T011 Implement template engine core with Handlebars loading and rendering in src/core/template-engine.ts
- [x] T012 Create template directory structure for Express/PostgreSQL/Prisma stack in templates/
- [x] T013 Implement placeholder resolution (ResourceName, resourceName, resourcePlural) in src/core/placeholders.ts
- [x] T014 Implement checkpoint system for generation progress in src/core/checkpoint.ts
- [x] T014a Implement resume command (BackGen init --resume) in src/commands/init.ts
- [x] T014b Implement checkpoint integrity validation on resume in src/core/checkpoint.ts
- [x] T015 Create shared utility: ApiError class in templates/express/src/utils/api-error.ts.hbs
- [x] T016 Create shared utility: async handler wrapper in templates/express/src/utils/async-handler.ts.hbs
- [x] T017 Create shared utility: response formatter in templates/express/src/utils/response.ts.hbs

---

## Phase 3: User Story 1 — New Project Initialization

**Story:** As a backend developer, I want to generate a complete backend project with one command so that I can start writing business logic immediately.

**Independent Test:** Run `BackGen init my-api`, verify project structure created, `npm run lint/typecheck/test` pass, server starts, Swagger accessible at /docs, auth endpoints respond.

- [x] T018 [US1] Implement init command handler with interactive wizard and --resume flag in src/commands/init.ts
- [x] T019 [US1] Implement directory validation (abort if not empty) in src/commands/init.ts
- [x] T020 [US1] Implement project config collection via Inquirer.js prompts in src/commands/init.ts
- [x] T021 [US1] Create Express app setup template in templates/express/src/app.ts.hbs
- [x] T022 [US1] Create Express server entry point template in templates/express/src/server.ts.hbs
- [x] T023 [US1] Create environment validation config with Zod in templates/express/src/config/env.ts.hbs
- [x] T024 [US1] Create database config with Prisma client in templates/express/src/config/database.ts.hbs
- [x] T025 [US1] Create Prisma schema template with User and RefreshToken models in templates/express/prisma/schema.prisma.hbs
- [x] T026 [US1] Create package.json template with all dependencies in templates/express/package.json.hbs
- [x] T027 [US1] Create tsconfig.json template with strict mode in templates/express/tsconfig.json.hbs
- [x] T028 [US1] Create ESLint config template in templates/express/.eslintrc.json.hbs
- [x] T029 [US1] Create Vitest config template in templates/express/vitest.config.ts.hbs
- [x] T030 [US1] Create .env.example template in templates/express/.env.example.hbs
- [x] T031 [US1] Create .gitignore template in templates/express/.gitignore.hbs
- [x] T032 [US1] Create README.md template in templates/express/README.md.hbs
- [x] T033 [US1] Implement post-generation npm install step in src/commands/init.ts
- [x] T034 [US1] Implement success message with next steps in src/commands/init.ts

---

## Phase 4: User Story 1 — Authentication Module

**Story:** Continuation of US1 — generated project must include working JWT authentication.

**Independent Test:** Register user via POST /api/auth/register, login via POST /api/auth/login, access protected endpoint with Bearer token, refresh token via POST /api/auth/refresh.

- [x] T035 [US1] Create auth middleware template (JWT verification) in templates/express/src/middleware/auth.ts.hbs
- [x] T036 [US1] Create validation middleware template (Zod) in templates/express/src/middleware/validate.ts.hbs
- [x] T037 [US1] Create error handler middleware template in templates/express/src/middleware/error.ts.hbs
- [x] T038 [US1] Create auth service template (register, login, refresh, logout) in templates/express/src/modules/auth/auth.service.ts.hbs
- [x] T039 [US1] Create auth controller template in templates/express/src/modules/auth/auth.controller.ts.hbs
- [x] T040 [US1] Create auth validation schemas (Zod) in templates/express/src/modules/auth/auth.validation.ts.hbs
- [x] T041 [US1] Create auth types in templates/express/src/modules/auth/auth.types.ts.hbs
- [x] T042 [US1] Create auth routes template in templates/express/src/modules/auth/auth.routes.ts.hbs
- [x] T043 [US1] Create auth tests template in templates/express/src/modules/auth/auth.test.ts.hbs
- [x] T044 [US1] Create logger service template (winston) in templates/express/src/services/logger.service.ts.hbs
- [x] T045 [US1] Create request logging middleware (morgan) in templates/express/src/middleware/logger.ts.hbs

---

## Phase 5: User Story 1 — Authorization & Swagger

**Story:** Continuation of US1 — generated project must include RBAC and API documentation.

**Independent Test:** Register admin user, access admin-only endpoint, access /docs and verify all endpoints documented.

- [ ] T046 [US1] Create role middleware template (RBAC check) in templates/express/src/middleware/role.ts.hbs
- [ ] T047 [US1] Create admin routes template (user management) in templates/express/src/modules/admin/admin.controller.ts.hbs
- [ ] T048 [US1] Create admin service template in templates/express/src/modules/admin/admin.service.ts.hbs
- [ ] T049 [US1] Create admin routes in templates/express/src/modules/admin/admin.routes.ts.hbs
- [ ] T050 [US1] Create Swagger config template in templates/express/src/config/swagger.ts.hbs
- [ ] T051 [US1] Create Dockerfile template (multi-stage build) in templates/express/Dockerfile.hbs
- [ ] T052 [US1] Create docker-compose.yml template in templates/express/docker-compose.yml.hbs
- [ ] T053 [US1] Create .dockerignore template in templates/express/.dockerignore.hbs
- [ ] T054 [US1] Wire all modules into app.ts template (routes, middleware, swagger) in templates/express/src/app.ts.hbs

---

## Phase 6: User Story 2 — Resource Generation

**Story:** As a developer with an existing BackGen project, I want to generate a new CRUD resource so that I can add new API endpoints with consistent patterns.

**Independent Test:** Run `BackGen generate resource Product name:string price:number`, verify all files generated (controller, service, repository, validation, types, tests, routes), Prisma schema updated, endpoints accessible.

- [ ] T055 [US2] Implement generate resource command handler in src/commands/generate.ts
- [ ] T056 [US2] Implement interactive field collection (name:type parsing) in src/commands/generate.ts
- [ ] T057 [US2] Implement duplicate resource detection (abort if exists) in src/commands/generate.ts
- [ ] T058 [US2] Create resource controller template (CRUD operations) in templates/express/src/modules/resource/resource.controller.ts.hbs
- [ ] T059 [US2] Create resource service template (business logic placeholder) in templates/express/src/modules/resource/resource.service.ts.hbs
- [ ] T060 [US2] Create resource repository template (database operations) in templates/express/src/modules/resource/resource.repository.ts.hbs
- [ ] T061 [US2] Create resource validation template (Zod schemas) in templates/express/src/modules/resource/resource.validation.ts.hbs
- [ ] T062 [US2] Create resource types template in templates/express/src/modules/resource/resource.types.ts.hbs
- [ ] T063 [US2] Create resource routes template (with auth middleware) in templates/express/src/modules/resource/resource.routes.ts.hbs
- [ ] T064 [US2] Create resource test template (unit + integration) in templates/express/src/modules/resource/resource.test.ts.hbs
- [ ] T065 [US2] Implement Prisma schema updater — append new model block before closing of schema.prisma using string insertion after last model definition in src/core/prisma-updater.ts
- [ ] T066 [US2] Implement route registrar — insert import statement and router.use() call into app.ts by finding existing route registration pattern and appending new resource route in src/core/route-registrar.ts
- [ ] T067 [US2] Implement field type mapper (string/number/boolean/date → Prisma/Zod/TS types) in src/core/field-mapper.ts

---

## Phase 7: User Story 3 — Add Feature

**Story:** As a developer with an existing BackGen project, I want to add authentication to my project so that I can secure my endpoints without manual integration.

**Independent Test:** Run `BackGen add auth` on project without auth, verify auth module installed, endpoints work. Only `auth` feature is available in MVP; other features (payment, storage, notification) return "Feature not available in MVP" error.

- [ ] T068 [US3] Implement add feature command handler in src/commands/add.ts
- [ ] T069 [US3] Create feature registry (auth, payment, storage, notification) in src/core/feature-registry.ts
- [ ] T070 [US3] Implement feature detection (check if already installed) in src/commands/add.ts
- [ ] T071 [US3] Implement feature installer (template copy + integration) in src/core/feature-installer.ts
- [ ] T072 [US3] Create auth feature definition in src/features/auth.ts

---

## Phase 8: User Story 4 — Project Health Check

**Story:** As a developer with an existing BackGen project, I want to verify my project configuration is correct so that I can catch configuration issues early.

**Independent Test:** Run `BackGen doctor` on valid project, verify all checks pass. Run on broken project, verify issues reported with fix instructions.

- [ ] T073 [US4] Implement doctor command handler in src/commands/doctor.ts
- [ ] T074 [US4] Implement Node.js version check (>= 18) in src/commands/doctor.ts
- [ ] T075 [US4] Implement npm availability check in src/commands/doctor.ts
- [ ] T076 [US4] Implement .env completeness check in src/commands/doctor.ts
- [ ] T077 [US4] Implement DATABASE_URL validation in src/commands/doctor.ts
- [ ] T078 [US4] Implement Prisma schema validity check in src/commands/doctor.ts
- [ ] T079 [US4] Implement dependency health check in src/commands/doctor.ts
- [ ] T080 [US4] Implement database connection test in src/commands/doctor.ts
- [ ] T081 [US4] Implement check result formatter with status icons in src/commands/doctor.ts

---

## Phase 9: Polish & Cross-Cutting Concerns

Final validation and quality assurance.

- [ ] T082 Create CLI integration tests in src/__tests__/cli.test.ts
- [ ] T083 Create template rendering tests in src/__tests__/templates.test.ts
- [ ] T084 Create end-to-end test: init → start → hit endpoint in src/__tests__/e2e.test.ts
- [ ] T085 Validate generated projects pass `npm run lint` without modification
- [ ] T086 Validate generated projects pass `npm run typecheck` without modification
- [ ] T087 Validate generated projects pass `npm run test` without modification
- [ ] T088 Add --help and --version global options in src/cli.ts
- [ ] T089 Add progress indicators (ora) during generation in src/commands/init.ts
- [ ] T090 Add colored output (chalk) for success/error messages in src/utils/logger.ts

---

## Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1 Init)
                                           → Phase 4 (US1 Auth)
                                           → Phase 5 (US1 RBAC/Swagger)
                                           → Phase 6 (US2 Resource Gen)
                                           → Phase 7 (US3 Add Feature)
                                           → Phase 8 (US4 Doctor)
                                           → Phase 9 (Polish)
```

US2, US3, US4 can be developed in parallel after Foundational phase completes.

---

## Parallel Execution Opportunities

### Phase 3-5 (US1): Auth Module + RBAC + Swagger + Docker

After T021-T034 (init scaffolding) complete, these can proceed in parallel:
- T035-T045 (Auth Module)
- T046-T054 (RBAC + Swagger + Docker)

### Phase 6 (US2): Resource Templates

After Foundational phase, resource templates are independent of US1 auth:
- T058-T064 (Resource templates) can proceed in parallel with US1

### Phase 9 (Polish): Tests

After all implementation phases:
- T082-T084 (Test suites) can run in parallel

---

## Implementation Strategy

### MVP Scope

**Phase 1-5 (US1):** Get `BackGen init` working end-to-end.

This is the core value proposition. A developer runs one command and gets a working backend with auth, RBAC, Swagger, Docker, and tests.

### Incremental Delivery

1. **MVP (Phase 1-5):** `BackGen init` generates complete project
2. **Phase 6:** `BackGen generate resource` adds CRUD modules
3. **Phase 7:** `BackGen add` extends existing projects
4. **Phase 8:** `BackGen doctor` validates project health
5. **Phase 9:** Full test coverage and polish

---

## Task Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 1: Setup | 8 | Project initialization |
| Phase 2: Foundational | 11 | CLI skeleton, template engine, checkpoint/resume, shared utilities |
| Phase 3: US1 Init | 17 | Project generation scaffolding |
| Phase 4: US1 Auth | 11 | Authentication module |
| Phase 5: US1 RBAC/Swagger | 9 | Authorization, API docs, Docker |
| Phase 6: US2 Resource | 13 | CRUD resource generation |
| Phase 7: US3 Add Feature | 5 | Feature installation |
| Phase 8: US4 Doctor | 9 | Project health check |
| Phase 9: Polish | 9 | Tests, validation, UX polish |
| **Total** | **92** | |
