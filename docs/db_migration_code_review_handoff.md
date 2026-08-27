# Database Migration Code Review Handoff

## 1. Handoff Summary

This document records the migration revisions reviewed through commit `fd9955d` (`bugfix: database seed validation`), the verification performed on 2026-08-27, the attempted upgrade of the local Docker database, and the remaining work required before approval.

Current verdict: **not release-ready**.

The reference/development seed validation split is working. The principal blocker is that `ApprovedDatabaseRedesign1787788800000` passes its synthetic Testcontainers upgrade test but fails against the real historical `AuthAlignmentV31786125600000` schema. Frontend response handling and maintained documentation also remain partially incomplete.

No application source code was changed during the review or database migration attempt.

## 2. Repository and Environment Baseline

| Item | State at handoff |
|---|---|
| Branch | `feature/frontend-integration` |
| Reviewed revision | `fd9955d bugfix: database seed validation` |
| Previous reviewed revision | `2ed5791 bugfix: db migration issues` |
| Docker Engine | Running, server 29.6.2 |
| PostgreSQL container | `internet_postgres`, healthy |
| PostgreSQL image/version | PostgreSQL 16 Alpine; server observed as 16.14 |
| Host mapping | `localhost:5433 -> container:5432` |
| Configured database | `internet_db` |
| Configured database user | `postgres` |
| Final migration state | `InitialSchema` applied; `ApprovedDatabaseRedesign` pending |

Untracked review documents present at handoff:

- `docs/db_migration_remediation_implementation_plan.md`
- `docs/db_migration_followup_implementation_plan.md`
- This handoff document

These are documentation-only changes. The tracked application worktree was otherwise clean at the time of review.

## 3. Original Follow-up Findings and Revision Status

| Issue | Revision attempt | Review result |
|---|---|---|
| 1. Existing `AuthAlignmentV3` databases failed exact migration-history validation | Validator changed to require current migrations while recognizing `AuthAlignmentV3`; migration test now inserts the historical migration name | **Blocked.** History validation improved, but the test does not reproduce the historical schema and the real upgrade fails |
| 2. Reference seed was paired with a development-account validator | Added separate reference and development validator scripts and corrected database guides | **Resolved**, subject to retaining regression coverage |
| 3. Declined student response was presented as pending | Added `Declined` to the UI union, mapper, and withdrawal predicate | **Partially resolved.** Declined maps correctly, but unknown/null still defaults to actionable pending and other API fields are mismapped |
| 4. Documentation described retired schema and blocked features | Updated portions of Admin, Auth, Dashboard, database guides, and added a historical-plan notice | **Partially resolved.** Several active contradictions, formatting defects, and broken links remain |
| 5. Default tests require Docker | Confirmed as an intentional development requirement | **Accepted behavior.** Keep Docker-backed migration coverage in `npm test` |

## 4. Work Completed in Revision `fd9955d`

### 4.1 Migration-history validator

`backend/test/database/initial-schema.validation.cjs` now:

- Requires `InitialSchema1785860400000` exactly once.
- Requires `ApprovedDatabaseRedesign1787788800000` exactly once.
- Recognizes `AuthAlignmentV31786125600000` as a supported historical entry.
- Rejects unknown migration names.
- Continues with catalog-level final-schema validation after checking migration history.
- Remains read-only.

This resolves the earlier exact-two-row assertion defect once the redesign can actually be applied.

### 4.2 Seed validation

The revision added:

- `database:validate-reference-seeds`
- `database:validate-dev-seeds`
- `backend/test/database/reference-seed.validation.cjs`
- Corrected reference and development command sequences in both database guides.

Observed result:

```text
npm run database:validate-reference-seeds
Reference seed validation passed.
```

The compatibility alias `database:validate-seeds` still targets the development validator.

### 4.3 Frontend declined-state handling

The revision:

- Added `Declined` to `InternshipAssignment.studentResponse`.
- Added `mapStudentResponse`.
- Added `canWithdrawCandidate`.
- Changed the review page to use the withdrawal predicate.

The known `declined -> pending` conversion is fixed for the literal backend value `declined`, but fail-closed handling and response typing still need work as described in section 7.

