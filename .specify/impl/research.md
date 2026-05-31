# Research: BackGen CLI Core

**Created:** 2026-05-31

---

## R1: CLI Framework Selection

**Decision:** Commander.js

**Rationale:**
- Most popular Node.js CLI framework (85k+ weekly downloads)
- Declarative command definition
- Built-in help generation
- TypeScript support
- Minimal learning curve

**Alternatives considered:**
- **yargs:** More features but heavier; Commander.js sufficient for our needs
- **oclif:** Salesforce's CLI framework; overkill for this scope
- **Caporal:** Less maintained, smaller community

---

## R2: Template Engine Selection

**Decision:** Handlebars

**Rationale:**
- Explicit in spec ({{ResourceName}} placeholders)
- Logic-less templates prevent complexity creep
- Wide adoption, mature ecosystem
- Good TypeScript support via handlebars npm package

**Alternatives considered:**
- **EJS:** Allows arbitrary JS in templates; risk of messy templates
- **Mustache:** Too minimal (no helpers)
- **Nunjucks:** Jinja2-like; more complex than needed

---

## R3: Checkpoint/Resume Pattern

**Decision:** JSON checkpoint file

**Rationale:**
- Simple: write step completion status to `.backgen-checkpoint.json`
- On retry, read checkpoint, skip completed steps
- Delete checkpoint on successful completion
- Low implementation complexity

**Pattern:**
```json
{
  "projectName": "my-api",
  "steps": {
    "scaffold": { "status": "complete", "timestamp": "..." },
    "auth": { "status": "complete", "timestamp": "..." },
    "database": { "status": "in_progress", "timestamp": "..." },
    "swagger": { "status": "pending", "timestamp": null }
  }
}
```

**Alternatives considered:**
- **Transactional (all-or-nothing):** Rejected per clarification — checkpoint/resume preferred
- **State machine:** Overkill for linear generation steps

---

## R4: Express + Prisma + JWT Project Structure

**Decision:** Layered architecture per constitution

**Rationale:**
- Follows constitution Principle 3 (Controller → Service → Repository)
- Industry standard for Express REST APIs
- Clean separation enables testing

**Structure:**
```
src/
├── app.ts              # Express app setup
├── server.ts           # Server entry point
├── config/
│   ├── env.ts          # Zod env validation
│   ├── database.ts     # Prisma client
│   └── swagger.ts      # Swagger config
├── middleware/
│   ├── auth.ts         # JWT verification
│   ├── role.ts         # RBAC check
│   ├── validate.ts     # Zod validation
│   └── error.ts        # Global error handler
├── modules/
│   └── <resource>/
│       ├── <resource>.controller.ts
│       ├── <resource>.service.ts
│       ├── <resource>.repository.ts
│       ├── <resource>.validation.ts
│       ├── <resource>.types.ts
│       ├── <resource>.routes.ts
│       └── <resource>.test.ts
├── services/
│   ├── auth.service.ts
│   └── logger.service.ts
└── utils/
    ├── api-error.ts
    └── async-handler.ts
```

---

## R5: Swagger Auto-Generation

**Decision:** swagger-jsdoc + swagger-ui-express

**Rationale:**
- swagger-jsdoc extracts JSDoc annotations from route files
- swagger-ui-express serves interactive docs at /docs
- No code generation step; docs stay in sync with routes
- Lightweight, no build-time dependency

**Alternatives considered:**
- **tsoa:** Full OpenAPI from TypeScript decorators; heavier, opinionated
- **NestJS Swagger:** NestJS-specific
- **Manual YAML:** Error-prone, drifts from code

---

## R6: Testing Strategy for Generated Projects

**Decision:** Vitest with supertest for integration tests

**Rationale:**
- Vitest: fast, TypeScript-native, Jest-compatible API
- supertest: standard for Express endpoint testing
- Matches spec requirement (Vitest in MVP scope)

**Test structure:**
- Unit tests: service layer with mocked repository
- Integration tests: full HTTP request → response cycle
- Each resource module includes both test types

---

## R7: JWT Implementation

**Decision:** Access token (15min) + refresh token (7d)

**Rationale:**
- Short-lived access tokens limit exposure
- Refresh tokens enable seamless re-auth
- bcrypt for password hashing (industry standard)
- Tokens stored in response body (not cookies) for API-first design

**Token flow:**
1. Register → return access + refresh tokens
2. Login → return access + refresh tokens
3. Refresh → return new access token (valid refresh required)
4. Logout → invalidate refresh token

---

## R8: RBAC Implementation

**Decision:** Role field on User model + middleware check

**Rationale:**
- Simple: `role: 'admin' | 'user'` enum on User table
- Middleware: `requireRole('admin')` on protected routes
- Default role: 'user' on registration
- Admin routes explicitly protected

**Alternatives considered:**
- **Permission-based:** More flexible but overkill for MVP (Admin/User sufficient)
- **Casbin/ACL libraries:** External dependency, adds complexity

---

## R9: Error Handling Pattern

**Decision:** Custom ApiError class + global error middleware

**Rationale:**
- Consistent error response format across all endpoints
- Controllers throw ApiError, middleware catches and formats
- HTTP status codes mapped to error types
- Stack traces in development, hidden in production

**Response format:**
```json
{
  "status": 400,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Invalid email" }]
}
```
