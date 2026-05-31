# API Endpoint Contracts (Generated Projects)

**Created:** 2026-05-31

---

## Base URL

```
http://localhost:3000/api
```

---

## Authentication Endpoints

### POST /api/auth/register

Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (201):**
```json
{
  "status": 201,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "user",
      "createdAt": "2026-05-31T00:00:00.000Z"
    },
    "accessToken": "jwt...",
    "refreshToken": "jwt..."
  }
}
```

**Errors:**
- 400: Validation failed
- 409: Email already exists

---

### POST /api/auth/login

Authenticate user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "status": 200,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "user"
    },
    "accessToken": "jwt...",
    "refreshToken": "jwt..."
  }
}
```

**Errors:**
- 400: Validation failed
- 401: Invalid credentials

---

### POST /api/auth/refresh

Refresh access token.

**Request:**
```json
{
  "refreshToken": "jwt..."
}
```

**Response (200):**
```json
{
  "status": 200,
  "data": {
    "accessToken": "jwt..."
  }
}
```

**Errors:**
- 401: Invalid or expired refresh token

---

### POST /api/auth/logout

Invalidate refresh token.

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "refreshToken": "jwt..."
}
```

**Response (200):**
```json
{
  "status": 200,
  "message": "Logged out successfully"
}
```

---

## Resource Endpoints (Per Generated Resource)

Example for `Product` resource:

### POST /api/products

Create a product.

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "name": "Widget",
  "price": 29.99,
  "description": "A useful widget",
  "stock": 100
}
```

**Response (201):**
```json
{
  "status": 201,
  "data": {
    "id": "uuid",
    "name": "Widget",
    "price": 29.99,
    "description": "A useful widget",
    "stock": 100,
    "createdAt": "2026-05-31T00:00:00.000Z",
    "updatedAt": "2026-05-31T00:00:00.000Z"
  }
}
```

**Errors:**
- 400: Validation failed
- 401: Unauthorized

---

### GET /api/products

List products with pagination.

**Headers:** `Authorization: Bearer <accessToken>`

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 10 | Items per page |
| search | string | — | Search by name |

**Response (200):**
```json
{
  "status": 200,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

### GET /api/products/:id

Get single product.

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "status": 200,
  "data": {
    "id": "uuid",
    "name": "Widget",
    ...
  }
}
```

**Errors:**
- 404: Product not found

---

### PATCH /api/products/:id

Update product.

**Headers:** `Authorization: Bearer <accessToken>`

**Request:** (partial update)
```json
{
  "price": 39.99,
  "stock": 50
}
```

**Response (200):**
```json
{
  "status": 200,
  "data": {
    "id": "uuid",
    "name": "Widget",
    "price": 39.99,
    "stock": 50,
    ...
  }
}
```

**Errors:**
- 400: Validation failed
- 404: Product not found

---

### DELETE /api/products/:id

Delete product.

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "status": 200,
  "message": "Product deleted successfully"
}
```

**Errors:**
- 404: Product not found

---

## Admin Endpoints

### GET /api/admin/users

List all users (Admin only).

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "status": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "email": "admin@example.com",
        "role": "admin",
        "createdAt": "..."
      }
    ],
    "total": 5
  }
}
```

**Errors:**
- 401: Unauthorized
- 403: Forbidden (not admin)

---

## Error Response Format

All errors follow this format:

```json
{
  "status": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## Swagger Documentation

Available at: `http://localhost:3000/docs`

All endpoints documented with:
- Request/response schemas
- Authentication requirements
- Example values
- Error responses