### 4.4 Documentation

The revision removed several PESO verification references, corrected the removed year-level description, separated seed commands, and added a historical notice to the old frontend/backend integration plan.

The documentation audit is incomplete; remaining items are listed in section 8.

## 5. Local Docker Database Upgrade Attempt

### 5.1 Preflight

The following conditions were confirmed before attempting the irreversible migration:

- Container `internet_postgres` was healthy.
- Target database was `internet_db`.
- PostgreSQL accepted connections.
- Database size was approximately 10 MB.
- No rows used the removed year level:

```text
fifth_year_rows = 0
```

- The migrations table contained:

```text
InitialSchema1785860400000
AuthAlignmentV31786125600000
```

This is the exact historical lineage the revised code claimed to support.

### 5.2 Backup and restore rehearsal

A PostgreSQL custom-format backup was created at:

```text
/var/lib/postgresql/data/migration_backups/
internet_db_before_approved_redesign_20260827_fd9955d.dump
```

Backup details:

- Size: approximately 158.6 KB
- Format: PostgreSQL custom archive
- Archive entries: 295
- Source database version: PostgreSQL 16.14

The archive was restored into the disposable database `internet_db_restore_verify_fd9955d`. The restored database contained:

- Both expected historical migration rows.
- 24 public tables.

The disposable verification database was dropped only after the restore and inspection succeeded. The backup archive remains in the PostgreSQL data volume.

### 5.3 Migration command and failure

Attempted command from `backend/`:

```powershell
npm run migration:run
```

TypeORM correctly detected one pending migration, but PostgreSQL rejected migration 002 with:

```text
trigger "trg_peso_verification_history" for table "peso_personnel" does not exist
```

The failing statement is in:

```text
backend/src/database/migrations/002_approved_database_redesign.sql
```

The redesign migration unconditionally drops PESO verification objects. The historical `002_auth_alignment_v3.sql` had already removed:

- `trg_peso_personnel_verification`
- `trg_peso_verification_history`
- `peso_personnel_verification_history`
- PESO verification columns
- PESO verification constraints
- `fn_validate_peso_verification`
- `personnel_verification_status_enum`

Consequently, fixing only the first failing `DROP TRIGGER` is insufficient. Every removal in that section must tolerate both supported input schemas.

### 5.4 Rollback integrity

The SQL migration contains its own `BEGIN`/`COMMIT`, while the TypeORM wrapper uses transaction mode `none`. PostgreSQL rolled back the failed SQL transaction.

Post-failure checks confirmed:

- `ApprovedDatabaseRedesign1787788800000` was not inserted into the migrations table.
- `user_account.suspended_until` was not left behind.
- The database remained on its pre-redesign schema.
- The container remained healthy.

Final state:

```text
[X] InitialSchema1785860400000
[ ] ApprovedDatabaseRedesign1787788800000
```

Do not manually insert the redesign migration row or manually patch the local database to appear migrated. The migration must first support and test the actual historical schema.

## 6. Required Fix: Real Historical Database Compatibility

Priority: **P0 / release blocker**.

Affected files:

- `backend/src/database/migrations/002_approved_database_redesign.sql`
- `backend/src/database/migration-paths.spec.ts`
- A new committed historical schema fixture or equivalent test support file

### 6.1 Make retired-object cleanup lineage-safe

Update the PESO cleanup section so it succeeds when the objects exist in a fresh/current-initial path and when `AuthAlignmentV3` already removed them.

Required behavior:

- Use `DROP INDEX IF EXISTS` for retired indexes.
- Use `ALTER TABLE ... DROP CONSTRAINT IF EXISTS` for retired constraints.
- Use `ALTER TABLE ... DROP COLUMN IF EXISTS` for retired columns.
- Use `DROP FUNCTION IF EXISTS` and `DROP TYPE IF EXISTS` for retired routines/types.
- Use `DROP TABLE IF EXISTS` for the retired history table.
- Use `DROP TRIGGER IF EXISTS` only when its owning table is guaranteed to exist.
- For a trigger whose table may already be absent, either:
  - rely on `DROP TABLE IF EXISTS ... CASCADE`; or
  - use a catalog-aware `DO` block guarded by `to_regclass`.

