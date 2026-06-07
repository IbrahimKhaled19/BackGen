# Changelog

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
