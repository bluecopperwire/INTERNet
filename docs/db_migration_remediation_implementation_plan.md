# Database Migration Remediation Implementation Plan

## 1. Purpose

This plan addresses the defects found during the review of commit `02e7521` (`feature: db migration`). The migration is not ready for approval until the database validator, operational documentation, frontend integrations, and deployment safeguards described below are completed and verified.

The plan covers both supported database paths:

1. A new developer creates a database from zero by following `backend/docs/database-setup-and-test-guide.md`.
2. An existing environment upgrades a database created by `1785860400000-InitialSchema.ts` to `1787788800000-ApprovedDatabaseRedesign.ts` without losing recoverability.

## 2. Outcomes and Non-Goals

### Required outcomes

- Fresh and upgraded databases converge on the same final schema.
- Every formerly blocked Admin and Employer workflow works through both the backend API and the actual frontend UI.
- `npm run database:validate` checks the schema objects that the migrations really create.
- The documented validation commands work with the documented database configuration.
- The irreversible migration has a tested backup-and-restore rollback procedure.
- Unit, migration, seed, and end-to-end tests provide reliable release evidence.

### Non-goals

- Reintroducing the retired QC PESO verification workflow.
- Reconstructing deleted QC PESO verification history in a down migration.
- Redesigning unrelated dashboards, application workflows, or UI components.
- Enabling TypeORM `synchronize`.

## 3. Release Blockers and Priority

| Priority | Blocker | Required result |
|---|---|---|
| P0 | Database validator targets nonexistent schema objects | Validator passes against both a fresh database and an upgraded database |
| P0 | Rollback guide claims an irreversible migration is reversible | Documentation and release process use backup restoration as the rollback mechanism |
| P0 | Employer opportunity form sends the wrong API payload | Create and edit requests pass validation and persist free-text allowances |
| P0 | Internship deletion and acceptance withdrawal are not wired in the frontend | Both actions call their backend endpoints and visibly refresh state |
| P1 | Existing-database deployment has no compatibility or downtime procedure | A coordinated stop, backup, migration, validation, deployment, and recovery sequence is documented |
| P1 | Database setup guide invokes a validator that refuses `internet_db` | The command works as documented or the guide creates and targets an explicit disposable validation database |
| P1 | Test sources fail full TypeScript checking | All changed unit and E2E tests type-check |
| P2 | Migration documentation uses incorrect object names and behavior | Documentation matches executable SQL exactly |

## 4. Implementation Sequence

The work must be completed in the following order. Do not release frontend or backend changes independently while the schema remains incompatible with either application version.

### Phase 1: Establish the schema contract

#### 1.1 Create a canonical final-schema inventory

Use these files as executable sources of truth:

- `backend/src/database/migrations/1785860400000-InitialSchema.ts`
- `backend/src/database/migrations/001_initial_schema.sql`
- `backend/src/database/migrations/1787788800000-ApprovedDatabaseRedesign.ts`
- `backend/src/database/migrations/002_approved_database_redesign.sql`

Record the exact final names, types, constraints, indexes, functions, triggers, and views that migration 002 creates. At minimum, confirm:

- Migration names are `InitialSchema1785860400000` and `ApprovedDatabaseRedesign1787788800000`.
- The removed history table is `peso_personnel_verification_history`.
- The referral trigger function is `fn_validate_referral`.
- The attendance derivation function is `fn_derive_attendance`.
- The opportunity compatibility view is `vw_opportunity_summary`.
- The suspension constraint is `ck_user_account_suspension_expiry`, unless the SQL is deliberately renamed.
- The assignment index name and predicate match their intended use.

#### 1.2 Resolve schema-versus-documentation decisions

Make each of the following explicit before changing tests:

- Suspension constraint: either enforce only status/null consistency, as the current SQL does, or add a future-expiry rule. If a future-expiry database rule is desired, account for the migration's existing-suspension backfill and avoid a time-dependent check constraint that becomes stale without a write.
- Soft-delete index: choose whether it supports active rows (`deleted_at IS NULL`) or deleted-row audit lookup (`deleted_at IS NOT NULL`). Update SQL, tests, and docs to the same decision. The recommended runtime-oriented design is an active-row partial index using a commonly queried key such as `referral_id`.
- Existing suspended accounts: document whether migration sets them to immediately expired, assigns a new duration, or requires a pre-migration data correction.