Do not weaken validation of the final schema. Both input paths must converge on the same redesigned objects.

### 6.2 Replace the false historical fixture

The current test performs:

1. Current `001_initial_schema.sql`.
2. Manual insertion of an `AuthAlignmentV3` migrations-table row.
3. Redesign migration.

This tests migration metadata compatibility, not historical schema compatibility.

Replace it with a deterministic fixture that reproduces the schema after the real historical `InitialSchema` and `AuthAlignmentV3` SQL. The fixture must include the actual absence of the retired PESO objects and the authentication tables/functions created by AuthAlignment V3.

The test must:

1. Build the true historical schema.
2. Insert the real historical migration records.
3. Insert representative application data.
4. Run pending migrations through `DataSource.runMigrations()`.
5. Assert all three migration records remain present.
6. Run comprehensive final-schema validation.
7. Verify converted data, reference-seed idempotency, and forward-only behavior.

Avoid reading an old Git commit at test runtime. Commit the required historical fixture to the repository so CI is deterministic.

### 6.3 Prove the fix against a restored real database

After the corrected Testcontainers test passes:

1. Restore the saved local backup into a new disposable database.
2. Point the backend database variables at that disposable database.
3. Run `npm run migration:show`.
4. Run `npm run migration:run`.
5. Run `npm run database:validate`.
6. Inspect representative converted records.
7. Only then retry `internet_db`.

## 7. Required Fix: Frontend Candidate Contract

Priority: **P1**.

Affected files:

- `frontend/src/features/employer/services/employer.service.ts`
- `frontend/src/features/employer/types/employer.types.ts`
- `frontend/src/features/employer/pages/InternshipWorkflowPages.tsx`
- Relevant frontend API response types and tests

### 7.1 Use the actual backend response fields

The backend assignment-candidate response contains:

```text
referralId
applicationId
studentId
studentFullName
opportunityId
jobTitle
companyName
acceptanceDate
studentResponse
studentRespondedAt
internshipAssignmentId
```

The frontend currently reads `opportunityTitle` and `submittedAt`, which are not returned by this endpoint, and hardcodes `Company` instead of using `companyName`.

Define a typed API response and map:

| Backend response | Frontend field |
|---|---|
| `jobTitle` | `jobTitle` |
| `companyName` | `company` |
| `acceptanceDate` | `acceptanceDate` |
| `studentResponse` | Exhaustively mapped display state |
| `internshipAssignmentId` | Preserved for action eligibility/detail behavior |

Remove `any` from this mapping.

### 7.2 Make unknown states non-actionable

`mapStudentResponse` currently maps every value other than `accepted` or `declined` to `Pending Response`.

Required behavior:

- `pending -> Pending Response`
- `accepted -> Accepted`
- `declined -> Declined`
- null, undefined, or unknown -> explicit error/unknown state or filtered record

Unknown states must never become pending by default. Withdrawal eligibility must default to false.

### 7.3 Test the interaction

Add frontend tests covering:

- All three valid response values.
- Null and unsupported response values.
- Correct `jobTitle`, `companyName`, and `acceptanceDate` mapping.
- Withdraw button visible only for a valid pending candidate.
- Declined, accepted, unknown, assigned, and in-progress states hide or disable withdrawal.
- A backend 409 refreshes the stale candidate state and displays the server message.

## 8. Required Fix: Documentation Completion

Priority: **P1**.

### 8.1 `backend/docs/auth.md`

- Remove the duplicated table header and duplicated student row near the start.
- Remove the employee-ID file upload/storage description; the migration removes `employee_id_file_path`.
- Remove the claim that development seed data contains QC PESO verification states.
- Rename the QC PESO access section if it no longer describes multiple access states.

### 8.2 `backend/docs/dashboard.md`

- Remove `verificationStatus` from the PESO personnel list response.
- Recheck all PESO examples against the current response DTO/service mapping.
- Ensure no write example targets retired verification fields.

### 8.3 `backend/docs/employer-api.md`

