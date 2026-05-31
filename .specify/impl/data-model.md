# Data Model: BackGen Generated Projects

**Created:** 2026-05-31

---

## Core Entities

### User

Authentication and authorization entity.

| Field | Type | Constraints |
|-------|------|-------------|
| id | String (UUID) | Primary key, auto-generated |
| email | String | Unique, required |
| password | String | Required, bcrypt hashed |
| role | Enum (admin, user) | Default: 'user' |
| createdAt | DateTime | Auto-generated |
| updatedAt | DateTime | Auto-updated |

**Relations:**
- Has many RefreshTokens

**Validation (Zod):**
- email: valid email format
- password: min 8 chars, 1 uppercase, 1 lowercase, 1 number

---

### RefreshToken

JWT refresh token management.

| Field | Type | Constraints |
|-------|------|-------------|
| id | String (UUID) | Primary key, auto-generated |
| token | String | Unique, required |
| userId | String | Foreign key → User |
| expiresAt | DateTime | Required |
| createdAt | DateTime | Auto-generated |

**Relations:**
- Belongs to User

---

## Resource Entities (Generated Per Resource)

Each resource generated via `BackGen generate resource` follows this pattern:

### Example: Product

| Field | Type | Prisma Type | Zod Type |
|-------|------|-------------|----------|
| id | String (UUID) | String @id @default(uuid()) | — |
| name | string | String | z.string() |
| price | number | Float | z.number().positive() |
| description | string | String | z.string() |
| stock | number | Int | z.int().nonnegative() |
| createdAt | DateTime | DateTime @default(now()) | — |
| updatedAt | DateTime | DateTime @updatedAt | — |

**Field Type Mapping (MVP):**

| User Input | Prisma Type | Zod Type | TypeScript Type |
|------------|-------------|----------|-----------------|
| string | String | z.string() | string |
| number | Float | z.number() | number |
| boolean | Boolean | z.boolean() | boolean |
| date | DateTime | z.coerce.date() | Date |

---

## Prisma Schema Template

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String         @id @default(uuid())
  email        String         @unique
  password     String
  role         Role           @default(USER)
  refreshTokens RefreshToken[]
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}

enum Role {
  ADMIN
  USER
}
```

---

## Entity Relationships

```
User (1) ──── (N) RefreshToken
```

Resource entities are standalone (no relations in MVP). Relations deferred to post-MVP.

---

## State Transitions

### User

```
Register → Active
Login → Active (issue tokens)
Logout → Active (invalidate refresh token)
```

### RefreshToken

```
Created → Active
Used → Active (rotation: new token issued, old invalidated)
Expired → Invalid
Logout → Invalidated
```

---

## Data Volume Assumptions

- Users: < 10,000 per project (typical SaaS MVP)
- Resources: < 100,000 records per resource (typical CRUD)
- RefreshTokens: < 10 per user (concurrent sessions)
- No sharding or partitioning needed for MVP
