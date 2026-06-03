# Contributing to BackGen

## Local Pre-Commit Checklist

Run all four before every commit. CI runs the same gates, but catching failures locally saves a round-trip.

```bash
npm run lint       # ESLint — no warnings
npm run typecheck  # tsc --noEmit — zero errors
npm test           # vitest run — all green
npm run build      # tsc — must compile
```

## Manual Smoke Test (for CLI changes)

If you touched templates, commands, plugins, presets, or generators:

```bash
mkdir /tmp/backgen-smoke
cd /tmp/backgen-smoke
node /path/to/BackGen/dist/index.js init test-api --defaults --skip-install
node /path/to/BackGen/dist/index.js add jwt
node /path/to/BackGen/dist/index.js generate resource Patient --fields "name:string,email:string"
node /path/to/BackGen/dist/index.js sync
node /path/to/BackGen/dist/index.js doctor

cd test-api
npm install
npm run typecheck
npm run build
npm test
```

Server start (`npm run dev`) is optional but recommended for auth or middleware changes.

## Commit Format

Conventional Commits:

```
feat(plugins): add resend email plugin
fix(init): correct preset name resolution
chore(ci): add GitHub Actions release pipeline
docs(roadmap): update V4.5 status to in-progress
refactor(generator): split resource templates per ORM
test(plugins): add stripe webhook signature test
```

Scope = subsystem (`plugins`, `generator`, `cli`, `presets`, `templates`, `docs`, `ci`).

## Branch + PR Workflow

1. Branch from `master`: `git checkout -b feat/<short-name>`
2. Work + commit in small atomic pieces
3. Push branch: `git push -u origin feat/<short-name>`
4. Open PR targeting `master`
5. Wait for CI green (lint + typecheck + test + build on Node 20 + 22)
6. Self-review the diff
7. Squash-merge with conventional commit message

## Release Process

Only `master` is published. Cutting a release:

1. Update `version` in `package.json` (semver)
2. Update `CHANGELOG.md` if present
3. Commit: `chore(release): v1.x.x`
4. Push to `master`
5. Tag: `git tag v1.x.x && git push --tags`
6. GitHub Actions `Release` workflow runs:
   - Re-runs all CI gates
   - Verifies tag matches `package.json` version
   - Publishes to npm via OIDC trusted publishing with provenance

No NPM_TOKEN required. Publishing is gated on tag.

## First-Time Setup: OIDC Trusted Publishing

The release workflow uses npm OIDC trusted publishing. One-time manual step per npm package:

1. Log in to npmjs.com as the package owner
2. Go to **Package → Settings → Publishing access**
3. Add a trusted publisher:
   - Provider: **GitHub Actions**
   - Repository: `IbrahimKhaled19/BackGen`
   - Workflow filename: `release.yml`
   - Environment name: (leave blank)

After this, every `v*` tag push publishes without storing any token in GitHub secrets.

## Reporting Bugs

Open a GitHub issue with:
- BackGen version (`npx backgen --version` or check `package.json`)
- Node version (`node --version`)
- Operating system
- Full command + flags
- Expected vs actual output
- Minimal reproduction (preset + plugin set is enough)

## Suggesting Features

Open a GitHub issue with:
- Problem you're solving
- Proposed CLI surface (`backgen ...`)
- Sketch of generated code shape
- Why existing plugins/presets don't cover it
