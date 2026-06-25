# Changelog

## [v1.14.0] - 2026-06-26

### Features
- feat(cli): `backgen generate route [name]` — scaffold custom route modules (controller + service + validation + routes + types) with full Swagger annotations, auto-registered in app.ts. Use for endpoints that don't need a new DB table: dashboards, external API proxies, search, file uploads
- feat(cli): `backgen rotate-secrets` — generate cryptographically secure 256-bit JWT secrets with .env backup
- feat(deploy): Caddyfile + docker-compose.prod.yml templates — auto-HTTPS via Let's Encrypt, rate limiting, security headers, TLS 1.2-1.3 only
- feat(deploy): pino structured logging — replaces winston, JSON output in production with pino-pretty in dev

### Bug Fixes
- fix(code-quality): remove all `any` types from shipped audit/permission/role service templates (#4 critical violations fixed)
- fix(cli): replace `createRequire` with native ESM `readFileSync` + `fileURLToPath` in MCP entry point
- fix(sync): correct middleware subdirectory paths — ratelimit (`security/`), hardening (`observability/`), sanitize (`security/`) — fixes false reinstall on every sync
- fix(cli): idempotent `replace` mutation — skips if content already exists in file, prevents duplicate imports on re-sync
- fix(lint): add `globals.node` + `.claude/` ignore to ESLint flat config — eliminates 366 false-positive `no-undef` errors
- fix(security): algorithm pinning to `HS256` in all JWT verify calls — prevents algorithm confusion attack
- fix(security): prototype pollution prevention — `DENY_KEYS` Set blocking `__proto__`, `constructor`, `prototype`
- fix(security): RBAC `userId` property access — was checking `user.id` instead of `user.userId`, authorization completely broken
- fix(security): tenant hopping prevention — membership verification on `x-org-id` header
- fix(security): role routes now require `authMiddleware` + `requireRole("ADMIN")` — was unauthenticated
- fix(security): S3 path traversal + IDOR — keys scoped to `userId/UUID-filename`, ownership validation on get/delete
- fix(templates): Zod validation `body:` wrapper removed from auth/jwt/resource/stripe schemas — was wrapping fields under `body:{}` but validate middleware passes `req.body` directly, breaking every request
- fix(templates): pino `logger.error()` argument order — was `("msg", err)`, pino requires `(err, "msg")`
- fix(templates): rate-limit import name mismatch — plugin injected `import { rateLimit }` but template exported `rateLimitMw`
- fix(plugins): JWT refresh TTL >90d startup warning

### Chores
- chore: README template improved with full env vars table, API endpoint list, security checklist, project tree
- chore: `.claude/` excluded from lint + ESLint config cleanup

### Chores
- chore: enrich all 10 MCP tool descriptions and success responses for Glama scoring — improves TDQS from B to A (#ef83c46)
- chore: add glama.json for server ownership verification (#9ad8148)

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
