> **Historical design note — not current implementation guidance.** The repository now uses the approved database redesign: QC PESO accounts are admin-provisioned and directly active, with no public registration, approval gate, employee-ID upload, or verification-history workflow. Use [auth.md](auth.md) and [database-migration-guide.md](database-migration-guide.md) for current behavior.

# 1. Database entity alignment

| Current backend design | Location observed | Approved DB v3 replacement |
|---|---|---|
| Entity maps to table `user` | `src/users/user.entity.ts` | Map `UserAccount` to `public.user_account` |
| PK property/column `userId` | `user.entity.ts` | `userAccountId` mapped to `user_account_id` |
| Password stored on user as `password` | `user.entity.ts`; `auth.service.ts` | Move to `local_authentication_credential.password_hash` |
| Role stored as `role` | `user.entity.ts` | `userRole` mapped to `user_role` and existing `user_role_enum` |
| Role value `employer` | `UserRole.EMPLOYER`; seed data | Replace with `company` |
| No `peso_personnel` role | `UserRole` enum | Add approved `peso_personnel` role handling |
| Status value `inactive` | `AccountStatus.INACTIVE`; seed data | Replace with `suspended` |
| No soft-delete mapping | `user.entity.ts` | Map `deleted_at`; archived status and timestamp remain synchronized |
| Refresh token fields stored on user | `hashed_refresh_token`, `refresh_token_family` | Move to `authentication_session` rows |
| Auth provider stored on user | `authProvider` | Authentication method is represented by credential/identity rows |
| Google ID stored on user | `google_id` | Move to `external_authentication_identity.provider_subject` |

---

# 2. Local authentication changes

## Current behavior

`AuthService.validateUser()` loads one user row, blocks accounts whose `authProvider` is Google, compares the supplied password with `user.password`, and returns the account without selected secret fields.

## Approved replacement

- Load `user_account` and optional `local_authentication_credential`.
- Local login is available whenever the local credential exists, even when Google is also linked.
- Reject when no local credential exists.
- Enforce current account status from PostgreSQL.
- Never return password hashes.
- Keep bcrypt.

---

# 3. Google authentication changes

## Current behavior observed

- `GoogleStrategy` returns a Google ID and email.
- `AuthService.googleLogin()` searches by `googleId`.
- When no Google ID exists but an account has the same email, it automatically attaches Google to that account.
- When no account exists, it creates a student immediately with the literal password `GOOGLE_OAUTH_NO_PASSWORD`.
- Linking Google changes `authProvider` to Google, causing local login to be rejected.
- `GET /auth/google` and `/auth/google/callback` combine login and signup intent.

## Approved replacement

- Separate Google login, signup, and linking intentions securely.
- Store Google linkage in `external_authentication_identity` using provider plus stable subject.
- Never create a fake password.
- Google signup creates temporary `registration_onboarding` only, then redirects to student profile completion.
- Final account creation occurs only after all required student fields are submitted.
- Unknown Google login returns account-not-found and directs the user to signup.
- Existing Google signup returns account-already-exists and directs the user to login.
- Matching email alone never auto-links.
- Explicit linking requires authenticated local account ownership and matching verified email.
- Linked accounts retain both local and Google login.
- Google authentication is student-only in this version.

---

# 4. Registration changes

## Current behavior observed

`POST /auth/signup` accepts only email and password, creates a student-role account row immediately, and logs the user in. It does not create the required `student` profile.

## Approved replacement

### Manual student

Complete credentials and all required student profile information are submitted together on the final frontend step. One transaction creates account, local credential, student profile, and session.

### Google student

Google callback creates temporary onboarding state. Final profile completion creates account, external identity, student profile, and session in one transaction.

### QC PESO

Manual public signup only. Complete account, local credential, and personnel profile are created together with verification status `pending`.

### Company

No public signup. Active admin creates account, local credential, and company profile in one transaction. No forced first-login password change.

### Admin

No public signup. Create through explicit bootstrap/admin process.

---

# 5. Refresh-token and session changes

## Current behavior observed

- One refresh-token hash is stored per user.
- Login overwrites the prior stored token, so a second device invalidates the first device's refresh capability.
- A family UUID is stored but not included in generated refresh-token claims or checked during refresh.
- Hash mismatch clears the one stored token and reports that all sessions were revoked.

