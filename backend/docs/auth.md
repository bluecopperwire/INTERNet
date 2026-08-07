# Authentication API (Database V3)

The authentication module uses `user_account` for account identity,
`oauth_identity` for Google linkage, and `auth_session` for hashed refresh-token
state. PostgreSQL permits one non-revoked session per account. Google provider
access and refresh tokens are never stored.

## Account values

- Roles: `student`, `company`, `peso_personnel`, `admin`
- Statuses: `active`, `suspended`, `archived`
- Only active accounts authenticate.
- A student may use a local password, Google, or both. Other roles require a
  password and cannot link Google in V3.

## Routes

### `POST /auth/signup`

Creates an active student account and required student profile in one
transaction, establishes the single active session, returns
`{ accessToken, refreshToken }`, and sets the refresh token in an HTTP-only
cookie scoped to `/auth`.

Required account fields are `email` and `password`. Required profile fields are
`firstName`, `lastName`, `sex`, `birthDate`, `contactNumber`, `addressLine`,
`addressBarangay`, `addressDistrict`, `addressCity`, and `inquiryMethod`.
`contactEmail` is optional and defaults to the normalized account email.

### `POST /auth/login`

Preserves the existing email/password contract and token response. A successful
login revokes the prior active session and creates its replacement. A
Google-only student receives the same generic invalid-credentials response as
any other invalid local login.

### `POST /auth/refresh`

Accepts the refresh token from the `refreshToken` body field or HTTP-only
cookie. Rotation preserves the token family while replacing the stored bcrypt
hash. A mismatch or reused token revokes the active family and returns `401`.

### `POST /auth/logout`

Requires an access token, revokes the current active session, clears the
refresh cookie, and returns `{ "message": "Successfully logged out" }`.

### `GET /auth/me`

Returns `userAccountId`, `email`, `userRole`, `accountStatus`, and a small
role-specific `profile`. Student profiles include identifiers and basic names;
company profiles include identifier/name/logo; PESO profiles include identifier,
employee ID, and basic names; admin profiles are `null`. No auth secret is
returned.

### `GET /auth/google` and `GET /auth/google/callback`

Google callback profiles must explicitly report a verified email. Existing
links resolve by Google subject. A verified email may auto-link only to an
active student without a conflicting Google identity, preserving any password.

For a brand-new email, the callback creates no database row and returns:

```json
{
  "requiresProfileCompletion": true,
  "pendingRegistrationToken": "signed-short-lived-jwt",
  "email": "verified@example.com"
}
```

### `POST /auth/google/complete-signup`

Accepts `pendingRegistrationToken` plus the required student profile fields.
The verified email and Google subject come only from the signed token. The
endpoint creates `user_account`, `student`, and `oauth_identity` atomically with
`password_hash = null`, then establishes the normal session.

## JWT and cookie configuration

Access-token claims remain `sub`, `email`, and `role` (with internal family/JTI
claims used for session rotation). Relevant environment variables are:

- `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES`
- `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- `GOOGLE_PENDING_REGISTRATION_SECRET`, `GOOGLE_PENDING_REGISTRATION_EXPIRES`
- `COOKIE_DOMAIN`, `COOKIE_SAMESITE`

TypeORM `synchronize` remains disabled. Apply schema changes with migrations.