Acceptance criteria:

- A single schema inventory is reviewed against the SQL.
- No validator or documentation name is invented independently of the migration.

### Phase 2: Repair database validation

#### 2.1 Make `database:validate` read-only

Refactor `backend/test/database/initial-schema.validation.cjs` so the command can safely run against the database documented in `.env`.

- Remove destructive fixture creation from the operational schema validator.
- Remove or revise the requirement that `DATABASE_NAME` contain `validation` once the script is fully read-only.
- Query catalogs and migration metadata only.
- Fail with a focused message that identifies the missing or mismatched object.
- Validate the exact migration names from Phase 1.
- Validate removal of the real PESO history table and obsolete columns/type.
- Validate the exact view and function names created by migrations 001 and 002.
- Validate view column signatures, including compatibility `has_allowance` and text `allowance` in `vw_opportunity_summary`.
- Validate `suspended_until`, nullable company logo, text allowance, and assignment `deleted_at`.
- Validate the selected soft-delete index predicate.

#### 2.2 Move behavioral checks to disposable database tests

Behavioral checks that insert or update data belong in Testcontainers-backed migration tests, not the operational validator. Add or restore coverage for:

- Invalid and valid suspension state combinations.
- Automatic expiry behavior used by `UsersService`.
- Numeric allowance conversion during upgrade and free-text allowance after upgrade.
- `accepted -> rejected` only while the student response remains pending.
- One-hour attendance deduction and recalculation of existing rows.
- Soft-deleted assignments being excluded from all relevant views and service queries.
- QC PESO creation without retired verification columns.
- Preservation of the base-schema integrity checks that were removed from the previous large validator.

#### 2.3 Add two migration-path tests

Create separate automated scenarios:

1. **Fresh path**: empty PostgreSQL 16 database -> run migrations 001 and 002 -> validate final schema -> seed -> validate seed.
2. **Upgrade path**: run migration 001 -> insert representative legacy data -> run migration 002 -> validate converted data and final schema.

Legacy upgrade fixtures must include:

- Opportunity rows with and without allowance.
- Active, suspended, and archived accounts.
- QC PESO rows and verification history.
- Attendance rows with complete, overtime, undertime, and incomplete states.
- Referrals and terminal/non-terminal internship assignments.

Acceptance criteria:

- `npm run database:validate` succeeds on the documented final database.
- Fresh and upgrade tests independently pass.
- The validator fails when a required migration object is intentionally absent in a test fixture.

### Phase 3: Fix frontend opportunity create and edit

Affected files include:

- `frontend/src/features/employer/pages/CreateOpportunityPage.tsx`
- `frontend/src/features/employer/services/employer.service.ts`
- `frontend/src/features/employer/services/employer-api.service.ts`
- `frontend/src/features/employer/stores/useEmployerStore.ts`
- `frontend/src/features/employer/types/employer.types.ts`
- `frontend/src/types/api.ts`

#### 3.1 Introduce typed request payloads

Define frontend API request types that mirror `CreateOpportunityDto` and `UpdateOpportunityDto`. Do not use `any` for these methods.

Map UI fields as follows:

| UI model | API request |
|---|---|
| `slots` | `offeredSlots` |
| `duration` | `minimumRequiredHours` |
| `jobDescription` | `description` |
| `qualifications` | `qualification` |
| `On-site` | `onsite` |
| `Remote` | `remote` |
| `Hybrid` | `hybrid` |
| blank allowance | `null` |
| nonblank allowance | trimmed string |

Do not send UI-only fields such as `id`, `status`, or `applicants`. This is required because the backend enables `forbidNonWhitelisted`.

#### 3.2 Separate create and update mapping

- Create must send every required backend field, including `applicationDeadline` and `qualification` as a string or `null`.
- Update must send only changed editable fields.
- Preserve the raw nullable allowance in edit state; do not convert `null` to the display string `None` and then persist `None` accidentally.
- Surface backend validation messages instead of a generic alert where possible.

#### 3.3 Add frontend tests

Cover payload mapping for:

- Free-text allowance.
- No allowance.
- Each work-arrangement value.
- Create and edit flows.
- Rejection of missing required fields before an HTTP request.

