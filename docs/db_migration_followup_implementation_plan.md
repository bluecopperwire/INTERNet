# Database Migration Follow-up Implementation Plan

## 1. Purpose

This plan resolves the four outstanding findings from the follow-up review of commit `2ed5791` (`bugfix: db migration issues`). It covers existing databases, fresh developer setup, frontend behavior affected by the redesigned schema, and documentation consistency.

Docker-backed migration tests are an intentional part of the normal backend test suite. This plan therefore keeps the Testcontainers tests under `npm test` and treats Docker availability as a documented development prerequisite, not a defect to remove.

## 2. Scope

The implementation must resolve:

1. Existing databases with the historical `AuthAlignmentV31786125600000` migration cannot pass the current schema validator.
2. The migration guide pairs `seed:reference` with a validator that expects development accounts.
3. A declined student response is mapped to `Pending Response`, incorrectly exposing the withdrawal action.
4. Current API, authentication, dashboard, and frontend integration documentation still describes retired schema and blocked functionality.

The implementation must not:

- Remove Docker-backed migration tests from the default backend test suite.
- Delete or rewrite migration-history rows in an existing database merely to satisfy validation.
- Reintroduce QC PESO verification columns, verification history, or `fifth_year_college`.
- Run the irreversible migration against a shared database without the documented backup, restore test, and maintenance procedure.

## 3. Target Outcomes

- A fresh database and a database whose history is `InitialSchema` plus `AuthAlignmentV3` both upgrade to the same final schema.
- `database:validate` requires the current migrations while tolerating recognized historical migrations.
- Reference-only and development seed workflows each have a matching read-only validator.
- Declined internship candidates remain declined throughout the frontend model and never receive pending-only actions.
- All maintained documentation describes the implemented schema and enabled endpoints.
- The complete Docker-backed backend suite, TypeScript checks, and affected frontend tests pass.

## 4. Workstream 1: Support Real Existing-Database Migration History

### 4.1 Capture the supported migration lineages

Treat both of the following as supported inputs:

| Database path | Migration history before redesign | Expected history after redesign |
|---|---|---|
| Fresh/current baseline | `InitialSchema1785860400000` | `InitialSchema1785860400000`, `ApprovedDatabaseRedesign1787788800000` |
| Historical auth-aligned database | `InitialSchema1785860400000`, `AuthAlignmentV31786125600000` | Existing two records plus `ApprovedDatabaseRedesign1787788800000` |

Do not delete `AuthAlignmentV31786125600000` from an existing migrations table. It is evidence of an applied historical schema change, even though that migration is no longer present in the current TypeORM source list.

Document any other known deployed migration names before coding. Unknown additional migrations must produce a warning or an explicit unsupported-lineage error according to the decision in section 4.2; they must not be silently deleted.

### 4.2 Change schema validation from exact history equality to required-history validation

Update `backend/test/database/initial-schema.validation.cjs`:

- Query migration names without assuming the table contains exactly two rows.
- Require `InitialSchema1785860400000` and `ApprovedDatabaseRedesign1787788800000` to be present exactly once.
- Permit `AuthAlignmentV31786125600000` as a recognized historical entry.
- Continue validating the final schema itself so a forged migration-history row cannot make an invalid database pass.
- Emit separate diagnostics for:
  - a required migration that is missing;
  - a required migration recorded more than once;
  - a known historical migration;
  - an unknown migration lineage.
- Keep the command read-only.

Recommended policy for unknown migration names: fail with a message requiring review. This is safer than accepting an untested schema lineage and still avoids rejecting the known `AuthAlignmentV3` path.

### 4.3 Add a true historical-lineage upgrade test

Extend `backend/src/database/migration-paths.spec.ts` or split reusable helpers into a neighboring test support module.

The new scenario must:

1. Start a PostgreSQL 16 Testcontainer.
2. Reproduce the schema after the historical `InitialSchema` and `AuthAlignmentV3` migrations.
3. Populate the TypeORM migrations table with their real names and timestamps.
4. Insert representative legacy rows for every data conversion performed by the redesign.
5. Execute the redesign through the TypeORM migration runner, not only by directly executing `002_approved_database_redesign.sql`.
6. Assert that `AuthAlignmentV3` remains recorded and `ApprovedDatabaseRedesign` is appended.
7. Run the same final-schema assertions used by the fresh path.
8. Run the schema validator against that container and require a successful result.

