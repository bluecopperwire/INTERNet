# Authentication and registration contract

This backend uses PostgreSQL `user_account`, optional local credentials, optional Google identities (students only), and one `authentication_session` per browser/device. Passwords and refresh tokens are bcrypt-hashed in their dedicated tables. Google tokens are used only during the callback and are never stored.

## Roles and creation

| Role           | Public local signup | Google signup | Creation                                 |
| -------------- | ------------------: | ------------: | ---------------------------------------- |
| student        |                 yes |           yes | complete self-registration               |
| peso_personnel |                  no |            no | active admin creates account and profile |
| company        |                  no |            no | active admin creates account and profile |
| admin          |                  no |            no | explicit `npm run bootstrap:admin`       |

`POST /auth/signup` is the compatibility route for complete manual student registration; it no longer accepts an account-only payload. All required student profile fields are committed atomically with the account, credential, and first session. QC PESO personnel accounts are provisioned directly by an active admin (`POST /users/peso-personnel`), committing a complete profile with active status.

## Cookies and tokens

- Access JWT: response JSON; send as `Authorization: Bearer ...`.
- `refresh_token`: HTTP-only, path `/auth`; contains `sub`, `family`, `jti`, and type `refresh`.
- `google_oauth_state`: HTTP-only, 10 minutes, exact callback-state match.
- `google_onboarding`: HTTP-only, 30 minutes; the database stores only its bcrypt hash.
- `google_login_result`: HTTP-only, two minutes; exchanged once after the callback so an access token is not placed in a redirect URL.

Every access-token request reloads the account from PostgreSQL. Suspended, archived, soft-deleted, or missing accounts are rejected. Refresh rotation changes only the addressed family. Reuse of an older token revokes that family only. Logout revokes the current family; logout-all revokes all families. Suspension/archive also revokes every family; restoration does not revive one.

JWT and Google secrets have no code fallback. Missing JWT secrets fail authentication startup. Missing Google configuration leaves startup available but Google endpoints return a clear 503.

## API contract

| Method and path                                    | Authorization                   | Request / result                                                                                                              |
| -------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/signup`                                | public                          | Email, password, and complete student fields; returns access token and refresh cookie.                                        |
| `POST /users/peso-personnel`                       | active admin                    | Credentials and complete PESO personnel fields; creates active personnel account.                                             |
| `POST /auth/login`                                 | public/local                    | Email/password; local credential may coexist with Google.                                                                     |
| `POST /auth/refresh`                               | refresh cookie                  | Rotates the same family; reuse revokes only that family.                                                                      |
| `POST /auth/logout`                                | access token                    | Revokes current family and clears cookie.                                                                                     |
| `POST /auth/logout-all`                            | access token                    | Revokes all account families.                                                                                                 |
| `GET /auth/me`                                     | access token                    | Safe account fields and profile metadata.                                                                                     |
| `GET /auth/google`                                 | public                          | Google login redirect. Unknown identity produces `account-not-found`.                                                         |
| `GET /auth/google/signup`                          | public                          | Explicit Google signup redirect. Existing identity produces `account-already-exists`; matching email requires explicit link.  |
| `GET /auth/google/callback`                        | state cookie                    | Exchanges OAuth code and redirects according to signed intent.                                                                |
| `POST /auth/google/exchange`                       | one-time result cookie          | Returns access token after a successful Google login redirect.                                                                |
| `POST /auth/google/signup/complete`                | onboarding cookie               | Complete student fields; atomically creates account, identity, profile, session, and consumes onboarding.                     |
| `POST /auth/google/link`                           | active student + local password | Returns Google authorization URL after local re-authentication.                                                               |
| `DELETE /auth/google/link`                         | active student                  | Requires a remaining local credential.                                                                                        |
| `POST /auth/password`                              | access token                    | Adds local password to a Google-only student.                                                                                 |
| `PATCH /auth/password`                             | access token                    | Current and replacement password.                                                                                             |
| `DELETE /auth/password`                            | access token                    | Requires a remaining Google identity.                                                                                         |
| `POST /users/companies`                            | active admin                    | Complete company, local credential, and non-custom industry.                                                                  |

The frontend must keep multi-step registration state in memory and must never put plaintext passwords in local/session storage. Google signup redirects to `/register/student/profile?source=google`; login redirects to `/auth/callback?status=success`, then calls `/auth/google/exchange`; linking redirects to `/settings/security?google=linked`.

Typical errors are `409 Email already in use`, `404 account-not-found`, `409 account-already-exists`, `409 matching-email-account-requires-explicit-linking`, `401 Account is not active`, `401 Refresh token reuse detected`, and `403` for role/state violations.

## QC PESO access

QC PESO personnel accounts are provisioned by an active admin and are directly active. Account access is managed through the normal account-status controls; the retired verification workflow, employee-ID upload, and verification-history endpoints do not exist.

- `npm run bootstrap:admin`: requires `BOOTSTRAP_ADMIN_EMAIL` and a 12+ character `BOOTSTRAP_ADMIN_PASSWORD`.
- `npm run seed:reference`: transactionally inserts or safely corrects the eight
  approved industries. It reports each value as inserted, already existing, or
  safely corrected and leaves unrelated industries untouched.
- `npm run seed:dev`: deterministic local fixtures. It is prohibited in
  production and requires both `ALLOW_DEV_SEED=true` and a non-secret
  `DEV_SEED_PASSWORD` containing at least eight characters, a letter, and a
  number. It creates the local/Google/dual student matrix, companies, QC PESO
  personnel accounts, opportunities, workflow histories, referrals,
  interviews, assignments, derived attendance, and feedback. It creates no
  sessions or onboarding rows and is safe to run repeatedly.
- `npm run database:validate-seeds`: validates the reference values, account and
  provider matrix, profile completeness, workflow coverage, derived attendance,
  and fixture row counts against the configured disposable database.
- Integration tests own disposable fixtures. Ordinary backend startup performs no seeding.

All development file keys begin with `dev-seed/`; they are opaque fake paths and
do not imply that a real file exists. Never point seed commands at production or
an active development database.

Email verification and password reset are intentionally deferred. Company self-registration/verification, forced password changes, and Google authentication for company/QC PESO/admin are not implemented.
