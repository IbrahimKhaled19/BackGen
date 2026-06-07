# Changelog

## [v1.9.0] - 2026-06-07

### Features
- feat(ci-github): V6 CI/CD GitHub Actions plugin — generate `.github/workflows/ci.yml` via `backgen add ci-github` with lint, typecheck, test, build, optional deploy, concurrency cancellation, coverage, audit, and Docker build validation
- feat(v6): 4 new DevOps plugins — dependabot (automated dependency updates), codeql (CodeQL security analysis on push + weekly), docker-registry (Docker build & publish to GHCR), release (semantic release with npm publish & GitHub Releases)
- feat(v6): upgrade ci.yml.hbs with concurrency groups, coverage reporting, `npm audit`, Docker build validation, Prisma schema validation

### Bug Fixes
- fix(v6): Handlebars escaping for all GitHub Actions `${{ }}` expressions across 4 templates — prevents empty rendering
- fix(v6): CodeQL permissions — added `actions: read` and `contents: read` per GitHub recommendation
- fix(v6): Docker publish trigger — removed branch push, tag-only (`v*`) for safer publishing
- fix(v6): Release workflow permissions — added `packages: write` for future container publishing
- fix(v6): Dependabot npm dependency group batching — groups all updates under single PR batch

## [v1.8.4] - 2026-06-07

### Bug Fixes
- fix(publish): exclude .claude/ from npm pack — added to .gitignore and .npmignore

## [v1.8.2] - 2026-06-07

### Security
- fix(security): add svix webhook signature verification to Clerk plugin — prevents forged webhook requests
- fix(security): generate random 32-byte JWT secrets at install time via crypto.randomBytes — no more default secrets in generated projects
- fix(security): warn on weak/default JWT_SECRET at service startup
- fix(security): add ownership (IDOR) check plumbing across all 3 ORM templates — controller passes `req.user?.userId`, service/repository filter by it
- fix(security): escape user input in Mongoose $regex search — prevents ReDoS in generated projects
- fix(security): warn when CORS_ALLOWED_ORIGINS is empty in generated projects

## [v1.8.1] - 2026-06-07

### Features
- feat(cli): add `backgen health` command — system diagnostics (Node.js version, platform, BackGen version)

### Infrastructure
- feat(devops): AI Agent Team pipeline — 7-phase automated pipeline with 6 specialized agents (dev, tester, reviewer, security auditor, doc writer, release manager), user approval gate, shared knowledge base

### Documentation
- docs(readme): add `backgen health` command docs
