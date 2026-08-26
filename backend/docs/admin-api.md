# Admin User Management API

Base URL: `/admin`  
Authorization: every endpoint requires a valid Bearer access token whose current account has `user_role = admin`.

Unauthenticated requests return `401`; authenticated non-Admin requests return `403`. Request DTOs use the application's global whitelist/transform validation. Unknown properties are rejected.

## Endpoint summary

| Method | Endpoint | Status | Dependency |
|---|---|---|---|
| GET | `/admin/students` | Implemented | — |
| GET | `/admin/students/:studentId` | Implemented | — |
| PATCH | `/admin/students/:studentId` | Implemented | `DB-ADMIN-004` enforced at API level |
| GET | `/admin/employers` | Implemented | — |
| GET | `/admin/employers/:companyId` | Implemented | — |
| POST | `/admin/employers` | Temporary DB Stub | `DB-ADMIN-002` |
| PATCH | `/admin/employers/:companyId` | Implemented | — |
| GET | `/admin/qc-peso` | Implemented | — |
| GET | `/admin/qc-peso/:pesoPersonnelId` | Implemented | — |
| POST | `/admin/qc-peso` | Temporary DB Stub | `DB-ADMIN-003` |
| PATCH | `/admin/qc-peso/:pesoPersonnelId` | Implemented | — |
| PATCH | `/admin/accounts/:userAccountId/status` (`suspended -> active`) | Implemented | — |
| PATCH | `/admin/accounts/:userAccountId/status` (`active/suspended -> archived`) | Implemented | — |
| PATCH | `/admin/accounts/:userAccountId/status` (`active -> suspended`) | Temporary DB Stub | `DB-ADMIN-001` |

Archived profiles remain readable from list/detail endpoints. An archived account is terminal in this API and its profile cannot be edited. Suspended profiles remain editable. Profile `contactEmail` is separate from immutable `user_account.email` (`accountEmail`).

## Shared list behavior

Student, Employer, and QC PESO lists accept:

| Query | Validation | Default |
|---|---|---|
| `search` | optional trimmed string | none |
| `status` | `active`, `suspended`, or `archived` | all |
| `page` | integer, 1 or greater | 1 |
| `limit` | integer, 1–100 | 7 |

Search is case-insensitive and is performed by the database. `summary` is always role-wide and is not reduced by search, status, or pagination. `meta.total` is the filtered total.

```json
{
  "data": [],
  "summary": { "total": 8, "active": 6, "suspended": 1, "archived": 1 },
  "meta": { "page": 1, "limit": 7, "total": 8, "totalPages": 2 }
}
```

Invalid queries return `400`.

## Students

### GET `/admin/students` — Implemented

Purpose: Manage Students list. Searches full name and account/login email. Each row contains `studentId`, `userAccountId`, `fullName`, `accountEmail`, `createdAt`, and `accountStatus`.

Tables: `user_account`, `student`.

Example: `GET /admin/students?search=juan&status=active&page=1&limit=7`.

### GET `/admin/students/:studentId` — Implemented

`studentId` must be a positive integer. Returns `404` if there is no Student profile with that ID.

Response fields: `studentId`, `userAccountId`, `accountEmail`, `accountStatus`, `createdAt`, `firstName`, `middleName`, `lastName`, `extensionName`, `fullName`, `birthDate`, `sex`, all four address fields, `contactEmail`, `contactNumber`, `linkedinUrl`, `photoFilePath`, `schoolName`, `yearLevel`, `strandProgram`, `requiredHours`, `availableDays`, `startDate`, `preferredCompanyType`, `allowsOutsidePreferredField`, and `preferredIndustries[]` (`industryId`, `industryName`, `customIndustryName`). Inquiry Method is intentionally not part of this contract.

Tables: `user_account`, `student`, `student_academic_information`, `internship_preference`, `student_preferred_industry`, `industry`.

### PATCH `/admin/students/:studentId` — Implemented

All properties are optional, but unknown/ownership fields are rejected. Accepted properties are:

