# 1. Create the local `.env`

From `backend/`:

```powershell
Copy-Item .env.example .env
```

Then edit:

```text
backend/.env
```

For a backend running directly on Windows while PostgreSQL runs in Docker, the expected database settings are normally:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_USER=postgres
DATABASE_PASSWORD=<local-development-password>
DATABASE_NAME=internet_db
```

Use the project's current `.env.example` as the authoritative list of required environment variables.

Do not commit real secrets.

---

# 2. Start PostgreSQL through Docker

From the directory containing `docker-compose.yml`:

```powershell
docker compose up -d postgres
```

Check the service:

```powershell
docker compose ps
```

Confirm the host mapping:

```powershell
docker compose port postgres 5432
```

Expected normal result:

```text
localhost:5433 -> postgres container:5432
```

If the repository configuration explicitly uses a different mapped host port, use that value instead.

---

# 3. Apply the migrations

From `backend/`:

```powershell
npm run migration:show
```

On a completely fresh database, both migrations should initially be pending:

```text
[ ] InitialSchema1785860400000
[ ] AuthAlignmentV31786125600000
```

Apply all pending migrations:

```powershell
npm run migration:run
```

Then verify:

```powershell
npm run migration:show
```

Expected after a successful V3 setup:

```text
[X] InitialSchema1785860400000
[X] AuthAlignmentV31786125600000
```

TypeORM synchronization must remain disabled:

```text
synchronize: false
```

Never enable `synchronize: true` to replace the migration workflow.

---

# 4. Seed mandatory reference data

Reference seeding is independent from fake development seeding.

Run:

```powershell
npm run seed:reference
```

The command seeds two mandatory lookup tables.

## 4.1 Industries

The approved `industry.industry_name` values are:

1. Accounting/ Finance
2. Customer Service/ Retail
3. Engineering
4. Healthcare
5. Hospitality/ Tourism
6. Human Resources
7. Information Technology
8. Office Administration

All eight predefined values use:

```text
is_custom_text = false
```

## 4.2 Requirement types

The approved `requirement_type.requirement_type_name` values are:

1. Proof of Residency
2. Latest Credential
3. Curriculum Vitae/ Resume
4. Letter of Intent
5. Recommendation Letter/ Registration Form

The reference seed is idempotent.

Run it a second time to verify that it does not create duplicates:

```powershell
npm run seed:reference
```

A second run should insert no additional lookup rows.

---

# 5. Seed optional fake development data

The development seed is intended only for local endpoint development and testing.

It never runs automatically when NestJS starts.

Set the required PowerShell environment variables:

```powershell
$env:NODE_ENV='development'
$env:ALLOW_DEV_SEED='true'
$env:DEV_SEED_PASSWORD='YourLocalTestPassword123!'
```

`DEV_SEED_PASSWORD` must be at least 12 characters.

Do not reuse a real personal password.

Run:

```powershell
npm run seed:dev
```

Run it a second time to verify fixture idempotency:

```powershell
npm run seed:dev
```

The second run should not create duplicate development fixtures.

Afterward, you may disable the explicit opt-in flag:

```powershell
$env:ALLOW_DEV_SEED='false'
```

## Development login accounts

The current seed creates these five local-password accounts:

```text
dev.admin@seed.invalid
dev.student.one@seed.invalid
dev.student.two@seed.invalid
dev.company@seed.invalid
dev.peso@seed.invalid
```

All five use the password supplied through:

```text
DEV_SEED_PASSWORD
```

One password-capable student also has a synthetic Google OAuth identity for development lookup/linking tests.

---

# 6. Build the backend

From `backend/`:

```powershell
npm run build
```

---

# 7. Run the backend

Start NestJS:

```powershell
npm run start:dev
```

The terminal should show successful NestJS initialization and route mapping.

Keep this terminal running for Postman or frontend smoke testing.

The examples below assume:

```text
http://localhost:3000
```

If NestJS starts on another port, use the actual port shown by the application.

---

# 8. Inspect the database manually

From the project root:

```powershell
docker compose exec postgres psql -U postgres -d internet_db
\dt

```

# 9. Smoke-test seeded local login

Use the password that you configured through `DEV_SEED_PASSWORD`.

Example:

```http
POST http://localhost:3000/auth/login
Content-Type: application/json
```

```json
{
  "email": "dev.student.one@seed.invalid",
  "password": "YourLocalTestPassword123!"
}
```

Expected:

- successful authentication;
- access token returned;
- refresh-token behavior/cookie according to the current auth controller.

Repeat with:

```text
dev.admin@seed.invalid
dev.student.two@seed.invalid
dev.company@seed.invalid
dev.peso@seed.invalid
```

All five seeded accounts are local-password accounts and should authenticate using the configured development password.

---

# 10. Test `/auth/me`

Copy an access token from a successful login.

```http
GET http://localhost:3000/auth/me
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Expected:

- account information;
- basic matching role-specific profile;
- no password hash;
- no refresh-token hash;
- no OAuth provider subject.

---

# 11. Test refresh-token rotation

After login, use the same Postman session so the HTTP-only refresh cookie is retained.

```http
POST http://localhost:3000/auth/refresh
```

Expected:

- a new access token;
- refresh-token rotation;
- the previous refresh token should no longer remain the current valid token.

The current implementation supports one active session per account.

A new login replaces/revokes the previous active session.

---

# 12. Test logout

```http
POST http://localhost:3000/auth/logout
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Then retry:

```http
POST http://localhost:3000/auth/refresh
```

Expected:

- refresh fails after the current session is revoked.

Logout-all is intentionally deferred and is not part of the current V3 scope.

---