Acceptance criteria:

- The browser creates and edits an opportunity without a 400 or 503 response.
- The database stores the exact trimmed allowance string or `NULL`.
- Student catalog filtering by allowance still returns the expected records.

### Phase 4: Wire the remaining employer actions

#### 4.1 Internship soft deletion

Add `deleteInternship(assignmentId)` to `employer-api.service.ts`, calling:

```text
DELETE /employer/internships/:internshipAssignmentId
```

Replace the no-op `deleteInternshipDetails` implementation with the API call. After success:

- Remove or refetch the deleted assignment in the store.
- Navigate only after the server confirms success.
- Show 409 errors for non-terminal assignments and preserve the current page.
- Prevent duplicate submissions while the request is pending.

#### 4.2 Withdraw employer acceptance

Add `withdrawAcceptance(referralId)` to the API service and store, calling:

```text
PATCH /employer/referrals/:referralId/withdraw-acceptance
```

Wire the existing button to this method. The UI must:

- Display the action only for an accepted referral whose student response is pending and which has no assignment.
- Require confirmation because the result is terminal rejection.
- Refresh referral and assignment-candidate state after success.
- Display the backend conflict message if the student already responded.

#### 4.3 End-to-end coverage

Add browser-facing or frontend service tests and retain backend E2E coverage for:

- Accepted/pending referral withdrawal succeeds and becomes rejected/closed.
- Withdrawal fails after student response.
- Terminal own assignment deletion succeeds and disappears from lists/details.
- Pending or ongoing deletion fails.
- Cross-company access remains 404.

Acceptance criteria:

- Neither UI action is a no-op.
- UI state after each successful mutation matches a fresh API read.

### Phase 5: Correct documentation and rollback operations

Affected files:

- `docs/db_migration_implementation_plan.md`
- `backend/docs/database-migration-guide.md`
- `backend/docs/database-setup-and-test-guide.md`
- Relevant Admin and Employer API documentation.

#### 5.1 Document the migration as forward-only

Keep the defensive exception in `002_approved_database_redesign.down.sql` unless a genuinely lossless reverse design is approved. Replace all claims that `migration:revert` restores the schema.

Document that rollback means:

1. Stop application traffic.
2. Preserve the failed database for investigation.
3. Restore the verified pre-migration backup into a new or cleared target database.
4. Deploy the previous application version.
5. Validate migration history, row counts, authentication, and critical workflows.

#### 5.2 Add mandatory existing-database preflight

Before migration:

- Confirm PostgreSQL 16 and available storage.
- Record the current application commit and migration table.
- Run a query for `fifth_year_college`; resolve rows before continuing.
- Record row counts for every altered or dropped table.
- Export or explicitly approve destruction of QC PESO verification history.
- Create a database backup using the environment's approved PostgreSQL backup tool.
- Restore that backup to a disposable database and prove it is usable.
- Schedule a maintenance window because old and new application versions are not schema-compatible.

#### 5.3 Define the coordinated deployment runbook

Recommended sequence:

1. Announce maintenance and stop background jobs/application writes.
2. Create and verify the final backup.
3. Run preflight queries.
4. Apply migration 002.
5. Run the read-only schema validator.
6. Deploy the matching backend and frontend build.
7. Run critical smoke tests.
8. Re-enable traffic and monitor database/application errors.

Smoke tests must cover login, Admin account creation/suspension, opportunity create/edit/catalog, referral withdrawal, internship deletion, attendance totals, and QC PESO access.

#### 5.4 Correct all schema terminology

Replace incorrect names and claims with the Phase 1 inventory. In particular:

- Do not mention `vw_opportunity_catalog` unless it is actually added.
- Do not mention `fn_calculate_attendance_hours` or `fn_validate_referral_transition` unless those functions are actually added.
- Use the real PESO verification history table name.
- Describe the actual suspension constraint behavior.
- Describe the actual soft-delete index name and predicate.

Acceptance criteria:

- Every command in both database guides can be followed verbatim.
- The rollback section no longer instructs users to run an intentionally failing revert.
- A reviewer can trace every documented schema object to executable migration SQL.

### Phase 6: Restore test quality and enforce release gates

#### 6.1 Fix changed test type errors

