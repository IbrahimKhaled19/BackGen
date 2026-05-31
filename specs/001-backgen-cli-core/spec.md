# Specification: BackGen CLI Core

**Feature Directory:** `specs/001-backgen-cli-core`
**Created:** 2026-05-31
**Status:** Planned
**Implementation Plan:** `.specify/impl/plan.md`
**Tasks:** `.specify/impl/tasks.md`

---

## Clarifications

### Session 2026-05-31

- Q: What should happen when `BackGen init` is run in a non-empty directory? → A: Abort with error message ("Directory not empty").
- Q: Which field types should the resource generator support in MVP? → A: string, number, boolean, date (4 basic types; enum, relation, json deferred to post-MVP).
- Q: How should the tool handle a generation that fails mid-process? → A: Checkpoint/resume — save progress, retry from last successful step.
- Q: What should happen when generating a resource with a name that already exists? → A: Abort with error ("Resource already exists").
- Q: What logging should generated projects include out of the box? → A: Request logging (morgan) + structured error logging (winston).

---

## Overview

BackGen is a command-line tool that generates production-ready backend project scaffolding. Developers run a single command, answer a few questions, and receive a fully structured, working backend project they can immediately start building on.

The tool eliminates weeks of boilerplate setup — authentication, database, API structure, validation, testing, documentation, and deployment configuration — so developers focus on business logic from day one.

---

## Problem Statement

Starting a new backend project requires significant upfront investment:

- Setting up authentication and authorization
- Configuring database connections and ORM
- Structuring API routes and controllers
- Writing validation logic
- Setting up testing infrastructure
- Creating Docker configuration
- Writing API documentation

This boilerplate work takes days to weeks, is repetitive across projects, and is often done inconsistently or incorrectly. Developers waste time on infrastructure instead of business logic.

---

## Target Users

### Primary User: Backend Developer

- Builds REST APIs for web and mobile applications
- Values clean, readable, maintainable code
- Wants to skip boilerplate without sacrificing control
- Prefers owning generated code (no vendor lock-in)

### Secondary User: Full-Stack Developer

- Needs a backend quickly to support frontend work
- Less experienced with backend best practices
- Wants production-quality defaults without deep backend expertise

---

## User Scenarios & Testing

### Scenario 1: New Project Initialization

**As a** backend developer
**I want to** generate a complete backend project with one command
**So that** I can start writing business logic immediately

**Acceptance Criteria:**

1. Developer runs the init command
2. Interactive wizard collects project configuration (name, framework, database, auth, features)
3. Tool generates complete project structure with all selected features
4. Generated project passes lint, type check, and tests without modification
5. Developer can start the server and see Swagger documentation
6. Developer can register, log in, and access protected endpoints
7. Total time from command to working project: under 60 seconds

### Scenario 2: Add Resource to Existing Project

**As a** developer with an existing BackGen project
**I want to** generate a new CRUD resource
**So that** I can add new API endpoints with consistent patterns

**Acceptance Criteria:**

1. Developer runs generate resource command with resource name
2. Tool prompts for fields (name, type)
3. Tool generates controller, service, repository, validation, types, tests, and Prisma model
4. Generated code follows same patterns as existing project modules
5. New resource endpoints appear in Swagger documentation
6. All tests pass

### Scenario 3: Add Feature to Existing Project

**As a** developer with an existing BackGen project
**I want to** add a new capability (auth, payment, storage)
**So that** I can extend my project without manual integration

**Acceptance Criteria:**

1. Developer runs add command with feature name
2. Tool installs and configures the feature
3. Feature integrates with existing project structure
4. No existing code breaks
5. New feature is immediately usable

### Scenario 4: Project Health Check

**As a** developer with an existing BackGen project
**I want to** verify my project configuration is correct
**So that** I can catch configuration issues early

**Acceptance Criteria:**

1. Developer runs doctor command
2. Tool checks environment variables, database state, dependencies, configuration
3. Tool reports issues with clear fix instructions
4. Healthy project shows all checks passing

---

## Functional Requirements

### FR-1: Project Initialization

The system MUST provide an interactive wizard that:

- Validates target directory is empty; abort with error if not
- Collects project name
- Selects backend framework (MVP: Express only)
- Selects database (MVP: PostgreSQL only)
- Selects ORM (MVP: Prisma only)
- Selects authentication method (MVP: JWT only)
- Enables/disables role-based access control
- Enables/disables Docker configuration
- Generates complete project with all selections
- On failure: save checkpoint, allow resume from last successful step

### FR-2: Resource Generation

The system MUST validate resource name is unique within the project; abort with error if resource already exists.

The system MUST generate CRUD resources that include:

- Controller with create, read (list + single), update, delete operations
- Service layer with business logic placeholder
- Repository layer with database operations
- Zod validation schemas for all inputs
- TypeScript type definitions
- Unit and integration tests
- Prisma model definition
- Route definitions
- Swagger documentation

Supported field types in MVP: `string`, `number`, `boolean`, `date`. Complex types (enum, relation, json) are deferred to post-MVP.

### FR-3: Feature Installation

The system MUST support adding features to existing projects.

