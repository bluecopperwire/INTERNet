# Authentication Module Documentation (`auth.md`)

## Overview

The Authentication Module provides secure, stateless JWT-based authentication integrated with Passport.js for the INTERNet application. It supports user login, refresh token rotation, session logout, profile retrieval, and role-based access control (RBAC).

---

## Technical Specifications & Security Measures

- **Password Security**: Passwords are standardly hashed using `bcrypt` (salt rounds: 10). Plaintext passwords are never logged or stored.
- **Token Strategy**:
  - **Access Token**: Short-lived stateless JWT (`15m` default), passed via `Authorization: Bearer <accessToken>`.
  - **Refresh Token**: Long-lived JWT (`7d` default), hashed with `bcrypt` before storage in PostgreSQL (`hashed_refresh_token` column).
  - **Refresh Token Rotation**: Each call to `/auth/refresh` revokes the old refresh token and issues a new pair.
- **Account Enums**:
  - **Roles**: `student`, `admin`, `employer`
  - **Account Status**: `active`, `inactive`, `archived` (Only `active` accounts can authenticate).
- **Rate Limiting**: `POST /auth/login` is rate-limited via `@nestjs/throttler` (max 5 requests per 60 seconds) to prevent brute-force attacks.

---

## Summary of Endpoints

| Method | Endpoint | Protection / Guards | Rate Limited | Description |
|---|---|---|---|---|
| `POST` | `/auth/login` | `LocalAuthGuard` | Yes (5 req/min) | Authenticates credentials and returns token pair. |
| `POST` | `/auth/refresh` | `JwtRefreshAuthGuard` | No | Validates refresh token & issues new rotated token pair. |
| `POST` | `/auth/logout` | `JwtAuthGuard` | No | Revokes active refresh token for authenticated user. |
| `GET` | `/auth/me` | `JwtAuthGuard` | No | Returns profile of currently authenticated user. |

---

## Endpoint Details

### 1. User Login

Authenticates user credentials, verifies active account status, generates access & refresh tokens, hashes the refresh token, and stores it in PostgreSQL.

- **Endpoint**: `POST /auth/login`
- **Guards**: `LocalAuthGuard` (Passport Local)
- **Rate Limit**: 5 requests per minute

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body (`LoginDto`)
| Parameter | Type | Required | Description | Validation |
|---|---|---|---|---|
| `email` | `string` | Yes | User account email address | Must be a valid email string |
| `password` | `string` | Yes | Plaintext user password | Minimum 6 characters |

```json
{
  "email": "student@example.com",
  "password": "Password123!"
}
```

#### Responses

##### `200 OK` — Authentication Successful
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoic3R1ZGVudEBleGFtcGxlLmNvbSIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzUzMTYwMDAwLCJleHAiOjE3NTMxNjA5MDB9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoic3R1ZGVudEBleGFtcGxlLmNvbSIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzUzMTYwMDAwLCJleHAiOjE3NTM3NjQ4MDB9..."
}
```

##### `401 Unauthorized` — Invalid Credentials or Inactive Account
```json
{
  "statusCode": 401,
  "message": "Invalid credentials or account is inactive/archived",
  "error": "Unauthorized"
}
```

##### `429 Too Many Requests` — Rate Limit Exceeded
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

---

### 2. Refresh Token Rotation

Validates an existing refresh token, verifies the hashed token match in PostgreSQL, issues a new token pair, and replaces the stored hash.

- **Endpoint**: `POST /auth/refresh`
- **Guards**: `JwtRefreshAuthGuard` (Passport JWT Refresh)

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body (`RefreshTokenDto`)
| Parameter | Type | Required | Description |
|---|---|---|---|
| `refreshToken` | `string` | Yes | Active refresh token issued during login or last refresh |

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Responses

##### `200 OK` — Tokens Successfully Rotated
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

##### `401 Unauthorized` — Invalid or Revoked Refresh Token
```json
{
  "statusCode": 401,
  "message": "Access Denied",
  "error": "Unauthorized"
}
```

---

### 3. User Logout

Invalidates the user's active session by nullifying `hashedRefreshToken` in PostgreSQL.

- **Endpoint**: `POST /auth/logout`
- **Guards**: `JwtAuthGuard` (Passport JWT)

#### Request Headers
```http
Authorization: Bearer <accessToken>
```

#### Request Body
None required.

#### Responses

##### `200 OK` — Logged Out Successfully
```json
{
  "message": "Successfully logged out"
}
```

##### `401 Unauthorized` — Missing or Expired Access Token
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

### 4. Current User Profile

Retrieves profile data of the currently authenticated user. Sensitive fields (`password`, `hashedRefreshToken`) are automatically omitted.

- **Endpoint**: `GET /auth/me`
- **Guards**: `JwtAuthGuard` (Passport JWT)

#### Request Headers
```http
Authorization: Bearer <accessToken>
```

#### Request Body
None.

#### Responses

##### `200 OK` — Profile Returned
```json
{
  "userId": 1,
  "email": "student@example.com",
  "role": "student",
  "accountStatus": "active",
  "createdAt": "2026-07-22T02:37:00.000Z",
  "updatedAt": "2026-07-22T02:37:00.000Z"
}
```

##### `401 Unauthorized` — Missing or Invalid Access Token
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## Authorization & Role Guards Infrastructure

Future backend modules can restrict route access using `@UseGuards(JwtAuthGuard, RolesGuard)` and the `@Roles(...)` metadata decorator.

### Example Usage in Controllers

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('reports')
export class ReportsController {
  
  // Accessible only by users with 'admin' role
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin-summary')
  getAdminSummary() {
    return { data: 'Confidential summary data' };
  }

  // Accessible by both 'admin' and 'employer' roles
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EMPLOYER)
  @Get('company-reports')
  getCompanyReports() {
    return { data: 'Employer report data' };
  }
}
```

#### Expected Error for Unauthorized Roles

##### `403 Forbidden` — Insufficient Permissions
```json
{
  "statusCode": 403,
  "message": "Access denied: Insufficient permissions",
  "error": "Forbidden"
}
```