The historical schema fixture must be version-controlled and deterministic. It may be produced from the historical SQL, but the test must not depend on checking out an old Git commit at runtime.

Representative data must include:

- Numeric and null opportunity allowances.
- Suspended and active user accounts.
- PESO personnel and retired verification-history data.
- Attendance rows that require lunch deduction recalculation.
- Pending and terminal referrals.
- Active and terminal internship assignments.

### 4.4 Test migration-history failure cases

Add focused tests proving that validation fails when:

- `InitialSchema` is absent.
- `ApprovedDatabaseRedesign` is absent.
- A required migration appears more than once.
- An unrecognized migration is recorded, if the recommended fail-closed policy is adopted.
- Migration rows are present but a required final-schema object is missing.

### 4.5 Existing-database rollout procedure

Update the migration runbook to require:

1. Stop application writes and background jobs.
2. Record `npm run migration:show` and the full migrations-table contents.
3. Create a pre-migration backup.
4. Restore that backup into a disposable PostgreSQL instance and prove it is usable.
5. Confirm that its migration lineage matches a tested path.
6. Run `npm run migration:run` against the disposable restore first.
7. Run `npm run database:validate` against the upgraded restore.
8. Apply the same steps to the target database during the maintenance window.
9. Preserve the backup because the redesign migration is forward-only.

Acceptance criteria:

- The fresh path and historical `AuthAlignmentV3` path both pass in Testcontainers.
- The validator passes with either supported final migration history.
- The validator remains read-only and rejects missing schema objects.
- No implementation step removes legitimate historical migration records.

## 5. Workstream 2: Separate Reference and Development Seed Validation

### 5.1 Define two seed contracts

The project has two distinct workflows and must validate them independently:

| Workflow | Seed command | Required data | Prohibited assumption |
|---|---|---|---|
| Environment/reference setup | `npm run seed:reference` | Roles, statuses, locations, and other required reference records | Development login accounts exist |
| Local development/demo setup | `npm run seed:dev` | Reference data plus the documented development accounts and relationships | Suitable for production |

### 5.2 Split the validators

Create clear package scripts and read-only validators, for example:

```json
{
  "database:validate-reference-seeds": "node test/database/reference-seed.validation.cjs",
  "database:validate-dev-seeds": "node test/database/development-seed.validation.cjs"
}
```

Implementation requirements:

- Move shared database connection and assertion helpers into one test utility where practical.
- The reference validator checks only data created by `seed:reference`.
- The development validator checks the nine documented development accounts and their required related records.
- Both validators are read-only.
- Both validators provide the missing table, key, or account in their error messages.
- Keep `database:validate-seeds` only as a documented compatibility alias if existing automation uses it; define unambiguously whether it targets development seeds.

### 5.3 Correct the documented command sequences

In `backend/docs/database-migration-guide.md`, the production-safe/reference flow must be:

```powershell
npm run seed:reference
npm run database:validate-reference-seeds
```

In `backend/docs/database-setup-and-test-guide.md`, the local developer flow must be:

```powershell
npm run seed:dev
npm run database:validate-reference-seeds
npm run database:validate-dev-seeds
```

The guides must state that `seed:dev` creates known credentials and must not be used in production or shared non-development environments.

### 5.4 Test seed idempotency on both database paths

Within Docker-backed tests:

- Run `seed:reference` twice after a fresh migration and compare stable keys and row counts.
- Run it twice after the historical upgrade path.
- Run `seed:dev` twice in a dedicated development database.
- Run the matching validator after each scenario.
- Assert that reference seeding does not create development accounts.

Acceptance criteria:

- Every documented seed command is followed by a validator that matches what it creates.
- Reference-only validation succeeds without development accounts.
- Development validation fails clearly if any expected development account is missing.
- Repeated seed execution does not duplicate records.

## 6. Workstream 3: Preserve Declined Student Responses in the Frontend

### 6.1 Make the response model exhaustive

Update the relevant frontend types so the API and display models represent all supported values:

```text
API: pending | accepted | declined
UI: Pending Response | Accepted | Declined
```

Do not use a binary conditional or a default branch that converts an unknown value to pending. Use an exhaustive mapper that either returns the corresponding status or fails visibly for an unsupported backend value.

