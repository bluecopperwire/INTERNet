# INTERNet application-workflow bugfix handoff

Last updated: 2026-09-01 (Asia/Manila)

## Migration trigger-error follow-up

`003_application_workflow_alignment.sql` now commits the legacy rejection-remark backfill before beginning the schema-alteration transaction. This resolves PostgreSQL `55006` (`cannot ALTER TABLE referral because it has pending trigger events`) without disabling or dropping any workflow/history trigger.

The fix was applied successfully to the user's existing seeded development database. Final checks showed zero unbackfilled rejected rows, two validated remark constraints, three visibility tables, six visibility indexes, eight enabled application/referral triggers, and three aligned workflow functions. `migration:show` reports `ApplicationWorkflowAlignment1788220800000` as applied. Container testing also successfully reverted and reapplied the migration without touching the user's live database.

## Source of truth

Continue from `C:\Users\Carpicorn\Downloads\CODEX_INTERNSHIP_APPLICATION_WORKFLOW_END_TO_END_BUGFIX.md`. It is authoritative; the attached screenshots are visual references only. The final response must use the exact 14-section order in section 32 of that document.

Repository: `C:\Users\Carpicorn\Downloads\employer-side\INTERNet`

## Current state

The implementation is substantially complete. The working tree intentionally contains all changes and has not been committed. Preserve those edits. `git status --short` is the quickest inventory.

Implemented:

- Migration `003_application_workflow_alignment` with conditional rejection-remark constraints, role-scoped visibility tables, approved-application expiration, direct opportunity archival, and referral consistency rules that retain company responses on withdrawn/expired referrals.
- QC and employer Review transitions are persisted and idempotent.
- Employer interview scheduling sends the modal date/time/mode/location/link/remark payload.
- Employer rejection closes referral and application, requires a remark, and supports accepted-to-rejected only while the student's response is pending.
- Student accept/decline/withdraw transitions are transactional. Acceptance closes the chosen workflow and automatically withdraws all other active applications/referrals while retaining prior company responses.
- Opportunity archival expires all active dependent workflows in one transaction and preserves student-accepted/terminal records.
- Student, QC, employer referral, and employer assignment terminal hiding uses role-scoped visibility rather than global deletion.
- Student detail now returns referral remarks and history; UI fetches selected detail and always derives a five-stage tracker.
- Sidebar statuses, tracker wording/visual states/timestamps, action rules, rejection/interview/offer/withdraw modals, and Manila time formatting were aligned.
- Development seeds were corrected to maintain closed/response invariants and remain idempotent.

## Important files

- `backend/src/database/migrations/003_application_workflow_alignment.sql`
- `backend/src/database/migrations/003_application_workflow_alignment.down.sql`
- `backend/src/database/migrations/1788220800000-ApplicationWorkflowAlignment.ts`
- `backend/src/students/services/students.service.ts`
- `backend/src/dashboard/services/peso-dashboard.service.ts`
- `backend/src/employer/services/employer-referral.service.ts`
- `backend/src/employer/services/employer-opportunity.service.ts`
- `backend/src/employer/services/employer-internship.service.ts`
- `frontend/src/features/intern-seeker/adapters/student.adapters.ts`
- `frontend/src/features/intern-seeker/pages/ApplicationStatusPage.tsx`
- `frontend/src/features/employer/pages/ReviewApplicantPage.tsx`
- `frontend/src/features/employer/pages/InternshipWorkflowPages.tsx`
- `backend/test/employer/employer-api.e2e-spec.ts`

## Verification already completed

- Backend build: passed.
- Frontend build: passed (only the existing Vite large-chunk warning remains).
- Backend Jest unit suite: 13 suites, 66 tests passed.
- Frontend Vitest suite: 10 files, 56 tests passed.
- Employer/application E2E suite: 123 tests passed after student workflow coverage was added.
- Student profile E2E suite: 6 tests passed.
- Initial-schema validator: 13 checks passed.
- Expanded opportunity-archive test (pending, interview, accepted/student-pending, and student-accepted cases): passed.
- `git diff --check`: passed; only Git's informational LF-to-CRLF notices were printed.
- Global backend/frontend lint is not green because the repository has a large pre-existing lint backlog (including untouched files and longstanding `any`/React-effect rules). The newly isolated frontend workflow files lint clean; backend files were formatted with the repository Prettier configuration.

## Work still recommended

1. Perform a final manual browser smoke test if a local backend/database is available; automated workflow coverage is green.
2. Review and commit the working tree. No commit has been created by Codex.
3. If desired as a separate cleanup, address the repository-wide lint baseline; do not conflate that broad cleanup with this workflow fix.

## Known design decisions

- No status enum values were added; existing values are reused.
- Rejection remarks remain nullable generally and are required only for actual rejection states.
- Delete in workflow UIs means actor-scoped hide, terminal-only, idempotent, no restore UI.
- Existing assignment `deleted_at` is preserved for legacy/admin semantics; new student/employer hiding is in `internship_assignment_visibility`.
- Active workflow withdrawal/expiration preserves `company_response` for audit/display.
- Tracker rendering is centralized in `student.adapters.ts` and always emits exactly five stages.

## Suggested next commands

From `backend`:

```powershell
npm run build
npm test -- --runInBand
npm run test:employer:e2e
npm run lint:check
```

From `frontend`:

```powershell
npm run build
npm run test:run
npm run lint
```

Use targeted tests first if iteration is needed. Testcontainers/PostgreSQL makes the E2E suite relatively slow.
