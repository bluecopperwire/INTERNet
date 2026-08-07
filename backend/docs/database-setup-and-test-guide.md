# INTERNet Database Setup Guide

# 1. Create the local `.env`

From `backend/`:

```powershell
Copy-Item .env.example .env
```

Then edit:

```text
backend/.env
```

For a backend running directly on Windows while PostgreSQL runs in Docker, the expected database connection is normally:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_USER=postgres
DATABASE_PASSWORD=<local-development-password>
DATABASE_NAME=internet_db
```

---

# 2. Start PostgreSQL through Docker

Run this from the directory containing the repository's `docker-compose.yml`:

```powershell
docker compose up -d postgres
```

Check it:

```powershell
docker compose ps
```

Confirm the host port:

```powershell
docker compose port postgres 5432
```

The expected normal mapping is:

```text
localhost:5433 -> postgres container:5432
```

---

# 3. Apply the database migration

From `backend/`:

```powershell
npm run migration:show
```

On a new database, the initial migration should appear as pending.

Apply it:

```powershell
npm run migration:run
```

Then verify:

```powershell
npm run migration:show
```

TypeORM schema synchronization must remain disabled:

```text
synchronize: false
```

Do not enable `synchronize: true`.

---

# 3A. Seed mandatory reference data

The system currently has one mandatory reference-data seed: `industry`.

Run:

```powershell
npm run seed:reference
```

This inserts the approved industry lookup values:

1. Accounting/ Finance
2. Customer Service/ Retail
3. Engineering
4. Healthcare
5. Hospitality/ Tourism
6. Human Resources
7. Information Technology
8. Office Administration

The reference seed is idempotent, so it is safe to run again.

It should not create duplicates.

---

# 4. Seed fake development data

Development data is optional and is intended for endpoint development and local testing.

It must never be run in production.

In PowerShell:

```powershell
$env:NODE_ENV='development'
$env:ALLOW_DEV_SEED='true'
$env:DEV_SEED_PASSWORD='TestPassword123'
npm run seed:dev
```

Use a local test password that satisfies the current password rules.

Do not reuse a real personal password.

The development seed creates fake accounts and connected domain records such as:

- development admin
- manual student
- Google-only student
- dual-method student
- companies
- approved/pending/rejected QC PESO personnel
- opportunities
- applications
- referrals
- interviews
- assignments
- attendance
- feedback

The development seed is idempotent and should not duplicate its known fake dataset when rerun.

After seeding, the explicit opt-in flag can be disabled again:

```powershell
$env:ALLOW_DEV_SEED='false'
```

---

# 5. Build and run the backend

Build:

```powershell
npm run build
```

Run in development:

```powershell
npm run start:dev
```

The terminal should show successful NestJS initialization and route mapping.

Keep this terminal running while performing the Postman smoke tests later.

---

# 6. Inspect the database and relationships

Open PostgreSQL from the directory containing `docker-compose.yml`:

```powershell
docker compose exec postgres psql -U postgres -d internet_db
```

If the local `.env` uses a different PostgreSQL username or database name, replace the values accordingly.

## 6.1 Check that the tables were created

Inside `psql`, run:

```sql
\dt public.*
```

You should see the database tables created by the migration.

To inspect a specific table and its columns/constraints:

```sql
\d public.user_account
```

You can also inspect other important tables:

```sql
\d public.student
\d public.company
\d public.peso_personnel
\d public.application
\d public.referral
\d public.internship_assignment
\d public.authentication_session
```

## 6.2 Check the foreign-key relationships

Run:

```sql
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.constraint_schema = kcu.constraint_schema
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
   AND tc.constraint_schema = ccu.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;
```

This should show relationships such as:

```text
student.user_account_id -> user_account.user_account_id
company.user_account_id -> user_account.user_account_id
peso_personnel.user_account_id -> user_account.user_account_id
application.student_id -> student.student_id
application.opportunity_id -> opportunity.opportunity_id
referral.application_id -> application.application_id
internship_assignment.referral_id -> referral.referral_id
attendance_record.internship_assignment_id -> internship_assignment.internship_assignment_id
```

## 6.3 Check the views

Run:

```sql
\dv public.*
```

The expected views are:

```text
vw_student_profile_details
vw_opportunity_summary
vw_application_details
vw_referral_details
vw_upcoming_interviews
vw_internship_assignment_details
vw_attendance_summary
```

## 6.4 Check the mandatory industries

Run:

```sql
SELECT
    industry_id,
    industry_name,
    is_custom_text
FROM industry
ORDER BY industry_id;
```

You should see the eight approved industry values and each should have:

```text
is_custom_text = false
```

Do not exit `psql` yet if you also want to continue directly to the account inspection in the next section.

---

# 7. Inspect development accounts and authentication methods

## 7.1 Check the accounts

Run:

```sql
SELECT
    user_account_id,
    email,
    user_role,
    account_status