### 6.2 Correct candidate mapping

Update `frontend/src/features/employer/services/employer.service.ts` so:

- `pending` maps to `Pending Response`.
- `accepted` maps to `Accepted`.
- `declined` maps to `Declined`.
- Null or unexpected responses are handled according to the backend contract and never become actionable pending responses accidentally.

If the product does not want declined candidates in an actionable list, filter them into a declined/history section after preserving their real state. Do not falsify their status to obtain that UI behavior.

### 6.3 Centralize action eligibility

Create or reuse a single predicate for withdrawal eligibility. The action is available only when all backend preconditions are represented in the UI state:

- Employer referral status is accepted.
- Student response is pending.
- No internship assignment exists.
- No withdrawal request is already in progress.

Use the same predicate to control button visibility and the action handler. The handler must still display a backend 409 response because state can change between loading and clicking.

### 6.4 Add frontend regression coverage

Add service/store tests for mapping all three API values and component tests for action visibility:

| Student response | Display | Withdraw action |
|---|---|---|
| `pending` | Pending Response | Visible only when all other preconditions pass |
| `accepted` | Accepted | Hidden |
| `declined` | Declined | Hidden |
| unknown/null | Explicit safe state or error | Hidden |

Also test a stale pending screen receiving a 409 from the backend: the UI must show the conflict and refresh candidate state.

Acceptance criteria:

- A declined response is never displayed as pending.
- A declined candidate never receives a Withdraw button.
- Pending withdrawal still succeeds through the real API integration.
- Frontend type-checking prevents future unhandled response values.

## 7. Workstream 4: Reconcile Maintained Documentation with the Implemented System

### 7.1 Classify documentation before editing

Classify each document as either:

- **Current operational/API documentation:** must describe the current implementation.
- **Historical plan/report:** retain historical content only with a prominent status banner, replacement link, and date/commit context.

Do not leave a historical document looking like current operating guidance.

### 7.2 Correct known stale documents

Review and update at least:

- `backend/docs/auth.md`
- `backend/docs/dashboard.md`
- `backend/docs/employer-api.md`
- `backend/docs/admin-api.md`
- `backend/docs/database-migration-guide.md`
- `backend/docs/database-setup-and-test-guide.md`
- `docs/frontend_backend_integration_plan.md`
- Any maintained document found by the terminology audit in section 7.4.

Required corrections:

- Remove QC PESO approval/verification gates and fields that were dropped from the schema.
- Remove writes to retired PESO verification columns and references to the dropped history table/type.
- State that `company_logo_url` is nullable.
- Remove `fifth_year_college` from current API and setup guidance.
- Describe allowance as nullable free text and treat `has_allowance` only as a compatibility/view-derived value where applicable.
- Document `accepted -> rejected` withdrawal behavior and its conflict conditions.
- Document internship assignment soft deletion and visibility behavior.
- Mark formerly blocked Employer/Admin endpoints as active.
- Add the withdrawal endpoint to Employer API documentation.
- Remove instructions telling the frontend not to call endpoints that are now implemented.
- Use exact migration, function, view, constraint, index, and table names from executable SQL.

### 7.3 Keep API examples executable

For each changed endpoint example:

- Match current DTO property names and enum values.
- Remove retired response fields.
- Show realistic success and conflict responses.
- Confirm route parameters and HTTP methods against controllers.
- Link to the migration guide when behavior requires the redesigned schema.

### 7.4 Run a stale-terminology audit

Search maintained documentation for at least:

```text
fifth_year_college
is_peso_verified
peso_verified_at
peso_verified_by
peso_personnel_verification_history
has_allowance
DB_MIGRATION_PENDING
blocked endpoint
do not call
503
```

Every match must be one of:

- Removed because it is obsolete.
- Corrected to current behavior.
- Deliberately retained in a historical or migration-context section with an explicit explanation.

### 7.5 Add documentation verification to review

The documentation review must compare examples and schema claims directly with:

- TypeORM migration wrappers and SQL files.
- Backend controllers and DTOs.
- Frontend API methods and types.
- Package scripts used in setup and migration guides.

Acceptance criteria:

- No maintained guide describes retired PESO verification behavior or `fifth_year_college` as active.
- All documented commands exist in `backend/package.json` and work in the stated environment.
- Employer API documentation includes the enabled delete and withdrawal operations.
- Historical plans cannot be mistaken for current instructions.