## Approved replacement

- Use one `authentication_session` row per browser/device.
- Include token family in refresh claims.
- Store only the current bcrypt refresh-token hash.
- Rotate within the same family.
- Reuse of an old rotated token revokes only the affected family.
- Logout revokes current family.
- Add logout-all for every family.
- Account suspension/archive revokes all families.
- Restoration does not restore sessions.

---

# 6. JWT and authorization changes

## Current behavior observed

`JwtStrategy.validate()` trusts the signed payload and does not reload current account status. An already issued access token may remain usable until expiry after suspension/archive.

Role guards read the stale `role` field and old enum.

## Approved replacement

- JWT validation/guard loads current `user_account` or uses a mandatory current-account guard.
- Reject missing, suspended, archived, or soft-deleted accounts.
- Use current `user_role` for authorization.
- Add `company` and `peso_personnel`; remove `employer`.
- Pending/rejected QC PESO users are restricted to their allowed verification routes.
- Approved QC PESO access requires active account plus approved personnel verification.

---

# 7. QC PESO verification additions

The current backend has no verification workflow.

Approved additions:

- `personnel_verification_status_enum`: pending, approved, rejected
- verification fields on `peso_personnel`
- append-only `peso_personnel_verification_history`
- active-admin approval/rejection
- optional rejection remark
- rejected personnel restricted correction and explicit resubmission
- resubmission clears current review metadata and returns rejected to pending
- pending/rejected personnel cannot access their ordinary profile or QC PESO operations

---

# 8. Seed behavior changes

## Current behavior observed

`main.ts` automatically calls `seedUsers()` whenever the environment is not production. The seed creates five rows using stale table mappings, roles/statuses, and no role-specific profiles.

## Approved replacement

Remove automatic startup seeding. Add explicit procedures:

- controlled admin bootstrap;
- idempotent reference-data seed;
- development-only sample seed;
- isolated test fixtures.

Every non-admin seed account must include exactly one matching profile and at least one valid authentication method. No fake Google password is allowed.

---

# 9. Configuration and secret-handling changes

## Current behavior observed

JWT and Google strategies contain fallback placeholder secrets/credentials when environment variables are absent.

## Approved replacement

- Do not silently use fallback authentication secrets.
- Validate required configuration during startup.
- Fail clearly or disable the affected optional integration when configuration is absent.
- Keep database host/port behavior and `synchronize: false`.
- Do not reveal `.env` values.

---

# 10. File upload addition

The current auth/signup implementation does not provide a company-file-server abstraction for the required QC PESO employee ID.

Approved replacement:

- storage service interface;
- local development/test adapter;
- production company-file-server adapter boundary;
- database stores private path/key only;
- restricted replacement flow for rejected QC PESO registrations;
- cleanup of orphaned uploads after failed transactions or replacement.

Production connectivity cannot be claimed until the company's file-server protocol and credentials mechanism are supplied.

---

# 11. Documentation changes

`backend/docs/auth.md` currently documents:

- combined Google login/signup;
- Google-only provider state on the account;
- one refresh token per user;
- claimed family revocation not fully implemented;
- old roles and account statuses;
- account-only signup.

It must be replaced or revised to match DB v3, the final routes, onboarding, profiles, sessions, verification, soft deletion, and frontend contract.

---

# 12. Preserved implementation choices

The refactor should preserve these useful foundations where compatible:

- NestJS and Passport architecture;
- bcrypt password hashing;
- JWT access and refresh tokens;
- HTTP-only refresh-token cookie;
- rate limiting;
- validation pipe;
- role decorator/guard pattern after enum and current-account updates;
- TypeORM DataSource and canonical SQL migration wrapper;
- `synchronize: false`;
- transaction-bound status actor helper, extended for new workflows;
- Docker-hosted PostgreSQL validation.

---

# 13. Intentionally deferred features

Do not add in this refactor:

- manual email verification;
- forgot-password/password-reset flow;
- Google authentication for company, QC PESO, or admin;
- company self-registration or verification workflow;
- forced initial password change for company accounts;
- Google API access beyond authentication;
- unrelated internship-domain entities/modules.
