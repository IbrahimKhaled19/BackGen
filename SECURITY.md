# Security Policy

## Supported Versions

BackGen is a CLI scaffolding tool. Only the latest major.minor line receives security patches.

| Version | Supported          |
| ------- | ------------------ |
| 1.11.x  | :white_check_mark: |
| 1.10.x  | :white_check_mark: |
| 1.9.x   | :white_check_mark: |
| < 1.9   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in BackGen (not in generated projects — those are templates, not BackGen itself):

1. **Do not open a public GitHub issue.**
2. Email: ibrahimaboaly@gmail.com
3. Include:
   - Affected version (`npm list @ibrahimkhaled19/backgen`)
   - Steps to reproduce
   - Potential impact
   - Suggested fix (optional)

### Response timeline

- **24 hours:** Acknowledgment of receipt
- **7 days:** Initial triage and severity assessment
- **30 days:** Fix released or mitigation guidance published

### Scope

- **In scope:** BackGen CLI (`backgen` commands), core templates, installed plugins
- **Out of scope:** User-generated project code (scaffolded apps are the user's responsibility), third-party dependencies (report to upstream), npm registry infrastructure

### Policy

- Vulnerabilities are fixed in a patch release before public disclosure
- Critical fixes are backported to the last two supported minor versions
- Contributors who report valid vulnerabilities are credited in release notes (opt-out available)

## Deployment Security Checklist

BackGen generates backend project scaffolding. Security of the *deployed application* is the user's responsibility. Key areas to review before production:

### Environment & Secrets

- Use a secret manager (AWS Secrets Manager, Doppler, Infisical) — not `.env` files in production
- Rotate JWT secrets, API keys, and DB credentials on a schedule
- Never commit `.env` files to version control (BackGen .gitignore blocks them by default)

### Database

- Use connection pooling (PgBouncer for Postgres, Prisma Accelerate)
- Enable TLS for all database connections
- Apply migrations in CI/CD, not on server startup
- Set `connection_limit` on Prisma pool to avoid connection exhaustion

### Middleware

BackGen scaffolds security middleware — verify they're active:

- **Helmet** — HTTP headers (CSP, HSTS, X-Frame-Options)
- **CORS** — restrict origin in production, don't use `Access-Control-Allow-Origin: *`
- **Rate limiting** — enable per-IP or per-user limits
- **Request validation** — Zod schemas on all public endpoints
- **Sanitization** — strip dangerous input (HTML, SQL fragments)

### Auth

- Enforce HTTPS-only cookies (`secure: true`, `sameSite: 'strict'`)
- Set short JWT expiry (15-30 min access tokens) with refresh token rotation
- Use Clerk or similar for production auth — avoid rolling custom auth unless necessary

### CI/CD Pipeline

- Run `npm audit` in CI — fail on critical vulnerabilities
- Use `--ignore-scripts` when installing deps in build stages (optional but recommended)
- Sign git tags for releases
- Pin Node.js version in Dockerfile and CI

We aim to respond, fix, and disclose responsibly. Thank you for helping keep BackGen secure.
