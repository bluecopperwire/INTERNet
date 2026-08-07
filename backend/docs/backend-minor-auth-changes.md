# Backend V3 Authentication Changes

## 1. User and role alignment

The backend was updated from the old `User` model to the current `UserAccount` model.

Key changes:

| Previous | Current |
|---|---|
| `userId` | `userAccountId` |
| `role` | `userRole` |
| `employer` | `company` |
| no QC PESO role | `peso_personnel` |
| `inactive` | `suspended` |
| no soft-delete mapping | `deletedAt` |

Supported roles:

- `student`
- `company`
- `peso_personnel`
- `admin`

Supported statuses:

- `active`
- `suspended`
- `archived`

The old `src/users/user.entity.ts` was removed and replaced with `src/users/user-account.entity.ts`. Role-specific entities were also aligned for `Student`, `Company`, and `PesoPersonnel`.

---

## 2. Authentication restructuring

Authentication now uses:

- `UserAccount`
- `OAuthIdentity`
- `AuthSession`

Stale user fields such as `google_id`, `hashed_refresh_token`, `refresh_token_family`, and `AuthProvider` were removed from the old user model.

Students can now use both password login and Google login when both methods are linked.

---

## 3. Manual student signup

`POST /auth/signup` now creates the student account transactionally.

A successful signup creates:

- user account;
- student profile; and
- authentication session.

The signup request now includes credentials and the required basic student profile fields.

Academic information, internship preferences, and preferred industries remain outside the initial signup transaction.

---

## 4. Google authentication

Google authentication was revised so new Google users are not immediately stored as incomplete accounts.

### Existing student

A verified Google identity can authenticate an already linked student. A verified matching email may also be linked automatically when the existing account is an active student and no conflicting identity exists.

Linked students can continue using both local and Google login.

### New student

The flow is now:

```text
Google callback
→ pending-registration token
→ profile completion
→ POST /auth/google/complete-signup
→ account + student + Google identity created
```

The pending-registration token is valid for 10 minutes.

Google access and refresh tokens are not stored.

---

## 5. Refresh tokens and sessions

Refresh-token handling now uses `AuthSession`.

Current behavior:

- one active session per account;
- a new login replaces the previous active session;
- refresh tokens rotate;
- token-family reuse or mismatch revokes the affected session family;
- logout revokes the current session;
- logout-all is deferred.

Refresh JWTs are SHA-256 digested before bcrypt hashing.

HTTP-only refresh-token cookies remain supported.

---

## 6. JWT, account status, and `/auth/me`

Protected requests now check the current account state.

Suspended, archived, and soft-deleted accounts cannot authenticate or continue using protected routes.

Authorization uses the current roles:

- `student`
- `company`
- `peso_personnel`
- `admin`

`GET /auth/me` now returns current account information together with the matching basic role-specific profile.

Sensitive values such as password hashes, refresh-token hashes, token-family internals, and Google provider subjects are not returned.

---

## 7. Important authentication routes

```text
POST /auth/signup
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/google
GET  /auth/google/callback
POST /auth/google/complete-signup
GET  /auth/me
```

Notable contract changes:

- `/auth/signup` now requires credentials plus required student profile fields.
- `/auth/google/callback` may either authenticate an existing account or request profile completion.
- `/auth/google/complete-signup` was added for new Google students.
- `/auth/me` now includes role-specific profile data.

The detailed API contract is documented in `backend/docs/auth.md`.

---

## 8. Main backend files affected

### Authentication

```text
src/auth/auth.controller.ts
src/auth/auth.module.ts
src/auth/auth.service.ts
src/auth/password-hashing.ts
src/auth/dto/*
src/auth/entities/*
src/auth/guards/*
src/auth/strategies/*
```

### Users

```text
src/users/user-account.entity.ts
src/users/student.entity.ts
src/users/company.entity.ts
src/users/peso-personnel.entity.ts
src/users/users.controller.ts
src/users/users.module.ts
src/users/users.service.ts
```

Removed:

```text
src/users/user.entity.ts
```

---

## 9. Deferred backend features

The following are not part of the current V3 implementation:

- email verification;
- forgot-password/password-reset;
- logout-all;
- multiple simultaneous device sessions;
- company account-management endpoints;
- QC PESO account-management endpoints;
- archive/restore endpoints;
- Google authentication for non-student roles;
- live Google E2E testing with real credentials.
