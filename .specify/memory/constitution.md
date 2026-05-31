<!--
Sync Impact Report
Version change: N/A → 1.0.0 (initial ratification)
Modified principles: N/A (new document)
Added sections:
  - Principle 1: TypeScript Strict Mode
  - Principle 2: No Any
  - Principle 3: Separation of Concerns
  - Principle 4: Input Validation
  - Principle 5: Endpoint Requirements
  - Principle 6: Module Completeness
  - Principle 7: Environment Validation
  - Principle 8: No Hardcoded Secrets
  - Principle 9: Build Integrity
  - Principle 10: Production Quality
  - Success Criteria
  - Governance
Removed sections: None
Templates requiring updates:
  - .specify/templates/plan-template.md — ⚠ pending (not yet created)
  - .specify/templates/spec-template.md — ⚠ pending (not yet created)
  - .specify/templates/tasks-template.md — ⚠ pending (not yet created)
Follow-up TODOs: None
-->

# BackGen Constitution

## Project Overview

**Project Name:** BackGen
**Primary Promise:** Generate production-ready backend foundations so developers can focus on business logic, not boilerplate.

---

## Principles

### Principle 1: TypeScript Strict Mode

All generated code MUST enable TypeScript strict mode.

```json
{
  "strict": true
}
```

**Rationale:** Strict mode catches type errors at compile time, enforces sound null checks, and prevents implicit any. This is non-negotiable for production-grade code.

---

### Principle 2: No Any

Use of `any` type is PROHIBITED unless accompanied by a written justification in the code comment explaining why no specific type can be used.

**Rationale:** `any` defeats TypeScript's type system. If a type is unknown, use `unknown` and narrow with type guards.

---

### Principle 3: Separation of Concerns

Business logic MUST NOT appear in controllers. The architecture MUST follow:

```
Controller → Service → Repository
```

- **Controller:** Handles HTTP request/response, delegates to service.
- **Service:** Contains business logic, orchestrates repository calls.
- **Repository:** Data access layer, handles database operations.

**Rationale:** Separation enables testability, reusability, and clear responsibility boundaries.

---

### Principle 4: Input Validation

All user input MUST be validated using Zod schemas before processing.

**Rationale:** Runtime validation prevents malformed data from entering the system. Zod provides type-safe validation with automatic TypeScript type inference.

---

### Principle 5: Endpoint Requirements

Every API endpoint MUST implement ALL of the following:

1. **Validate:** Input validation via Zod schemas.
2. **Authenticate:** Verify caller identity (unless public endpoint, which MUST be explicitly marked).
3. **Authorize:** Verify caller permissions (if authorization is enabled).
4. **Handle Errors:** Structured error responses with appropriate HTTP status codes.

**Rationale:** Partially secured endpoints are security vulnerabilities. Every endpoint must be complete.

---

### Principle 6: Module Completeness

Every generated module MUST include ALL of the following components:

| Component      | Purpose                          |
|----------------|----------------------------------|
| Controller     | HTTP request/response handling   |
| Service        | Business logic                   |
| Repository     | Data access                      |
| Validation     | Zod schemas                      |
| Types          | TypeScript type definitions      |
| Tests          | Unit and integration tests       |

**Rationale:** Incomplete modules create technical debt. Every module must be self-contained and production-ready.

---

### Principle 7: Environment Validation

All environment variables MUST be validated at application startup using Zod. Application MUST fail fast if required variables are missing or invalid.

**Rationale:** Runtime failures from missing env vars are preventable. Startup validation catches configuration errors immediately.

---

### Principle 8: No Hardcoded Secrets

Secrets (API keys, passwords, tokens, connection strings) MUST NOT appear in source code. All secrets MUST be loaded from environment variables.

**Rationale:** Hardcoded secrets in version control are security breaches waiting to happen.

---

### Principle 9: Build Integrity

All generated projects MUST pass the following commands without modification:

```bash
npm run lint
npm run typecheck
npm run test
```

**Rationale:** Generated code that doesn't build is broken code. Zero-modification pass ensures immediate productivity.

---

### Principle 10: Production Quality

Generated code MUST look like code written by a senior backend engineer. This means:

- Consistent naming conventions
- Proper error handling
- Meaningful variable/function names
- Appropriate comments (not excessive, not absent)
- Idiomatic TypeScript patterns
- Clean file organization

**Rationale:** Developers trust and adopt code that meets professional standards.

---

## Success Criteria

A developer running:

```bash
BackGen init
```

MUST have ALL of the following working out of the box within 60 seconds:

- [ ] Authentication
- [ ] Authorization
- [ ] Database connection and migrations
- [ ] CRUD APIs
- [ ] Input validation
- [ ] Swagger/OpenAPI documentation
- [ ] Docker configuration
- [ ] Tests (unit and integration)

---

## Governance

### Ratification

- **Version:** 1.0.0
- **Ratified:** 2026-05-31
- **Last Amended:** 2026-05-31

### Amendment Procedure

1. Proposed changes documented in issue or PR.
2. Review by project maintainers.
3. Version bump applied per semantic versioning:
   - **MAJOR:** Principle removal or backward-incompatible redefinition.
   - **MINOR:** New principle added or material expansion.
   - **PATCH:** Clarifications, wording, typo fixes.
4. Constitution updated with new version and amendment date.
5. Sync Impact Report updated at top of file.

### Compliance Review

- All generated code MUST be validated against these principles before release.
- Violations are treated as bugs and MUST be fixed before merge.
- Principle 9 (Build Integrity) is the automated gate; all others require code review.

### Versioning Policy

This constitution follows Semantic Versioning. The version reflects governance changes, not project feature versions. Every amendment MUST update the version and `LAST_AMENDED_DATE`.