**MVP scope:** Authentication (JWT) only.

**Post-MVP (deferred):**
- Payment integrations (Stripe, PayPal)
- Storage solutions (Cloudinary, S3)
- Notification services (Email, SMS, Push)

### FR-4: Project Diagnostics

The system MUST provide a health check that validates:

- Required environment variables are set
- Database connection is working
- Dependencies are installed and compatible
- Configuration files are valid

### FR-5: Template-Based Generation

The system MUST use deterministic templates for all code generation. No AI-generated source code. All generated code MUST be:

- Predictable and reproducible
- Fully editable by the developer
- Free of any runtime dependency on BackGen

### FR-6: Zero Runtime Dependency

Generated projects MUST NOT require BackGen at runtime. After generation:

- No BackGen packages in package.json
- No BackGen imports in source code
- Developer owns all generated code completely

---

## Non-Functional Requirements

### NFR-1: Generation Speed

Project initialization MUST complete in under 60 seconds from command start to working project.

### NFR-2: Code Quality

Generated code MUST:

- Pass linting without modification
- Pass type checking without modification
- Pass all tests without modification
- Follow consistent naming conventions
- Be readable and maintainable

### NFR-3: Logging

Generated projects MUST include:

- HTTP request logging for all endpoints
- Structured error logging with stack traces
- Log levels configurable via environment variable

### NFR-4: Developer Experience

- Clear, helpful error messages
- Progress indicators during generation
- Intuitive command structure
- Comprehensive help text

---

## Success Criteria

### SC-1: Time to First Endpoint

A developer can generate a project and hit a working POST /api/auth/register endpoint in under 60 seconds from running `BackGen init`.

### SC-2: Zero Modification Pass

Generated projects pass `lint`, `typecheck`, and `test` commands without any manual changes.

### SC-3: Complete Coverage

Every generated module includes all required components: controller, service, repository, validation, types, tests.

### SC-4: Production Readiness

Generated code quality is indistinguishable from code written by a senior backend engineer.

### SC-5: Full Ownership

After generation, no BackGen artifacts remain in the project. Developer has complete ownership.

---

## Key Entities

### Project

Represents a generated backend project.

- Name
- Selected framework
- Selected database
- Selected ORM
- Selected auth method
- Enabled features
- Configuration options

### Resource

Represents a CRUD module within a project.

- Name (singular)
- Fields (name, type, constraints)
- Supported field types (MVP): string, number, boolean, date
- Generated files (controller, service, repository, validation, types, tests)

### Feature

Represents an installable capability.

- Name (auth, payment, storage, notification)
- Configuration requirements
- Integration points

---

## Edge Cases & Error Handling

### EC-1: Partial Generation Failure

If generation fails mid-process (npm install, disk full, template error), the tool MUST:

1. Save checkpoint of completed steps
2. Show clear error message with failure reason
3. On retry, resume from last successful checkpoint
4. No partial project left in ambiguous state

### EC-2: Init on Non-Empty Directory

If `BackGen init` is run in a directory with existing files, the tool MUST abort with error message and not modify any existing files.

### EC-3: Duplicate Resource Generation

If `BackGen generate resource` is called with a name that already exists in the project, the tool MUST abort with error message and not modify any existing files.

### EC-4: Missing Prerequisites

If Node.js, npm, or PostgreSQL are not available, the tool MUST detect and report the missing prerequisite with install instructions.

---

## Scope

### In Scope (MVP)

- CLI tool with init, generate, add, doctor commands
- Express.js framework support
- PostgreSQL database support
- Prisma ORM support
- JWT authentication with refresh tokens
- Role-based access control (Admin, User)
- Zod input validation
- Swagger/OpenAPI documentation
- Vitest testing framework
- Docker configuration generation
- HTTP request logging and structured error logging

### Out of Scope (Future Phases)

- Additional frameworks (Fastify, NestJS)
- Additional databases (MySQL, MongoDB, SQLite)
- Additional ORMs (Drizzle, Mongoose)
- Additional auth providers (Clerk, Supabase Auth, Auth.js)
- Storage integrations (Cloudinary, S3)
- Payment integrations (Stripe, PayPal)
- Notification services (Email, SMS, Push)
- GUI/CLI dashboard
- Cloud deployment integration

---

## Assumptions

1. **Node.js available:** Target environment has Node.js 18+ installed.
2. **npm available:** npm is the default package manager (yarn/pnpm support deferred).
3. **PostgreSQL available:** Developer has access to a PostgreSQL instance for generated projects.
4. **Interactive terminal:** Init wizard requires an interactive terminal for prompts.
5. **Single framework MVP:** Only Express is enabled in MVP; other frameworks are listed but disabled.
6. **Template maintenance:** Templates are maintained alongside the CLI tool, not fetched remotely.

---

## Dependencies

1. **Node.js ecosystem:** CLI tool and generated projects depend on Node.js runtime.
2. **npm registry:** Package installation during generation and in generated projects.
3. **PostgreSQL:** Generated projects require PostgreSQL for database operations.

---

## Open Questions

None. All critical decisions have reasonable defaults documented in Assumptions.