## 8. Implementation Order and Ownership Boundaries

Implement in this order:

1. Define supported database lineages and validator policy.
2. Add the historical-lineage Docker test and correct schema validation.
3. Split seed validators and update both database guides.
4. Correct frontend response typing, mapping, eligibility, and tests.
5. Complete the documentation audit after code and command names are final.
6. Execute the complete release verification matrix.

Database and documentation work should land together because the migration guide depends on the final validator and script names. Frontend code and its API documentation should also be reviewed together.

## 9. Verification Matrix

Run from `backend/` unless otherwise stated. Docker Engine must be running because the migration tests intentionally use disposable PostgreSQL databases.

| Verification | Required result |
|---|---|
| `npm test -- --runInBand --no-cache` | All unit and Docker-backed migration suites pass |
| `npx tsc -p tsconfig.build.json --noEmit` | Production backend sources type-check |
| `npx tsc --noEmit` | Backend source and tests type-check |
| Fresh database -> migrations -> reference seed -> reference validator | Passes |
| Historical `AuthAlignmentV3` database -> redesign -> reference seed -> validators | Passes and preserves historical migration row |
| Development seed twice -> development validator | Passes without duplicates |
| `npm run test:admin:e2e` | Affected Admin workflows pass |
| `npm run test:employer:e2e` | Withdrawal and assignment deletion pass |
| Frontend type-check and production build | Passes |
| Frontend response-mapping and action-visibility tests | All response states pass |
| Documentation terminology audit | No unexplained stale current-behavior matches |

Manual smoke tests must cover:

- Fresh developer setup by following the setup guide verbatim.
- Upgrade of a restored historical database by following the migration guide verbatim.
- Employer viewing pending, accepted, and declined candidates.
- Withdrawal success for a truly pending response.
- Withdrawal conflict after a student response changes.
- Admin and Employer routes that were previously reported as migration-blocked.

## 10. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Historical schema differs from the synthetic upgrade fixture | Derive a committed fixture from the real historical migrations and test through TypeORM |
| Validator accepts a migration row but misses schema drift | Keep comprehensive catalog assertions independent of migration history |
| Unknown deployed migration lineages are accepted accidentally | Fail closed with an actionable unsupported-lineage message |
| Development credentials reach production | Separate commands, validators, and explicit environment warnings |
| New backend response value becomes actionable by default | Use exhaustive frontend mapping and default-deny action eligibility |
| Documentation diverges again | Verify docs against controllers, DTOs, SQL, types, and package scripts in the same review |
| Irreversible migration fails after partial application | Use maintenance mode, verified backup restore, disposable rehearsal, and forward-only recovery procedures |

## 11. Definition of Done

- [ ] A Testcontainer test reproduces and upgrades `InitialSchema + AuthAlignmentV3` migration history.
- [ ] The historical migration record is preserved after upgrade.
- [ ] `database:validate` passes for both supported final histories and remains read-only.
- [ ] Missing required or unknown migration lineages fail with actionable diagnostics.
- [ ] Reference and development seeds have distinct validators and documented commands.
- [ ] Both seed paths are idempotent and covered on the applicable database paths.
- [ ] Declined student responses remain declined through API mapping, store state, and rendering.
- [ ] Withdrawal eligibility is default-deny and has coverage for pending, accepted, declined, and stale states.
- [ ] Maintained documentation contains no unexplained retired schema or blocked-feature guidance.
- [ ] The database setup and migration guides work verbatim.
- [ ] The complete Docker-backed backend suite passes.
- [ ] Backend and frontend type checks, affected tests, and production builds pass.
- [ ] A backup restore and historical upgrade rehearsal is completed before any shared database is migrated.

## 12. Evidence Required for Final Review

Attach:

- Full `npm test` output showing fresh and historical migration-path coverage.
- Before/after migration-history output from the historical upgrade test.
- Successful schema-validator output for both supported lineages.
- Reference-only and development seed-validator output, including seed-twice evidence.
- Frontend tests covering all student response mappings and withdrawal visibility.
- Backend E2E evidence for withdrawal conflicts and assignment soft deletion.
- The documentation terminology-audit results and reviewer disposition for every retained match.
- Backup restore and disposable upgrade rehearsal evidence using non-sensitive identifiers.