```json
{
  "firstName": "Juan",
  "middleName": null,
  "lastName": "Dela Cruz",
  "extensionName": null,
  "birthDate": "2002-05-01",
  "sex": "Male",
  "addressLine": "1 Main Street",
  "addressBarangay": "Central",
  "addressDistrict": "District 1",
  "addressCity": "Quezon City",
  "contactEmail": "juan.contact@example.com",
  "contactNumber": "09123456789",
  "linkedinUrl": "https://linkedin.com/in/juan",
  "schoolName": "QC University",
  "yearLevel": "fourth_year_college",
  "strandProgram": "BSIT",
  "requiredHours": 400,
  "availableDays": "weekdays",
  "startDate": "2026-09-01",
  "preferredCompanyType": "private",
  "allowsOutsidePreferredField": true,
  "preferredIndustries": [{ "industryId": 3, "customIndustryName": null }]
}
```

Valid year levels are `grade_11`, `grade_12`, and first through fourth year college. `fifth_year_college` is rejected now (`DB-ADMIN-004`) although removal from the database enum is pending. `requiredHours` and industry IDs must be positive. Work schedules are `weekdays`, `weekends`, or `flexible`. Preferred industry IDs must exist and be unique; custom text must follow the industry's `is_custom_text` rule. Updates spanning profile tables are transactional.

Returns the updated detail response. Returns `409` for archived profiles, `404` if missing, and `400` for invalid or forbidden properties including `accountEmail`, IDs, status, and password fields.

## Employers

### GET `/admin/employers` — Implemented

Purpose: Manage Employers list. Searches company name and account/login email. Rows contain `companyId`, `userAccountId`, `companyName`, `accountEmail`, `createdAt`, and `accountStatus`.

Tables: `user_account`, `company`.

### GET `/admin/employers/:companyId` — Implemented

Returns account fields; `companyName`, `companyType`, `industryId`, `industryName`, numeric `companySize`, `yearEstablished`, `websiteUrl`, `description`, `logoFilePath`; four address fields; contact-person component/full-name fields; `contactEmail`; and `contactNumber`. Archived profiles are returned. Missing profiles return `404`.

Tables: `user_account`, `company`, `industry`.

### POST `/admin/employers` — Temporary DB Stub (`DB-ADMIN-002`)

Purpose: future transactional creation of `user_account`, `local_authentication_credential`, and `company`. The validated contract is:

```json
{
  "accountEmail": "login@abctech.com",
  "initialPassword": "Password1!",
  "companyName": "ABC Technologies Inc.",
  "companyType": "private",
  "industryId": 3,
  "companySize": 250,
  "yearEstablished": 2010,
  "websiteUrl": "https://www.abctech.com",
  "description": "A technology company.",
  "addressLine": "123 Aurora Boulevard",
  "addressBarangay": "Cubao",
  "addressDistrict": "District 3",
  "addressCity": "Quezon City",
  "contactPersonFirstName": "Maria",
  "contactPersonMiddleName": null,
  "contactPersonLastName": "Santos",
  "contactPersonExtensionName": null,
  "contactEmail": "hr@abc.com",
  "contactNumber": "09123456789"
}
```

Emails/URLs, nonblank required strings, positive numeric size/industry ID, company type, password length, and a nonfuture year are validated before the stub executes. A valid request returns:

```json
{
  "statusCode": 503,
  "code": "DB_MIGRATION_PENDING",
  "dependency": "DB-ADMIN-002",
  "message": "Employer account creation is temporarily unavailable pending an approved database migration."
}
```

Reason: `company.logo_file_path` is currently required and this contract does not require a logo. No fake path is supplied.

### PATCH `/admin/employers/:companyId` — Implemented

Accepts the company, industry, numeric size, year, website, description, address, contact-person, `contactEmail`, and `contactNumber` properties shown by the creation contract, except account credentials. `industryId` must identify an existing non-custom industry. Returns updated details; `400` for validation/forbidden properties, `404` if missing, and `409` if archived.

Tables: `user_account` (read-only), `company`, `industry`.

## QC PESO

### GET `/admin/qc-peso` — Implemented

Purpose: Manage QC PESO list. Searches full name, account/login email, and employee ID. Rows contain `pesoPersonnelId`, `userAccountId`, `fullName`, `accountEmail`, `employeeId`, `createdAt`, and `accountStatus`.

