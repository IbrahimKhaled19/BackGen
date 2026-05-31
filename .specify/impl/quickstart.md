# Quickstart: BackGen

**Created:** 2026-05-31

---

## Prerequisites

- Node.js 18+ installed
- npm installed
- PostgreSQL running (local or remote)

---

## Install BackGen

```bash
npm install -g backgen
```

---

## Generate a Project

```bash
BackGen init my-api
```

Follow the interactive prompts:

```
? Project name: my-api
? Backend framework: Express
? Database: PostgreSQL
? ORM: Prisma
? Authentication: JWT
? Enable RBAC? Yes
? Generate Docker? Yes
```

BackGen generates the project and installs dependencies.

---

## Configure Environment

```bash
cd my-api
cp .env.example .env
```

Edit `.env` with your database URL:

```
DATABASE_URL="postgresql://user:password@localhost:5432/my-api"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
```

---

## Run Database Migrations

```bash
npx prisma db push
```

---

## Start the Server

```bash
npm run dev
```

Server starts at `http://localhost:3000`.

Swagger docs at `http://localhost:3000/docs`.

---

## Test Authentication

Register a user:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123"}'
```

Login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123"}'
```

---

## Add a Resource

```bash
BackGen generate resource Product name:string price:number stock:number
```

This generates:
- CRUD endpoints at `/api/products`
- Prisma model
- Validation schemas
- Tests
- Swagger documentation

---

## Run Tests

```bash
npm test
```

---

## Docker (Optional)

```bash
docker-compose up
```

Starts app + PostgreSQL in containers.

---

## Project Health Check

```bash
BackGen doctor
```

---

## Next Steps

- Add more resources: `BackGen generate resource Order ...`
- Customize generated code (it's yours!)
- Deploy to production
