# Project Name

**BackGen**

**Tagline:**

> Generate production-ready backend code in minutes, not days.

---

# Vision

BackGen is a CLI-first developer tool that generates clean, production-ready backend projects based on user-selected technologies and features.

Unlike AI code generators that produce inconsistent code, BackGen uses a deterministic template-based architecture to generate maintainable code that developers fully own and understand.

The generated code must be:

* Readable
* Extensible
* Production-ready
* Framework-compliant
* Fully owned by the developer

BackGen should never generate "AI spaghetti code."

---

# Core Philosophy

BackGen is NOT:

* A low-code platform
* A no-code platform
* A runtime framework
* A backend-as-a-service

BackGen IS:

* A code generator
* A project scaffolder
* A productivity accelerator

After generation:

* No BackGen dependency remains
* Developers can modify everything
* Generated code is theirs forever

---

# MVP Scope

Initial supported stack:

## Framework

* Express.js

## Language

* TypeScript

## Database

* PostgreSQL

## ORM

* Prisma

## Authentication

* JWT Authentication
* Refresh Tokens

## Authorization

* RBAC

Roles:

* Admin
* User

## Documentation

* Swagger/OpenAPI

## Validation

* Zod

## Testing

* Vitest

## Deployment

* Docker

---

# CLI Commands

## Initialize Project

```bash
BackGen init
```

Interactive project generation wizard.

---

## Generate Resource

```bash
BackGen generate resource User
```

or

```bash
BackGen g resource User
```

Generates:

```text
src/modules/user/
├── user.controller.ts
├── user.service.ts
├── user.routes.ts
├── user.validation.ts
├── user.types.ts
└── user.test.ts
```

---

## Add Feature

```bash
BackGen add auth
BackGen add payment
BackGen add storage
```

Installs new modules into existing project.

---

## Doctor

```bash
BackGen doctor
```

Checks:

* Missing environment variables
* Prisma state
* Dependency issues
* Configuration issues

---

## Upgrade

```bash
BackGen upgrade
```

Updates project templates safely.

---

# User Flow

## Step 1

```bash
BackGen init
```

---

## Step 2

Wizard appears

```text
Project Name?
```

---

```text
Backend Framework?

◉ Express
○ Fastify
○ NestJS
```

Only Express enabled in MVP.

---

```text
Database?

◉ PostgreSQL
```

---

```text
ORM?

◉ Prisma
```

---

```text
Authentication?

◉ JWT
```

---

```text
Enable RBAC?

◉ Yes
○ No
```

---

```text
Generate Docker?

◉ Yes
○ No
```

---

## Step 3

BackGen generates:

```text
my-api/
```

Structure:

```text
src/
├── app.ts
├── server.ts

├── config/
├── middleware/
├── modules/
├── services/
├── utils/
├── types/

prisma/
tests/

Dockerfile
docker-compose.yml

.env.example

README.md
```

---

# Resource Generator

Example:

```bash
BackGen generate resource Product
```

Questions:

```text
Fields?
```

```text
name:string
price:number
description:string
stock:number
```

Generated:

Prisma model

```prisma
model Product {
  id String @id @default(uuid())
  name String
  price Float
  description String
  stock Int
}
```

---

Controller

```ts
createProduct()
getProducts()
getProduct()
updateProduct()
deleteProduct()
```

---

Routes

```ts
POST   /products
GET    /products
GET    /products/:id
PATCH  /products/:id
DELETE /products/:id
```

---

Validation

Zod schema.

---

Swagger documentation.

---

Tests.

---

# Architecture

BackGen must use:

## Layered Architecture

```text
Controller
↓
Service
↓
Repository
↓
Database
```

Never allow:

```text
Controller
↓
Database
```

---

# Internal CLI Architecture

```text
BackGen/
```

```text
src/
├── commands/
├── generators/
├── templates/
├── prompts/
├── utils/
├── config/
└── core/
```

---

# Template System

All code generation must come from templates.

Never generate source code dynamically with AI.

Example:

```text
templates/

express/

auth/
jwt/

resource/

swagger/

docker/
```

---

Handlebars placeholders:

```handlebars
{{ResourceName}}
{{resourceName}}
{{resourcePlural}}
```

Example output:

```ts
export class ProductService {}
```

---

# Future Roadmap

## Phase 2

Authentication Providers

```text
JWT
Clerk
Supabase Auth
Auth.js
```

---

## Phase 3

Databases

```text
MySQL
MongoDB
SQLite
```

---

## Phase 4

ORMs

```text
Prisma
Drizzle
Mongoose
```

---

## Phase 5

Frameworks

```text
Express
Fastify
NestJS
```

---

## Phase 6

Storage

```text
Cloudinary
AWS S3
Supabase Storage
```

---

## Phase 7

Payments

```text
Stripe
PayPal
```

---

## Phase 8

Notifications

```text
Email
SMS
Push Notifications
```