Tables: `user_account`, `peso_personnel`. Verification state is neither selected nor required.

### GET `/admin/qc-peso/:pesoPersonnelId` — Implemented

Returns account fields; name components/full name; birth date and sex; four address fields; `contactEmail`, `contactNumber`; `employeeId`, `department`, `position`; and `photoFilePath`. It intentionally omits verification state and employee-ID document data. Archived profiles are returned; missing profiles return `404`.

### POST `/admin/qc-peso` — Temporary DB Stub (`DB-ADMIN-003`)

Validated body:

```json
{
  "accountEmail": "maria.reyes@quezoncity.gov.ph",
  "initialPassword": "Password1!",
  "firstName": "Maria",
  "middleName": "Santos",
  "lastName": "Reyes",
  "extensionName": null,
  "addressLine": "309 Katipunan Ave",
  "addressBarangay": "Loyola Heights",
  "addressDistrict": "3",
  "addressCity": "Quezon City",
  "birthDate": "1990-08-20",
  "sex": "Female",
  "contactEmail": "maria@quezoncity.gov.ph",
  "contactNumber": "09123456789",
  "employeeId": "QCPESO-001",
  "department": "QC PESO Internship Division",
  "position": "Employment Officer"
}
```

A valid request returns `503` with `code: DB_MIGRATION_PENDING` and `dependency: DB-ADMIN-003`. The existing employee-ID-file and verification requirements prevent implementing the approved no-verification creation contract. No fake document or verification values are supplied.

### PATCH `/admin/qc-peso/:pesoPersonnelId` — Implemented

Accepts name, birth date, sex, address, contact, employee ID, department, and position fields. Employee-ID conflicts return `409`. Account email, verification fields, document fields, IDs, status, and credentials are rejected by DTO whitelisting. Returns updated details; archived edits return `409`.

Tables: `user_account` (read-only), `peso_personnel`. The update does not require or update an employee-ID document or verification state.

## Shared account status

### PATCH `/admin/accounts/:userAccountId/status`

The positive `userAccountId` must belong to a Student, Company, or QC PESO account. Admin accounts and missing managed accounts return `404`.

Implemented requests:

```json
{ "status": "active" }
```

Allows only `suspended -> active`.

```json
{ "status": "archived" }
```

Allows `active -> archived` and `suspended -> archived`. Archiving sets `deleted_at` and never physically deletes the profile. Existing database triggers append `user_account_status_history` with the Admin actor and revoke active authentication sessions when archiving. No authentication infrastructure changes were needed.

Timed suspension contract (Temporary DB Stub, `DB-ADMIN-001`):

```json
{ "status": "suspended", "suspensionDays": 7 }
```

For an active managed account, a valid request returns `503`, `DB_MIGRATION_PENDING`, `DB-ADMIN-001` and performs no database mutation. `suspensionDays` must be a positive integer. `archived -> active`, `archived -> suspended`, same-state requests, and other invalid transitions return `409`.

Tables: `user_account`; database triggers use `user_account_status_history` and `authentication_session`.

## Reference industries

No general-purpose industry reference controller currently exists. Admin DTOs and services validate IDs against the existing `industry` table, but this task did not add a duplicate `/admin` endpoint or modify reference data. A separately approved read-only reference-data endpoint is needed if the frontend cannot obtain industry IDs from another existing flow.

## Database dependencies after approval

- `DB-ADMIN-001`: add approved `user_account.suspended_until`, implement persistence/expiry behavior, replace the timed-suspension stub, and update its tests/docs.
- `DB-ADMIN-002`: make `company.logo_file_path` nullable, transactionally create account/credential/company with the established password hashing mechanism, and replace stub tests/docs with success/conflict tests.
- `DB-ADMIN-003`: remove obsolete QC PESO employee-ID-file/verification requirements, transactionally create account/credential/profile, and replace stub tests/docs with success/conflict tests.
- `DB-ADMIN-004`: remove `fifth_year_college` from the database enum. The Admin DTO already rejects it; retain that regression test and align the shared enum after migration approval.