- Remove the general claim that explicitly blocked operations return 503 when the migration-dependent endpoints are active.
- Remove the statement that assignment endpoint 29 is blocked.
- Confirm the documented withdrawal and deletion responses against controllers and services.

### 8.4 `docs/frontend_backend_integration_plan.md`

The historical banner is appropriate, but its links use another developer's `file:///d:/...` paths. Replace them with repository-relative links.

Either:

- archive the document and keep its stale instructions clearly historical; or
- remove the obsolete operational instructions.

At minimum, the historical banner must clearly warn readers not to implement the old 503/verification guidance and must link to usable current documents.

### 8.5 Documentation audit

Search maintained documentation for:

```text
fifth_year_college
verificationStatus
verification_status
employee_id_file_path
personnel_verification_status_enum
DB_MIGRATION_PENDING
blocked
do not call
503
file:///
```

Retain matches only when they explicitly describe historical or migration context. Correct or remove matches presented as current behavior.

## 9. Verification Already Completed

The following checks passed at `fd9955d`:

```text
npm test -- --runInBand --no-cache
Test Suites: 8 passed, 8 total
Tests:       51 passed, 51 total
```

```text
npx tsc -p tsconfig.build.json --noEmit
Passed
```

```text
npx tsc --noEmit
Passed
```

```text
npm run database:validate-reference-seeds
Reference seed validation passed
```

Important interpretation: the passing migration test does not validate the real historical schema. It is superseded by the observed failure against `internet_db` until its fixture is corrected.

Frontend verification was not run because `frontend/node_modules` was absent. Do not claim frontend build or test completion from this review.

## 10. Required Final Verification Sequence

Docker Engine is intentionally required for the default backend suite.

After implementing the fixes, run:

```powershell
cd backend
npm test -- --runInBand --no-cache
npx tsc -p tsconfig.build.json --noEmit
npx tsc --noEmit
npm run test:admin:e2e
npm run test:employer:e2e
```

Run both database paths in disposable PostgreSQL 16 databases:

1. Empty database -> current migrations -> reference seed -> reference validator.
2. True historical `InitialSchema + AuthAlignmentV3` database -> redesign -> reference seed -> schema and reference validators.

Then verify a restored copy of the real local backup before touching `internet_db`.

After the restored-copy rehearsal passes, update the local database:

```powershell
cd backend
npm run migration:show
npm run migration:run
npm run migration:show
npm run database:validate
npm run database:validate-reference-seeds
```

Expected final migration listing:

```text
[X] InitialSchema1785860400000
[X] ApprovedDatabaseRedesign1787788800000
```

The migrations table on the historical path must continue to contain `AuthAlignmentV31786125600000` as well.

Install frontend dependencies using the project's approved workflow, then run its type check/build and the new candidate-mapping tests.

## 11. Definition of Done for Re-review

- [ ] Migration 002 succeeds against the true historical `AuthAlignmentV3` schema.
- [ ] Migration 002 succeeds through TypeORM against a restored copy of the local backup.
- [ ] The real historical migration record is preserved.
- [ ] `internet_db` shows no pending migrations.
- [ ] `database:validate` passes against the upgraded local database.
- [ ] Reference and development seed validators pass only in their intended workflows.
- [ ] Candidate API mapping uses typed, correct response fields.
- [ ] Unknown candidate response values are non-actionable.
- [ ] Declined candidates never display a withdrawal action.
- [ ] Maintained documentation contains no unexplained retired-schema or blocked-feature claims.
- [ ] Repository documentation links are portable and repository-relative.
- [ ] Backend unit, Docker migration, TypeScript, and affected E2E checks pass.
- [ ] Frontend type check, build, and affected tests pass.

## 12. Safety Notes

- The redesign migration is forward-only; do not use `migration:revert` as recovery.
- Keep the verified backup until the upgraded database has passed validation and smoke testing.
- Do not delete historical migration records to make validation pass.
- Do not insert `ApprovedDatabaseRedesign1787788800000` manually.
- Do not bypass the migration with ad hoc live-schema changes.
- If another migration attempt fails, verify transaction rollback before retrying.