FROM user_account
ORDER BY user_account_id;
```

You should find these nine development accounts:

```text
admin.dev@internet.local
student.manual@internet.local
student.google@internet.local
student.dual@internet.local
company.tech@internet.local
company.hospitality@internet.local
peso.approved@internet.local
peso.pending@internet.local
peso.rejected@internet.local
```

## 7.2 Check manual credentials

Run:

```sql
SELECT
    ua.email
FROM local_authentication_credential lac
JOIN user_account ua
    ON ua.user_account_id = lac.user_account_id
ORDER BY ua.email;
```

Expected:

- `student.manual@internet.local` has a local credential.
- `student.dual@internet.local` has a local credential.
- `student.google@internet.local` does not have a local credential.
- Company and QC PESO seeded accounts use local credentials.

## 7.3 Check external Google identities

Run:

```sql
SELECT
    ua.email,
    eai.authentication_provider,
    eai.provider_subject
FROM external_authentication_identity eai
JOIN user_account ua
    ON ua.user_account_id = eai.user_account_id
ORDER BY ua.email;
```

Important expected results:

```text
student.manual@internet.local -> local only
student.google@internet.local -> Google only
student.dual@internet.local -> local + Google
```

The seeded Google identities are synthetic development identities. No real Google OAuth token is stored.

## 7.4 Check QC PESO verification states

Run:

```sql
SELECT
    ua.email,
    pp.verification_status,
    pp.reviewed_at,
    pp.reviewed_by_user_account_id
FROM peso_personnel pp
JOIN user_account ua
    ON ua.user_account_id = pp.user_account_id
ORDER BY ua.email;
```

Expected states:

```text
peso.approved@internet.local -> approved
peso.pending@internet.local  -> pending
peso.rejected@internet.local -> rejected
```

Exit PostgreSQL when finished:

```text
\q
```

---

# 8. Smoke test: seeded login using Postman

The examples below use:

```text
http://localhost:3000
```

If the NestJS startup log shows a different backend port, use that port instead.

Use the same password that was supplied through:

```text
DEV_SEED_PASSWORD
```

For the examples below:

```text
TestPassword123
```

is used.

## 8.1 Admin login

Send:

```http
POST http://localhost:3000/auth/login
Content-Type: application/json
```

Body:

```json
{
  "email": "admin.dev@internet.local",
  "password": "TestPassword123"
}
```

Expected:

- `200 OK`
- access token returned
- refresh cookie created

## 8.2 Manual student login

Send the same `POST /auth/login` request with:

```json
{
  "email": "student.manual@internet.local",
  "password": "TestPassword123"
}
```

Expected:

- successful login
- access token returned
- refresh cookie created

## 8.3 Dual-method student login

```json
{
  "email": "student.dual@internet.local",
  "password": "TestPassword123"
}
```

Expected:

- successful local login
- this account also has a synthetic Google identity for development testing

## 8.4 Company login

```json
{
  "email": "company.tech@internet.local",
  "password": "TestPassword123"
}
```

Expected:

- successful login

## 8.5 Approved QC PESO login

```json
{
  "email": "peso.approved@internet.local",
  "password": "TestPassword123"
}
```

Expected:

- successful login

---

# 9. Test the Google-only development account

Try a normal local login:

```http
POST http://localhost:3000/auth/login
Content-Type: application/json
```

Body:

```json
{
  "email": "student.google@internet.local",
  "password": "TestPassword123"
}
```

Expected:

```text
401 Unauthorized
```

This is correct because the account deliberately has no local password credential.

You do not need live Google OAuth just to validate this seeded authentication setup.

---

# 10. Check `/auth/me`

Copy an access token from one of the successful login responses.

Send:

```http
GET http://localhost:3000/auth/me
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Expected:

- account information is returned
- no password hash is returned
- no refresh-token hash is returned
- no Google `provider_subject` is exposed

---

# 11. Test refresh

Use the same Postman session after login:

```http
POST http://localhost:3000/auth/refresh
```

Postman should automatically send the HTTP-only refresh cookie.

Expected:

- a new access token is returned
- the refresh cookie is rotated

---

# 12. Test logout

Send:

```http
POST http://localhost:3000/auth/logout
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Then retry:

```http
POST http://localhost:3000/auth/refresh
```

Expected:

- refresh fails because that session was revoked

---

# 13. Important notes

## Seed persistence

The seeded database is stored in the PostgreSQL Docker volume.

Closing the terminal, stopping Docker, or restarting the computer does not normally delete the data.

Normal commands such as:

```powershell
docker compose stop
```

or:

```powershell
docker compose down
```

keep the Docker volume.

Do not casually run:

```powershell
docker compose down -v
```

because `-v` removes the Compose-managed volume and therefore deletes the local PostgreSQL data.

## Development seed versus production

`npm run seed:reference` contains approved lookup data and may also be used when preparing the real environment.

`npm run seed:dev` contains fake development data and must never be run in production.
