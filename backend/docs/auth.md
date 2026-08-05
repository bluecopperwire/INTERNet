# Authentication Module Documentation (`auth.md`)

## Overview

The Authentication Module provides secure JWT-based authentication integrated with Passport.js for the INTERNet application. It supports user signup, password login, Google OAuth 2.0 sign-in/signup, HttpOnly cookie-based refresh token rotation with automatic token family revocation, session logout, profile retrieval, and role-based access control (RBAC).

---

## Technical Specifications & Security Measures

- **Password Security**: Passwords are standardly hashed using `bcrypt` (salt rounds: 10). Plaintext passwords are never logged or stored.
- **Token Strategy & HttpOnly Cookie Storage**:
  - **Access Token**: Short-lived stateless JWT (`15m` default), passed via `Authorization: Bearer <accessToken>`.
  - **Refresh Token**: Long-lived JWT (`7d` default), hashed with `bcrypt` before storage in PostgreSQL (`hashed_refresh_token` column). Returned to client exclusively via `Set-Cookie` header (`refresh_token` cookie) configured as `HttpOnly; Secure; SameSite=Strict/Lax; Path=/auth`.
- **Automatic Token Family Revocation (Reuse Detection)**:
  - Each login or signup generates a unique token family UUID (`refresh_token_family` column).
  - Upon calling `/auth/refresh`, if an old, invalidated, or replayed refresh token cookie is presented (detected via bcrypt hash mismatch), the system immediately revokes the entire token family (`hashed_refresh_token = null` & `refresh_token_family = null`), invalidating all active sessions.
- **Google OAuth 2.0 Integration**:
  - Authenticates via Google consent workflow (`/auth/google` and `/auth/google/callback`).
  - Google's OAuth tokens are ephemeral and used only during the Passport handshake. Upon profile verification, the backend issues its own JWT access token and HttpOnly refresh token cookie.
  - Accounts registered via Google (`authProvider = google`) are strictly blocked from using local password authentication (`POST /auth/login`).
- **Account Enums**:
  - **Roles**: `student`, `admin`, `employer` (Signup defaults to `student`).
  - **Account Status**: `active`, `inactive`, `archived` (Only `active` accounts can authenticate).
  - **Auth Provider**: `local`, `google`.
- **Rate Limiting**: `POST /auth/login` (5 req/min) and `POST /auth/signup` (3 req/min) are rate-limited via `@nestjs/throttler` to prevent brute-force attacks.

---

## Summary of Endpoints

| Method | Endpoint | Protection / Guards | Rate Limited | Description |
|---|---|---|---|---|
| `POST` | `/auth/signup` | None | Yes (3 req/min) | Registers a new student account and sets refresh token cookie. |
| `POST` | `/auth/login` | `LocalAuthGuard` | Yes (5 req/min) | Authenticates credentials, issues access token & sets refresh token cookie. |
| `POST` | `/auth/refresh` | `JwtRefreshAuthGuard` | No | Validates refresh token cookie & issues new rotated token & cookie. |
| `POST` | `/auth/logout` | `JwtAuthGuard` | No | Revokes active refresh token and clears cookie. |
| `GET` | `/auth/google` | `GoogleAuthGuard` | No | Redirects user to Google OAuth 2.0 consent page. |
| `GET` | `/auth/google/callback` | `GoogleAuthGuard` | No | Handles Google callback, logs in/registers user, & sets cookie. |
| `GET` | `/auth/me` | `JwtAuthGuard` | No | Returns profile of currently authenticated user. |

---

## Endpoint Details

### 1. User Signup

Registers a new user account with role `student` and status `active`. Returns an access token in the JSON body and sets the refresh token as an HttpOnly cookie.

- **Endpoint**: `POST /auth/signup`
- **Guards**: None
- **Rate Limit**: 3 requests per minute

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body (`SignupDto`)
| Parameter | Type | Required | Description | Validation |
|---|---|---|---|---|
| `email` | `string` | Yes | User account email address | Must be a valid email string |
| `password` | `string` | Yes | Plaintext user password | Minimum 6 characters |

```json
{
  "email": "newstudent@example.com",
  "password": "Password123!"
}
```

#### Responses

