# Changelog

## [v1.11.0] - 2026-06-21

### Features
- feat(mcp): MCP server with 10 tools for AI-assisted project scaffolding — init_project, add_plugin, remove_plugin, generate_resource, generate_seed, generate_factory, doctor, list_plugins, list_presets, project_info
- feat(mcp): ai.json, llms.txt, server.json for AI discovery
- feat(v9): audit trail plugin + saas-enterprise preset (#66cb48a)
- feat(v9): roles & permissions plugin (#1e2e5dc)
- feat(v9): audit, permissions plugins + saas-enterprise preset (#e795139)
- feat(v8): schema command refactor + OpenAPI import (#d5bfc65)
- feat(v8): schema-first generation from backgen.yaml (#46e8817)
- feat(v7): interactive scaffold — plugin selection at init time (#76d8cb0)
- feat(v7): integrated plugin selection + install into backgen new (#761ae13)

### Bug Fixes
- fix(security): MCP runBackgen command injection — execSync replaced with spawnSync, eliminates shell injection vector
- fix(security): MCP tools unrestricted z.string() replaced with z.enum() + regex validation for all user inputs
- fix(security): hardcoded MCP server version 1.0.0 now reads from package.json
- fix(v9): stabilize e2e test cleanup with unique dirs per run (#a7e7e10)
- fix(v9): test stability, preset User model, re-read manifest after plugins (#f2d2ab8)
- fix(v9): add audit.middleware to templates, fix EBUSY on win32 (#a76754e)
- fix(docker): pin openssl/libcrypto3 to 3.5.7-r0 (#0168ce2, #0b6482d)
- fix: restore catch param in generate-schema broken by lint fix (#d1e7824)
- fix(v8): handle existing model from plugins, enable integration tests (#1a0304c)
- fix: JWT requires:prisma check respects ORM from manifest (#39de6a0)

### Refactoring
- refactor(v7): add.ts interactive mode uses selectPluginsInteractive + installBulk (#dd54dba)

### Documentation
- docs: add MIT License (#cb03bac)
- docs: add SECURITY.md with vulnerability reporting policy (#c5ffc36)
- docs: add community files — COC, issue templates, PR template (#a9b2038)
- docs(mcp): add MCP server config with 10-tool table to README
- docs(mcp): add JSDoc to all 12 exported MCP functions

### Chores
- chore: fix lint errors — empty catch, unused imports, let→const (#8cdfb5c)
- chore: ignore tmp-test directory, dismiss GHSA-92pp-h63x-v22m alert (#67f0239)

## [v1.10.1] - 2026-06-10

### Bug Fixes
- fix: JWT requires:prisma now respects ORM field — no explicit prisma plugin needed (#39de6a0)

## [v1.10.0] - 2026-06-10

### Features
- feat(v6): upgrade engine — sequential migration engine, backup system, rollback command, plugin versioned migrations, manifest ownership register
- feat(v6): security hardening — info leak fix (err.message → generic), permissive CORS fix (same-origin default), rate limiting on auth routes, JWT Prisma-only enforcement, Clerk static import

### Documentation
- docs: update README + ROADMAP for V6 upgrade engine

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