- Import `QueryRunner` where it is used in `employer-scoping-and-blockers.spec.ts`.
- Correct mock return types and enum literals instead of relying on transpile-only Jest behavior.
- Correct invalid argument inference in employer E2E fixture helpers.
- Run a full TypeScript check that includes unit and E2E tests.

#### 6.2 Preserve regression coverage

Do not replace broad base-schema integrity tests with a small set of redesign checks. Organize them into separate suites if runtime is a concern:

- Base schema integrity.
- Migration 002 structure.
- Migration 002 data conversion.
- Seed integrity/idempotency.
- Admin API behavior.
- Employer API behavior.
- Frontend request mapping and actions.

#### 6.3 Required release commands

Run from `backend/` unless otherwise stated:

```powershell
npm test -- --runInBand --no-cache
npx tsc -p tsconfig.build.json --noEmit
npx tsc --noEmit
npm run test:admin:e2e
npm run test:employer:e2e
npm run database:validate
npm run database:validate-seeds
```

Run the frontend lint, type-check, and production build using its package scripts after dependencies are installed.

Do not use `npm run lint` for a review-only check while it contains `--fix`; invoke ESLint without write/fix flags in CI or add a dedicated `lint:check` script.

Acceptance criteria:

- Production and test TypeScript checks pass.
- Unit, Admin E2E, Employer E2E, fresh migration, upgrade migration, and seed validation pass.
- The frontend production build passes.
- No test silently skips because Docker is unavailable in the release environment.

## 5. Test Matrix

| Area | Unit | Integration/E2E | Manual smoke |
|---|---|---|---|
| Fresh migrations | SQL inventory helpers | Empty PostgreSQL 16 -> 001 -> 002 | Follow setup guide verbatim |
| Existing upgrade | Conversion helpers | Legacy fixtures -> 002 | Validate representative existing records |
| Admin create employer/PESO | DTO/service branches | HTTP plus database assertions | Create and log in with both accounts |
| Timed suspension | Expiry/status logic | Suspend, block, expire, reactivate, history | Confirm remaining days in Admin UI |
| Opportunity allowance | Mapper/normalizer | Create, edit, catalog filter | Create free-text and no-allowance postings |
| Referral withdrawal | State checks | Accepted -> rejected and conflict cases | Use the actual UI button |
| Assignment deletion | Eligibility checks | Soft delete and visibility filters | Delete terminal record from detail page |
| Attendance | Hour utility | Trigger recalculation and view totals | Compare displayed and stored totals |
| QC PESO retirement | Compatibility responses | Signup/create/login without verification columns | Confirm no verification gate appears |
| Seeds | Idempotency helpers | Seed twice and compare counts | Follow setup guide seed section |

## 6. Definition of Done

The remediation is complete only when all of the following are true:

- [ ] Fresh database setup works using `backend/docs/database-setup-and-test-guide.md` without undocumented steps.
- [ ] Migration 002 succeeds against a representative migration-001 database.
- [ ] A verified backup can be restored and used with the previous application version.
- [ ] The operational schema validator is read-only and passes against the real final schema.
- [ ] The seed is idempotent and passes seed validation after both database paths.
- [ ] Employer opportunity create and edit work from the frontend.
- [ ] Employer acceptance withdrawal works from the frontend.
- [ ] Employer internship soft deletion works from the frontend.
- [ ] Admin employer creation, QC PESO creation, and timed suspension pass E2E tests.
- [ ] Student opportunity browsing and all affected dashboards continue to work.
- [ ] All backend unit, TypeScript, migration, seed, Admin E2E, and Employer E2E checks pass.
- [ ] Frontend lint, type-check, tests, and production build pass.
- [ ] Database and API documentation match executable code and SQL.
- [ ] No `DB_MIGRATION_PENDING` path remains for the migrated features.

## 7. Evidence Required for Final Review

Attach the following to the final migration review:

- Test output for every release command in Phase 6.
- Fresh-path and upgrade-path migration logs.
- Read-only schema validator output.
- Seed-twice row-count comparison.
- Pre-migration backup and restore verification record using non-sensitive identifiers.
- API responses or screenshots for the seven formerly blocked endpoints.
- A schema inventory diff showing the final objects after migration 002.
- Confirmation that the worktree contains no generated or unrelated changes.
