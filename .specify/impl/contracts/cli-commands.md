# CLI Command Contracts

**Created:** 2026-05-31

---

## Command Structure

```
BackGen <command> [arguments] [options]
```

---

## Commands

### init

Generate a new backend project.

```bash
BackGen init [project-name]
```

**Arguments:**
| Arg | Required | Description |
|-----|----------|-------------|
| project-name | No | Project directory name (prompted if omitted) |

**Interactive Prompts:**
1. Project name (if not in args)
2. Backend framework: Express (MVP: only Express enabled)
3. Database: PostgreSQL (MVP: only PostgreSQL enabled)
4. ORM: Prisma (MVP: only Prisma enabled)
5. Authentication: JWT (MVP: only JWT enabled)
6. Enable RBAC: Yes/No
7. Generate Docker: Yes/No

**Behavior:**
- Abort if target directory not empty
- Generate complete project structure
- Run npm install
- Show success message with next steps

**Exit Codes:**
| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Directory not empty |
| 2 | Generation failed (checkpoint saved) |
| 3 | Prerequisites missing |

---

### generate resource

Generate a CRUD resource module.

```bash
BackGen generate resource <name> [fields...]
BackGen g resource <name> [fields...]
```

**Arguments:**
| Arg | Required | Description |
|-----|----------|-------------|
| name | Yes | Resource name (singular, PascalCase) |
| fields | No | Field definitions (prompted if omitted) |

**Field Format:** `fieldName:type` where type is one of: `string`, `number`, `boolean`, `date`

**Example:**
```bash
BackGen generate resource Product name:string price:number stock:number
```

**Interactive Prompts (if fields omitted):**
1. Enter fields (name:type format, empty line to finish)

**Behavior:**
- Abort if resource already exists
- Generate controller, service, repository, validation, types, routes, tests
- Add Prisma model to schema
- Run prisma db push
- Register routes in app.ts

**Exit Codes:**
| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Resource already exists |
| 2 | Invalid field type |

---

### add

Add a feature to existing project.

```bash
BackGen add <feature>
```

**Arguments:**
| Arg | Required | Description |
|-----|----------|-------------|
| feature | Yes | Feature name (auth, payment, storage, notification) |

**Available Features (MVP):**
- `auth` — JWT authentication (if not already present)

**Exit Codes:**
| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Feature not found |
| 2 | Feature already installed |

---

### doctor

Check project health.

```bash
BackGen doctor
```

**Checks:**
1. Node.js version (>= 18)
2. npm availability
3. .env file exists with required variables
4. DATABASE_URL is valid
5. Prisma schema exists and is valid
6. Dependencies installed
7. Database connection test

**Output:**
```
✓ Node.js 18.17.0
✓ npm 9.6.7
✓ .env file exists
✓ DATABASE_URL configured
✓ Prisma schema valid
✓ Dependencies installed
✗ Database connection failed

1 issue found. Run `BackGen doctor --fix` for suggestions.
```

**Exit Codes:**
| Code | Meaning |
|------|---------|
| 0 | All checks pass |
| 1 | One or more checks failed |

---

## Global Options

| Option | Description |
|--------|-------------|
| --help | Show help for command |
| --version | Show CLI version |
| --verbose | Enable verbose logging |
| --no-color | Disable colored output |