##### `201 Created` — Registration Successful
```http
HTTP/1.1 201 Created
Set-Cookie: refresh_token=eyJhbGciOiJIUzI1Ni...; Path=/auth; HttpOnly; Secure; SameSite=Strict
Content-Type: application/json

{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

##### `409 Conflict` — Email Already Registered
```json
{
  "statusCode": 409,
  "message": "Email already in use",
  "error": "Conflict"
}
```

---

### 2. User Login

Authenticates local user credentials, verifies active status, issues an access token in body and refresh token in HttpOnly cookie.

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
```http
HTTP/1.1 200 OK
Set-Cookie: refresh_token=eyJhbGciOiJIUzI1Ni...; Path=/auth; HttpOnly; Secure; SameSite=Strict
Content-Type: application/json

{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

##### `401 Unauthorized` — Invalid Credentials or Inactive Account / Google Account
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

### 3. Refresh Token Rotation & Family Revocation

Validates the `refresh_token` cookie. If valid, rotates tokens and sets a new cookie. If reuse of an invalidated/old token is detected, revokes all sessions.

- **Endpoint**: `POST /auth/refresh`
- **Guards**: `JwtRefreshAuthGuard` (Passport JWT Refresh — cookie extractor)

#### Request Headers / Cookie
```http
Cookie: refresh_token=eyJhbGciOiJIUzI1Ni...
```

#### Request Body
None required.

#### Responses

##### `200 OK` — Tokens Successfully Rotated
```http
HTTP/1.1 200 OK
Set-Cookie: refresh_token=eyJhbGciOiJIUzI1...; Path=/auth; HttpOnly; Secure; SameSite=Strict
Content-Type: application/json

{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

##### `401 Unauthorized` — Token Reuse Detected (All Sessions Revoked)
```json
{
  "statusCode": 401,
  "message": "Refresh token reuse detected. All sessions revoked.",
  "error": "Unauthorized"
}
```

---

### 4. User Logout

Invalidates user session by clearing `hashed_refresh_token` & `refresh_token_family` in PostgreSQL, and clearing the `refresh_token` cookie.

- **Endpoint**: `POST /auth/logout`
- **Guards**: `JwtAuthGuard` (Passport JWT)

#### Request Headers
```http
Authorization: Bearer <accessToken>
```

#### Responses

##### `200 OK` — Logged Out Successfully
```http
HTTP/1.1 200 OK
Set-Cookie: refresh_token=; Path=/auth; Max-Age=0; HttpOnly
Content-Type: application/json

{
  "message": "Successfully logged out"
}
```

---

### 5. Google OAuth 2.0 Sign-In / Signup

Initiates Google OAuth 2.0 authentication flow or handles the OAuth callback.

- **Endpoints**:
  - `GET /auth/google` (Redirects to Google consent)
  - `GET /auth/google/callback` (OAuth Callback)
- **Guards**: `GoogleAuthGuard` (Passport Google OAuth 2.0)

#### Responses (`GET /auth/google/callback`)

##### `200 OK` — Google Authentication Successful
```http
HTTP/1.1 200 OK
Set-Cookie: refresh_token=eyJhbGciOiJIUzI1Ni...; Path=/auth; HttpOnly; Secure; SameSite=Strict
Content-Type: application/json

{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 6. Current User Profile

Retrieves profile data of the currently authenticated user. Sensitive fields (`password`, `hashedRefreshToken`, `refreshTokenFamily`) are automatically omitted.

- **Endpoint**: `GET /auth/me`
- **Guards**: `JwtAuthGuard` (Passport JWT)

#### Request Headers
```http
Authorization: Bearer <accessToken>
```

#### Responses

##### `200 OK` — Profile Returned
```json
{
  "userId": 1,
  "email": "student@example.com",
  "role": "student",
  "accountStatus": "active",
  "authProvider": "local",
  "googleId": null,
  "createdAt": "2026-07-22T02:37:00.000Z",
  "updatedAt": "2026-07-22T02:37:00.000Z"
}
```

---

## Authorization & Role Guards Infrastructure

Future backend modules can restrict route access using `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(...)`.

### Example Usage in Controllers

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('reports')
export class ReportsController {
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin-summary')
  getAdminSummary() {
    return { data: 'Confidential summary data' };
  }
}
```
