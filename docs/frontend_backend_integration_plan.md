# Frontend-to-Backend Integration Plan

> [!NOTE]
> **Historical Plan Notice**:
> This document is a historical integration plan created during early development.
> For current database architecture and migration procedures, refer to [database-migration-guide.md](file:///d:/files/Online%20Classes/College/3rd%20Year/Summer/INTERNet/backend/docs/database-migration-guide.md).
> For current backend endpoints, see [auth.md](file:///d:/files/Online%20Classes/College/3rd%20Year/Summer/INTERNet/backend/docs/auth.md), [employer-api.md](file:///d:/files/Online%20Classes/College/3rd%20Year/Summer/INTERNet/backend/docs/employer-api.md), [admin-api.md](file:///d:/files/Online%20Classes/College/3rd%20Year/Summer/INTERNet/backend/docs/admin-api.md), and [dashboard.md](file:///d:/files/Online%20Classes/College/3rd%20Year/Summer/INTERNet/backend/docs/dashboard.md).

> Repository-specific implementation plan for Antigravity. This plan was derived from the current controllers, DTOs, services, frontend routes, feature services, and `Project_Memory.md`, not from the mock data alone.

## 1. Executive Summary & Integration Strategy

### 1.1 Target outcome

Replace the frontend's in-memory mock services with typed calls to the existing NestJS API, move shared server state into Zustand stores, protect routes by the authenticated backend role, and keep all display formatting inside frontend adapters. The implementation must preserve the existing PostgreSQL schema exactly.

The integration must follow these non-negotiable rules:

- Do not create, edit, run, or generate a database migration.
- Do not add columns, tables, enum members, constraints, triggers, or views.
- Read existing data through the current tables and views, especially `vw_application_details`, `vw_referral_details`, `vw_attendance_summary`, `vw_student_profile_details`, `vw_opportunity_summary`, and `vw_internship_assignment_details`.
- Reuse implemented routes before adding a route. The small backend gaps listed in Section 3 are the only additions proposed by this plan.
- Do not implement a PESO referral creation, endorsement, dispatch, approval-for-referral, rejection-for-referral, or referral-processing mutation. PESO may only monitor applications/referrals in this scope.
- Never keep mock fallback data in a production code path. Loading, empty, error, and unsupported states must be explicit.
- Preserve backend enum values in API/store state. Convert values such as `under_review` to presentation labels only in view-model adapters.

### 1.2 Repository facts that drive the design

- The backend has no global `/api` prefix. Development requests target `http://localhost:3000`, for example `/auth/login` and `/dashboard/peso/students/metrics`.
- CORS already allows `http://localhost:5173` and credentials.
- The access token is returned in JSON. The refresh token is an HttpOnly cookie scoped to `/auth`; JavaScript must never attempt to read or persist it.
- Successful backend responses are intentionally mixed: a single raw object, an array, `{ data, meta }`, `{ data, summary, meta }`, or `{ message }`. Do not assume a universal server envelope.
- Error responses use Nest's shape: `{ statusCode, message, error? }`, where `message` may be a string or a validation-message array. Some blocked functions also return `code` and `dependency` with HTTP 503.
- IDs have different meanings. Student endpoints take `studentId`; `/dashboard/admin/*` takes `userAccountId`; `/admin/students/*`, `/admin/employers/*`, and `/admin/qc-peso/*` take their role-profile IDs; employer workflow pages take `referralId` or `internshipAssignmentId`.
- The frontend currently depends on Axios and Zustand but has no centralized API client or Zustand store. Feature services are mock-backed.
- The richer existing `/employer/*` and `/admin/*` APIs supplement the dashboard endpoints documented in `Project_Memory.md`. Use the actual controller contracts as the source of truth.

### 1.3 API client architecture

Create one Axios instance in `frontend/src/services/api.ts`:

```ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout: 15_000,
  headers: { Accept: 'application/json' },
})
```

Create `frontend/.env.development`:

```dotenv
VITE_API_BASE_URL=http://localhost:3000
```

Do not append `/api`; no such prefix exists. Do not set `Content-Type` globally because browser-generated multipart boundaries are required for requirement and logo uploads.

Request interceptor behavior:

1. Read the current access token through a small auth-session bridge registered by `useAuthStore`.
2. Add `Authorization: Bearer <accessToken>` only when a token exists.
3. Leave `withCredentials: true` enabled so `/auth/refresh`, Google exchange, and logout can use cookies.
4. Pass an `AbortSignal` from page/store loads so superseded searches and unmounted pages can cancel requests.

Response interceptor behavior:

1. Return `response.data` only in service methods; the interceptor itself should retain the complete Axios response.
2. On a first HTTP 401 from a protected endpoint, start one shared `POST /auth/refresh` request. Queue all other failed requests behind the same promise.
3. Do not attempt refresh for `/auth/login`, `/auth/signup`, `/auth/refresh`, `/auth/google/exchange`, or requests already marked `_retry`.
4. On refresh success, update the access token in `useAuthStore`, replace the failed request's Bearer token, and replay it once.
5. On refresh failure, reject the queue, clear auth state, and navigate to `/?reason=session-expired&returnTo=<encoded-path>` through the route/auth bridge.
6. On HTTP 403, keep the session but show a permission toast or role-safe page. Never treat 403 as token expiry.
7. On HTTP 429, show the backend throttle message and retain form values.
8. On network failure, expose a retryable `ApiError` with `statusCode: 0`; do not log the user out.

Avoid an import cycle between `api.ts` and `useAuthStore.ts`. `api.ts` should export `configureApiAuth({ getAccessToken, setAccessToken, onUnauthorized })`; `main.tsx` or the auth store bootstrap registers those callbacks once.

### 1.4 Token storage and authentication persistence

- Keep the short-lived access token in Zustand memory and mirror it only in `sessionStorage` under a versioned key such as `internet.auth.access.v1`. Do not store it in `localStorage`.
- Never store the refresh token. Its HttpOnly cookie is the durable session credential.
- Persist only non-secret auth metadata (`user`, selected login tab, and an optional remembered email). On application startup, set `authStatus = 'bootstrapping'`, call `/auth/refresh`, then `/auth/me`. A missing/expired refresh cookie resolves to anonymous state without an error toast on public routes.
- Treat the login form's role tab as an expected role, not a credential. Send only `{ email, password }`; global validation rejects unknown `role` and `rememberMe` fields. After `/auth/me`, compare the actual role to the selected tab. If they differ, call logout and show a role-mismatch error.
- Map frontend roles as follows: `intern-seeker -> student`, `company -> company`, `qcpeso -> peso_personnel`, `admin -> admin`.
- Use `/auth/me` as the authority for account status and PESO verification state. Do not trust decoded JWT claims for authorization decisions.
- Logout calls `POST /auth/logout` before local state is cleared. If it fails due to an already-expired session, clear local state anyway.

### 1.5 Protected-route synchronization

Add route guards around each layout:

| Frontend route | Backend role | Additional rule | Default destination |
|---|---|---|---|
| `/intern-seeker/*` | `student` | active account | `/intern-seeker` |
| `/employer/*` | `company` | active account | `/employer/dashboard` |
| `/qcpeso/*` | `peso_personnel` | `verificationStatus === 'approved'` for operational pages | `/qcpeso/dashboard` |
| `/admin/*` | `admin` | active account | `/admin/dashboard` |

While auth is bootstrapping, render a full-page loading state instead of redirecting. Anonymous users are redirected to login with `returnTo`. Authenticated users who visit `/` are redirected to their role home. Pending/rejected PESO users may access a verification gate powered by `GET /users/peso/verification-status`, but not operational dashboard routes.

### 1.6 Standardized client response and error policy

Do not perform a broad backend envelope rewrite. Standardize at the frontend boundary:

- Item/metrics services return the exact typed response object.
- Page services return `PaginatedResponse<T>` or `AdminListResponse<T>`.
- Mutation services return the exact updated resource or `MessageResponse`.
- Adapter functions convert API DTOs to the existing UI view models.
- Stores keep raw enums and numeric IDs; components receive formatted labels and date strings through selectors/adapters.

Use a single `normalizeApiError(error)` function. It must preserve:

```ts
interface ApiError {
  statusCode: number
  message: string
  validationMessages: string[]
  code?: string
  dependency?: string
  retryable: boolean
}
```

Error display rules:

- Field-level HTTP 400 messages are attached to the relevant input when a property name can be parsed; all remaining messages appear in a form summary.
- HTTP 409 remains inline because it represents a workflow conflict or duplicate record.
- HTTP 401 is handled centrally by refresh/redirect, not duplicated as a page toast.
- HTTP 403 and 404 use an inline page state for full-page reads and a toast for button mutations.
- HTTP 413/415 upload failures remain beside the file input.
- HTTP 503 with `DB_MIGRATION_PENDING` is an explicit unavailable state. Do not optimistically update the UI.
- Unexpected/network errors produce a global error toast and retain user input.
- Successful create/update/close/archive/accept/reject/attendance actions produce one success toast from the action owner, not both service and component.

Implement a small Zustand toast store and `ToastViewport`; no new UI notification dependency is required.

---

## 2. Domain-by-Domain Integration Matrix

## Phase 1: Core API Client & Authentication Layer

| UI capability | Existing backend route | Store/service action | Integration details |
|---|---|---|---|
| Local login | `POST /auth/login` | `useAuthStore.login` | Send only email/password; then call `/auth/me`; validate selected role; redirect by actual role. |
| Student signup | `POST /auth/signup` | `useAuthStore.registerStudent` | Map `streetAddress -> addressLine`, `barangay -> addressBarangay`, `district -> addressDistrict`, `city -> addressCity`, and `inquiryChannel -> inquiryMethod`; omit `role` and `confirmPassword`. |
| Refresh | `POST /auth/refresh` | Axios refresh queue | Empty body, `withCredentials: true`; rotate cookie and replace access token. |
| Current account | `GET /auth/me` | `useAuthStore.loadMe` | Use role, status, verification status, and the additive role-profile IDs described in Section 3. |
| Logout | `POST /auth/logout` | `useAuthStore.logout` | Revoke current token family and clear cookie/state. |
| Logout all | `POST /auth/logout-all` | `useAuthStore.logoutAll` | Expose in settings only after confirmation. |
| Google login | `GET /auth/google` then `POST /auth/google/exchange` | `startGoogleLogin`, `exchangeGoogleLogin` | Full-page navigation to backend; callback page exchanges one-time cookie, loads `/auth/me`, and redirects. |
| Google signup | `GET /auth/google/signup` then `POST /auth/google/signup/complete` | `startGoogleSignup`, `completeGoogleSignup` | Add route expected by backend: `/register/student/profile?source=google`; send profile fields only. |
| Password change | `PATCH /auth/password` | `authService.changePassword` | Send `{ currentPassword, password }`; never persist form fields. |
| PESO verification | `GET /users/peso/verification-status`; correction/resubmit routes | `useAuthStore.loadPesoVerification` | Gate operational routes. Rejected corrections are supported; referral processing is unrelated and remains excluded. |

Authentication acceptance criteria:

- A reload with a valid refresh cookie restores the session without showing login.
- A reload without a refresh cookie resolves to anonymous without a refresh loop.
- A burst of 401 responses creates exactly one refresh request.
- A student token cannot render employer/PESO/admin layouts even if a URL is entered manually.
- A role-tab mismatch signs out the newly authenticated session and explains the mismatch.

## Phase 2: Intern-Seeker / Student Module

| Frontend surface | Backend source | Store action | Adapter/UI behavior |
|---|---|---|---|
| Portal and internship search | **Gap:** `GET /opportunities` | `useStudentStore.fetchOpportunities(filters)` | Read `vw_opportunity_summary`; server-side query/work-arrangement/company/allowance/page filters; only active/open/non-expired records for students. |
| Opportunity details | **Gap:** `GET /opportunities/:opportunityId` | `useStudentStore.fetchOpportunity` | Preserve numeric ID; format work arrangement and dates only in the adapter. |
| Apply | `POST /students/:studentId/applications` | `useStudentStore.submitApplication` | Send `{ opportunityId, remark? }`; on 201 mark the card applied and refetch applications. Surface resume-required 400 next to the Apply button. |
| Profile read | `GET /students/:studentId/profile` | `useStudentStore.fetchProfile` | Map the backend's snake_case raw rows to the current `UserProfile` view model. |
| Profile save | `POST /students/:studentId/profile` | `useStudentStore.saveProfile` | Send exact nested DTO and lowercase enum values. The route is POST even for updates. |
| Industry choices | **Gap:** `GET /reference/industries` | `useReferenceStore.fetchIndustries` | Use database IDs; never hardcode seed IDs from display order. |
| Resume/read requirements | `GET /students/:studentId/resume`; `GET /students/:studentId/requirements` | `useStudentTrackingStore.fetchRequirements` | Treat resume 404 as an empty resume state, not a page failure. Build absolute download URLs from `VITE_API_BASE_URL + requirement_file_path`. |
| Requirement upload/replace | `POST /students/:studentId/requirements` | `useStudentTrackingStore.uploadRequirement` | Use `FormData` fields `file`, `requirementType`, `requirementName`; do not set multipart content type manually. Existing POST replaces the same type. |
| Application list/status | `GET /students/:studentId/applications`; `GET /students/:studentId/applications/:applicationId/status` | `fetchApplications`, `fetchApplicationStatus` | List loads cards; detail status builds the five-step tracker from application/referral/interview/student-response state and timeline. |
| Student offer response | `PATCH /students/:studentId/applications/:applicationId/response` | `respondToOffer` | UI `accept/reject` maps to API `accepted/declined`. Only show when company response is `accepted` and student response is `pending`. |
| Withdraw application | `POST /students/:studentId/applications/:applicationId/withdraw` | `withdrawApplication` | Only show for submitted/under-review/approved-for-referral states. Refetch the authoritative record after success. |
| Attendance dashboard/history | **Gap:** `GET /students/:studentId/attendance` | `fetchAttendanceMonth` | Return current assignment, today's row, summary, and range rows from existing assignment/attendance views and tables. |
| Time in/out | `POST /students/:studentId/dtr/time-in`; `POST /students/:studentId/dtr/time-out` | `clockIn`, `clockOut` | Send only `internshipAssignmentId`; let the server choose current time. Disable duplicate actions while pending; refetch attendance after success. |

Student-specific constraints:

- Remove the mock-only “Delete Application” operation. Rejected and withdrawn applications are audit history and have no delete endpoint.
- Remove or disable the requirement trash action. Uploading the same requirement type is the supported replacement workflow; no delete endpoint is proposed because deletion is not critical to integration.
- Hide/disable “Withdraw Internship.” There is no student assignment-withdrawal endpoint in the current backend and it is not required for the listed integration objective.
- Do not infer absences solely in the browser when the proposed attendance read returns server-authoritative rows.
- File pre-validation must match backend upload configuration rather than the mock's 10 MiB assumption. Keep the frontend limit synchronized with `requirement-upload.config.ts`.

## Phase 3: QC-PESO Personnel Dashboard

| Frontend surface | Existing backend route | Store action | Integration details |
|---|---|---|---|
| Main counters | `GET /dashboard/peso/students/metrics` | `fetchDashboardMetrics` | Use `totalPendingApplications`, `totalActiveEmployers`, and `totalAvailableOpportunities`. Do not label `totalVerifiedRequirements = 0` as a real verified count; the schema has no verification status. Render “Not tracked” or remove that card. |
| Application counters/list | `GET /dashboard/peso/applications/metrics`; `GET /dashboard/peso/applications` | `fetchApplicationMetrics`, `fetchApplications` | Pass date/status/page/limit as query params. Use the actual metric fields `pendingApplications`, `verifiedRequirements`, `rejectedSubmissions`. |
| Application detail | **Gap:** `GET /dashboard/peso/applications/:applicationId` | `fetchApplicationDetail` | Read-only aggregation using `vw_application_details`, `vw_student_profile_details`, and requirement submissions. No approve/reject/endorse action. |
| Employer oversight | `GET /dashboard/peso/employers/metrics`; `GET /dashboard/peso/employers` | `fetchEmployerMetrics`, `fetchEmployers` | Use backend pagination and account status. Convert bigint `activeOpportunityCount` to number in the adapter. |
| Employer detail | **Gap:** `GET /dashboard/peso/employers/:companyId` | `fetchEmployerDetail` | Read existing company, account, and industry fields only. |
| Student monitoring | **Gap:** `GET /dashboard/peso/students`; `GET /dashboard/peso/students/:studentId` | `fetchStudents`, `fetchStudentDetail` | Read-only list/detail from `vw_student_profile_details`; no account-status mutation for PESO. |
| Referral monitoring | `GET /dashboard/peso/referrals` | `fetchReferrals` | Filter by `companyResponse`, not a non-existent `status` query property. Display only. |
| Referral detail | **Gap:** `GET /dashboard/peso/referrals/:referralId` | `fetchReferralDetail` | Read `vw_referral_details`; expose interview/location/meeting data already in the view. No referral mutation. |
| Intern summary | `GET /dashboard/peso/interns`; `GET /dashboard/peso/interns/metrics` | `fetchInterns`, `fetchInternMetrics` | Use `internshipAssignmentId` as the detail key; parse numeric strings before calculations. |
| Internship detail | **Gap:** `GET /dashboard/peso/interns/:internshipAssignmentId` | `fetchInternDetail` | Read-only assignment schedule from `vw_internship_assignment_details` plus summary from `vw_attendance_summary`. |
| DTR list/detail | `GET /dashboard/peso/attendance`; `GET /dashboard/peso/attendance/assignments/:assignmentId` | `fetchAttendance`, `fetchAttendanceDetail` | Use date filters and backend pagination. Do not fabricate absent rows or remarks. |
| PESO self profile | **Gap:** `GET/PATCH /users/peso/profile` | `fetchOwnProfile`, `updateOwnProfile` | Operate on the authenticated `userAccountId`; exclude verification fields, employee-ID document, and role/account fields from PATCH. |
| Reports/documents | Existing read lists above | `exportCurrentReport` | Export already loaded/read-only data to client-side CSV/print. Do not add backup/report-file tables or endpoints. |

PESO referral exclusion:

- Remove `updateReviewApplicantStatus` from `qcpeso.service.ts`.
- Remove or disable Accept, Reject, Verify, Endorse, Create Referral, Dispatch, and similar buttons in `StudentReviewModal.tsx` and `ApplicantManagementPages.tsx`.
- `TrackReferralsPage` and referral details remain valid as read-only monitoring.
- Do not call employer referral decision endpoints with a PESO token.
- Hide the PESO “Create Employer” navigation and route. Company provisioning is an Admin action in the current authorization model.

## Phase 4: Employer Dashboard

| Frontend surface | Existing backend route | Store action | Integration details |
|---|---|---|---|
| Company dashboard counters | `GET /dashboard/employer/metrics` | `fetchDashboard` | Derive acceptance percentages client-side from `acceptedCount`, `rejectedCount`, and `totalApplicants`; do not expect `companyName` in this response. Load profile in parallel for the name. |
| Company profile | `GET/PATCH /employer/profile`; `PUT /employer/profile/image` | `fetchProfile`, `updateProfile`, `replaceLogo` | API fields are camelCase; adapt to existing form names or convert the form to camelCase. Image field must be named `image`. |
| Opportunity list/detail | `GET /employer/opportunities`; `GET /employer/opportunities/:opportunityId` | `fetchOpportunities`, `fetchOpportunity` | Backend pagination defaults to 7. Use raw enum filters `open/closed/archived`. |
| Create/edit opportunity | Existing `POST/PATCH /employer/opportunities` require compatibility completion described in Section 3 | `createOpportunity`, `updateOpportunity` | Under the zero-schema rule, use existing `has_allowance` and numeric `allowance`; change UI to amount-only PHP and do not promise a period/unit. |
| Close/archive | `PATCH /employer/opportunities/:id/close`; `DELETE /employer/opportunities/:id` | `closeOpportunity`, `archiveOpportunity` | “Delete” in the UI must say “Archive”; never remove a record optimistically before server success. |
| Applicants by opportunity | `GET /employer/opportunities/:id/referrals` | `fetchOpportunityReferrals` | The backend applicant count is referral count. Route/detail IDs are `referralId`, not raw application IDs. |
| Applicant pipeline | `GET /employer/referrals`; `GET /employer/referrals/:referralId` | `fetchReferrals`, `fetchReferral` | Use server search/company-response filters and pagination. |
| Accept/reject/interview | `PATCH .../accept`; `PATCH .../reject`; `PUT .../interview` | `acceptReferral`, `rejectReferral`, `scheduleInterview` | Send exact interview DTO and respect 409 workflow conflicts. Student acceptance remains a separate student action. |
| Applicant document | `GET /employer/referrals/:referralId/documents/:documentId/download` | `downloadReferralDocument` | Request `responseType: 'blob'`; use server filename when present; revoke temporary object URLs. |
| Assignment candidates | `GET /employer/internship-assignment-candidates` | `fetchAssignmentCandidates` | Filter by raw `studentResponse`; only employer-accepted referrals appear. |
| Create assignment | `POST /employer/referrals/:referralId/internship-assignment` | `createAssignment` | Send six schedule fields only; company/job title are server-derived and forbidden in the request. |
| Manage assignments | `GET /employer/internships/summary`; `GET /employer/internships`; `GET/PATCH /employer/internships/:id` | `fetchInternships`, `fetchInternship`, `updateInternship` | Use `displayStatus` for text but `assignmentStatus` for decisions. Edit only when `canEdit`. |
| Cancel/complete | `PATCH .../:id/cancel`; `PATCH .../:id/complete` | `cancelInternship`, `completeInternship` | Honor backend `canCancel/canComplete`; handle 409 without local status guessing. |
| Attendance summary/list | `GET /employer/attendance/summary`; `GET /employer/attendance` | `fetchAttendanceSummary`, `fetchAttendance` | Use `date=YYYY-MM-DD` and server status/search/page filters. Prefer these newer routes over the less detailed legacy dashboard attendance list. |
| Attendance history | `GET /employer/internships/:assignmentId/attendance` | `fetchAttendanceHistory` | Update route params from `applicantId` to `internshipAssignmentId`. |
| Reports | `GET /dashboard/employer/reports` | `fetchReport` | Render totals for the chosen range. Existing API does not return a daily timeline; remove mock-only timeline claims or derive a clearly labelled client view from already fetched referral data. |

Employer blocked-operation policy:

- Do not call `PATCH /employer/referrals/:id/withdraw-acceptance` because it intentionally returns DB-EMP-002/503.
- Do not call `DELETE /employer/internships/:id` because it intentionally returns DB-EMP-003/503. Hide the delete-record button; terminal records remain history.
- Do not implement DB-EMP-001 through a migration. Complete POST/PATCH using the existing numeric allowance columns as described in Section 3, or leave create/edit visibly unavailable until that compatibility change is merged.

## Phase 5: Admin & User Management

Use the richer `/admin/*` list/detail/profile routes and the completed `/dashboard/admin/*` metrics/status-capable routes deliberately; do not mix their identifier types.

| Frontend surface | Existing backend route | Store action | Integration details |
|---|---|---|---|
| Student metrics | `GET /dashboard/admin/students/metrics` | `fetchMetrics('students')` | Response: total, active, deactivated. Note that current implementation excludes soft-deleted archived rows; do not reinterpret it as lifetime registrations. |
| Student list/detail/edit | `GET /admin/students`; `GET/PATCH /admin/students/:studentId` | `fetchStudents`, `fetchStudent`, `updateStudent` | Use server search/status/pagination and returned `summary`; route param is `studentId`. |
| Employer metrics | `GET /dashboard/admin/employers/metrics` | `fetchMetrics('employers')` | Same metric contract. |
| Employer list/detail/edit | `GET /admin/employers`; `GET/PATCH /admin/employers/:companyId` | `fetchEmployers`, `fetchEmployer`, `updateEmployer` | Route param is `companyId`; use `industryId` from reference service. |
| PESO metrics | `GET /dashboard/admin/peso-personnel/metrics` | `fetchMetrics('peso')` | Keep verification metrics separate from account metrics. |
| PESO list/detail/edit | `GET /admin/qc-peso`; `GET/PATCH /admin/qc-peso/:pesoPersonnelId` | `fetchPesoUsers`, `fetchPesoUser`, `updatePesoUser` | Route param is `pesoPersonnelId`. For verification approval/rejection use the existing `/users/admin/peso-verifications/*` routes or dashboard patch, not the profile PATCH. |
| Account status | `PATCH /dashboard/admin/{students|employers|peso-personnel}/:userAccountId` | `setAccountStatus` | Send `{ accountStatus: 'active' | 'suspended' | 'archived' }`; remove mock timed-suspension days because there is no `suspended_until` column. Keep `userAccountId` on every list row. |
| Create PESO | `POST /users/peso-personnel` | `createPesoUser` | Existing route requires complete data and employee-ID base64/mime/name. Admin-created account starts approved. |
| Create employer | `POST /users/companies`, with safe logo-input compatibility change in Section 3 | `createEmployer` | Do not pass a fake `logoFilePath`. Upload/store an actual logo or keep the create form unavailable. |
| Admin settings | `PATCH /auth/password`; `POST /auth/logout-all` | Auth service actions | Replace mock success-only settings behavior. |

Admin non-core screens:

- `AuditLogsPage.tsx`, notification feeds, and `BackupsMaintenancePage.tsx` have no safe API in the repository. They are not necessary for account integration and must not remain mock-backed while presented as real.
- Hide their navigation/routes behind a disabled feature flag or render a clear “Backend capability not available” page.
- Do not add backup, cache-clear, database-optimize, audit export, or notification endpoints as part of this integration plan.
- Student accounts are self-created through signup; Admin has no create-student endpoint. Do not show an Admin create-student action.
- Use archive, never physical delete, for account removal.

---

## 3. Backend Gap Analysis

### 3.1 Existing endpoints that are sufficient

No new endpoint is needed for:

- Local/Google authentication, refresh, logout, current-account checks, and password changes.
- Student registration, profile read/update, requirements upload/read, application creation/tracking/response/withdrawal, or attendance clock mutations.
- PESO dashboard counters, paginated application/referral/employer monitoring, intern summaries, and DTR list/detail.
- Employer self-profile, logo update, opportunity reads/close/archive, referral decisions/interviews/documents, assignment workflow, attendance reads, internship management, and report totals.
- Admin account metrics, list/detail/edit, account-status transitions, PESO verification, and PESO account creation.

### 3.2 Strictly necessary additive reads/context

These additions are necessary to remove critical mock data without changing the database. Every query must be covered by role/ownership tests.

1. **Add role-profile IDs to `GET /auth/me` (response-only change, not a new endpoint).**
   - Add nullable `studentId`, `companyId`, and `pesoPersonnelId` fields.
   - Resolve them from existing role tables by `user_account_id`.
   - Reason: student APIs require `studentId`, but the current token and `/auth/me` expose only `userAccountId`.

2. **Enforce approved PESO status on operational APIs (guard-only change, not a new endpoint).**
   - Add a reusable `PesoApprovedGuard` that checks the already loaded `CurrentUser.verificationStatus` and returns 403 unless it is `approved`.
   - Apply it to `/dashboard/peso/*` and PESO access to the shared opportunity catalog.
   - Do not apply it to authentication, refresh/logout, own-profile, verification-status, rejected-correction, or resubmit routes.
   - Reason: the current `RolesGuard` verifies `peso_personnel` role only; a frontend-only verification gate is not a security boundary.

3. **Add `GET /reference/industries`.**
   - Roles: any authenticated active account.
   - Response: `{ industryId, industryName, isCustomText }[]`, ordered by name.
   - Reason: student preferences and Admin/company forms need stable IDs; hardcoding development-seed IDs is unsafe.

4. **Add `GET /opportunities` and `GET /opportunities/:opportunityId`.**
   - Roles: `student`, `peso_personnel`; PESO verification must be approved for operational access.
   - Source: `vw_opportunity_summary` only, plus an `EXISTS` application check for the calling student.
   - Student list rules: `opportunity_status = 'open'`, deadline not elapsed in `Asia/Manila`, active/non-deleted company account.
   - Query: `search?`, `companyId?`, `workArrangement?`, `hasAllowance?`, `page?`, `limit?`.
   - Reason: employer-owned `/employer/opportunities` cannot be exposed to student/PESO roles.

5. **Add `GET /students/:studentId/attendance`.**
   - Roles: owning student or Admin, using the existing ownership check.
   - Query: `startDate?`, `endDate?` as `YYYY-MM-DD`.
   - Sources: `vw_internship_assignment_details`, `vw_attendance_summary`, and `attendance_record`.
   - Response: active/latest assignment, totals, today's record, and range history. Return `assignment: null` for a student without an assignment.
   - Reason: current student routes only mutate attendance; the attendance calendar/details cannot load authoritative data.

6. **Add `GET /users/peso/profile` and `PATCH /users/peso/profile`.**
   - Role: owning `peso_personnel` only.
   - Editable fields: personal/contact/address fields; immutable/excluded fields include IDs, role, account status, employee-ID document, verification fields, and reviewer fields.
   - Reason: current PESO self-service routes expose only verification status/correction; the existing profile UI cannot safely call Admin endpoints.

7. **Add read-only PESO direct-detail routes.**
   - `GET /dashboard/peso/applications/:applicationId` using `vw_application_details` plus student profile/requirement reads.
   - `GET /dashboard/peso/referrals/:referralId` using `vw_referral_details`.
   - `GET /dashboard/peso/interns/:internshipAssignmentId` using `vw_internship_assignment_details` plus `vw_attendance_summary`.
   - `GET /dashboard/peso/students` and `GET /dashboard/peso/students/:studentId` using `vw_student_profile_details`.
   - `GET /dashboard/peso/employers/:companyId` using existing `company`, `industry`, and `user_account` rows.
   - Reason: current frontend has direct detail routes and monitor-user screens. A paginated list cannot reliably restore a detail page after reload.
   - All are read-only. None may mutate application or referral status.

### 3.3 Necessary completion of existing endpoints, without schema work

Employer opportunity POST/PATCH currently return DB-EMP-001/503 because their DTO expects free-text allowance while the existing table stores `has_allowance boolean` plus numeric `allowance`.

Under this project's zero-schema constraint, complete the existing endpoints against the current columns:

```ts
interface OpportunityWriteRequest {
  title: string
  department: string
  workArrangement: 'onsite' | 'remote' | 'hybrid'
  minimumRequiredHours: number
  offeredSlots: number
  hasAllowance: boolean
  allowance: number | null // PHP amount only; no period/unit can be represented
  description: string
  qualification: string | null
  applicationDeadline: string // YYYY-MM-DD
}
```

Validate `hasAllowance === false -> allowance === null` and `hasAllowance === true -> allowance >= 0`, matching the current database constraint. Update `CreateOpportunityDto`, `UpdateOpportunityDto`, service insert/update SQL, tests, and documentation. Do not edit the existing schema or claim that allowance frequency is stored.

For Admin company creation, do not use a client-supplied fake path. Adapt the existing `POST /users/companies` workflow to accept a real logo payload, store it with `EmployerLogoStorageService`, and pass the resulting existing `logo_file_path` value into the current transaction. This is an existing-route compatibility change, not a schema change. If that change is not approved, leave Admin company creation visibly unavailable.

### 3.4 Explicitly rejected additions

Do not add any of the following:

- PESO create/process/approve/reject/dispatch referral endpoints.
- A requirement-verification column or endpoint pretending that such a column exists.
- Timed suspension persistence (`suspended_until`) or automatic unsuspension.
- Internship soft-delete support or `deleted_at` on assignments.
- Text allowance schema changes.
- Student application hard delete, student requirement hard delete, or student internship withdrawal solely to preserve mock buttons.
- Audit-log, database-backup, database-maintenance, cache-clear, notification, or password-reset endpoints.

---

## 4. Concrete File Modification Plan

Paths below are repository-relative and deliberately distinguish new files from existing mock-backed files.

### 4.1 Shared frontend foundation

- `[NEW] frontend/.env.development` — define `VITE_API_BASE_URL=http://localhost:3000` only; do not store secrets.
- `[NEW] frontend/.env.example` — document `VITE_API_BASE_URL` for other environments.
- `[NEW] frontend/src/services/api.ts` — Axios instance, auth callbacks, single-flight refresh queue, request retry marker, and error normalization.
- `[NEW] frontend/src/services/auth.service.ts` — exact auth calls and Google redirect helpers.
- `[NEW] frontend/src/services/reference.service.ts` — industry lookup.
- `[NEW] frontend/src/types/api.ts` — shared pagination/error/enums and cross-domain API DTOs.
- `[NEW] frontend/src/stores/useAuthStore.ts` — token/user/bootstrap/login/register/logout actions.
- `[NEW] frontend/src/stores/useReferenceStore.ts` — cached industry list.
- `[NEW] frontend/src/stores/useToastStore.ts` — transient toast queue.
- `[NEW] frontend/src/components/feedback/ToastViewport.tsx` — accessible `aria-live` notifications.
- `[NEW] frontend/src/components/routing/ProtectedRoute.tsx` — bootstrap/anonymous handling.
- `[NEW] frontend/src/components/routing/RoleRoute.tsx` — required-role and PESO-verification checks.
- `[NEW] frontend/src/features/authentication/components/AuthCallbackPage.tsx` — Google exchange and redirect.
- `[NEW] frontend/src/features/authentication/components/PesoVerificationGate.tsx` — pending/rejected status and resubmit flow.
- `[MODIFY] frontend/src/features/authentication/types/auth.types.ts` — use backend roles separately from UI login tabs; add `admin`; add exact auth DTOs.
- `[MODIFY] frontend/src/features/authentication/components/LoginPage.tsx` — real submit/loading/errors, Google navigation, Admin tab, role validation.
- `[MODIFY] frontend/src/features/authentication/components/SignUpPage.tsx` — exact student DTO mapping and Google-completion mode.
- `[MODIFY] frontend/src/App.tsx` — callback/onboarding routes and role guards around all four layouts; rename route params where noted below.
- `[MODIFY] frontend/src/main.tsx` — mount `ToastViewport` and initialize auth before protected content renders.
- `[MODIFY] frontend/package.json` — add test scripts/dependencies listed in Section 6.

### 4.2 Student feature files

- `[NEW] frontend/src/features/intern-seeker/stores/useStudentStore.ts` — profile, opportunity catalog, selected opportunity, and application submission state.
- `[NEW] frontend/src/features/intern-seeker/stores/useStudentTrackingStore.ts` — requirements, application trackers, assignment, today, attendance month cache, and mutations.
- `[NEW] frontend/src/features/intern-seeker/adapters/student.adapters.ts` — snake_case profile/requirement/attendance mapping and application timeline composition.
- `[MODIFY] frontend/src/features/intern-seeker/services/internship-portal.service.ts` — remove mock imports; call opportunity/profile/resume/application APIs.
- `[MODIFY] frontend/src/features/intern-seeker/services/applications.service.ts` — remove local arrays; implement list/status/withdraw/response calls; remove delete.
- `[MODIFY] frontend/src/features/intern-seeker/services/attendance.service.ts` — implement combined attendance read plus time-in/time-out.
- `[MODIFY] frontend/src/features/intern-seeker/services/requirements.service.ts` — implement read/upload; remove delete.
- `[MODIFY] frontend/src/features/intern-seeker/types/internship.types.ts` — separate exact API DTOs from UI view models and use numeric IDs internally.
- `[MODIFY] frontend/src/features/intern-seeker/types/application.types.ts` — preserve raw application/referral/response enums and expose display status from adapters.
- `[MODIFY] frontend/src/features/intern-seeker/types/attendance.types.ts` — add assignment ID, server raw status, rendered-hours status, and time-out action.
- `[MODIFY] frontend/src/features/intern-seeker/types/requirement.types.ts` — use backend requirement type names and stored-path metadata.
- `[MODIFY] frontend/src/features/intern-seeker/hooks/useInternshipPortal.ts` — become selectors/actions over `useStudentStore`; remove duplicate page-local fetch lifecycle.
- `[MODIFY] frontend/src/features/intern-seeker/hooks/useApplications.ts` — select from `useStudentTrackingStore`.
- `[MODIFY] frontend/src/features/intern-seeker/hooks/useAttendance.ts` — select month by key and expose clock-in/clock-out.
- `[MODIFY] frontend/src/features/intern-seeker/hooks/useRequirements.ts` — expose upload/replace only.
- `[MODIFY] frontend/src/features/intern-seeker/components/TrackingDataContext.tsx` — remove once consumers use Zustand, or retain temporarily as a thin store-selector compatibility wrapper with no fetching of its own.
- `[MODIFY] frontend/src/features/intern-seeker/components/OpportunityDetail.tsx` — Apply action, resume-required error, applied/closed state.
- `[MODIFY] frontend/src/features/intern-seeker/pages/InternshipPortalPage.tsx` — server data, retry/empty state.
- `[MODIFY] frontend/src/features/intern-seeker/pages/InternshipSearchPage.tsx` — URL-to-server filters, debounce, request cancellation, server pagination.
- `[MODIFY] frontend/src/features/intern-seeker/pages/DashboardPage.tsx` — authenticated profile and upload-path URLs.
- `[MODIFY] frontend/src/features/intern-seeker/pages/ProfileEditorPage.tsx` — exact profile DTO and industry IDs.
- `[MODIFY] frontend/src/features/intern-seeker/pages/DigiCVPage.tsx` — current resume metadata/download; upload as `curriculum_vitae_resume` if the page permits replacement.
- `[MODIFY] frontend/src/features/intern-seeker/pages/RequirementsPage.tsx` — real upload/download; remove trash action.
- `[MODIFY] frontend/src/features/intern-seeker/pages/ApplicationStatusPage.tsx` — authoritative list/status, accepted/declined mapping, no delete.
- `[MODIFY] frontend/src/features/intern-seeker/pages/AttendancePage.tsx` — server month/history, clock-in and clock-out states.
- `[MODIFY] frontend/src/features/intern-seeker/pages/InternshipDetailsPage.tsx` — current assignment from attendance response; hide unsupported withdrawal.

### 4.3 PESO feature files

- `[NEW] frontend/src/features/qcpeso/stores/useQCPesoStore.ts` — normalized dashboard/application/employer/student/referral/intern/attendance/profile slices with independent loading/error state.
- `[NEW] frontend/src/features/qcpeso/adapters/qcpeso.adapters.ts` — enum labels, numeric conversion, list/detail view models.
- `[MODIFY] frontend/src/features/qcpeso/services/qcpeso.service.ts` — replace every mock call with the mapped dashboard/PESO route; remove referral/application mutations and employer creation.
- `[MODIFY] frontend/src/features/qcpeso/types/qcpeso.types.ts` — replace display-only mock types with exact API DTOs plus explicit view models.
- `[MODIFY] frontend/src/features/qcpeso/hooks/useQCPeso.ts` — Zustand selectors; do not fetch profile/metrics/applications as an all-or-nothing bundle.
- `[MODIFY] frontend/src/features/qcpeso/pages/QCPesoDashboardPage.tsx` — actual counters/recent applications and “Not tracked” requirement verification.
- `[MODIFY] frontend/src/features/qcpeso/pages/ApplicantManagementPages.tsx` — paginated read-only applications/referrals, direct detail fetching, no review mutation.
- `[MODIFY] frontend/src/features/qcpeso/components/StudentReviewModal.tsx` — read-only details; remove accept/reject/endorse controls.
- `[MODIFY] frontend/src/features/qcpeso/pages/MonitorUsersPage.tsx` — server student/employer list, pagination, filters.
- `[MODIFY] frontend/src/features/qcpeso/pages/MonitorUserDetailsPage.tsx` — direct detail reads by typed profile ID.
- `[MODIFY] frontend/src/features/qcpeso/pages/InternManagementPages.tsx` — use assignment IDs, separate summary/list/detail loads, DTR detail route.
- `[MODIFY] frontend/src/features/qcpeso/pages/QCPesoOpportunityViewPage.tsx` — shared opportunity detail endpoint.
- `[MODIFY] frontend/src/features/qcpeso/pages/QCPesoProfilePage.tsx` — own profile API.
- `[MODIFY] frontend/src/features/qcpeso/pages/QCPesoProfileEditorPage.tsx` — allowed self-profile PATCH fields only.
- `[MODIFY] frontend/src/features/qcpeso/pages/ReportsDocumentsPage.tsx` — client export of fetched read data, not mock records.
- `[MODIFY] frontend/src/features/qcpeso/components/QCPesoSidebar.tsx` — remove/hide Create Employer and any referral-processing navigation.
- `[MODIFY] frontend/src/App.tsx` — remove or feature-disable `/qcpeso/monitor-users/employers/create`.

### 4.4 Employer feature files

- `[NEW] frontend/src/features/employer/stores/useEmployerStore.ts` — profile, dashboard, opportunities, referrals, candidates, assignments, attendance, and report state.
- `[NEW] frontend/src/features/employer/adapters/employer.adapters.ts` — exact DTO to current card/table/form mapping.
- `[MODIFY] frontend/src/features/employer/services/employer.service.ts` — remove all mock collections/timers; implement every route in the Phase 4 matrix.
- `[MODIFY] frontend/src/features/employer/types/employer.types.ts` — numeric identifiers and exact API enums/DTOs; keep display types separate.
- `[MODIFY] frontend/src/features/employer/hooks/useEmployerDashboard.ts` — parallel profile/metric/referral fetch through store with independent errors.
- `[MODIFY] frontend/src/features/employer/pages/EmployerDashboardPage.tsx` — backend counters/recent referrals.
- `[MODIFY] frontend/src/features/employer/pages/CompanyProfilePage.tsx` — GET profile and logo URL.
- `[MODIFY] frontend/src/features/employer/pages/CompanyProfileEditorPage.tsx` — PATCH payload and separate image PUT.
- `[MODIFY] frontend/src/features/employer/components/EditCompanyProfileModal.tsx` — exact field/null/number conversions.
- `[MODIFY] frontend/src/features/employer/pages/OpportunitiesPage.tsx` — paginated server list and referral modal key.
- `[MODIFY] frontend/src/features/employer/pages/CreateOpportunityPage.tsx` — numeric allowance compatibility contract and 503 unavailable state until backend completion.
- `[MODIFY] frontend/src/features/employer/pages/OpportunityDetailsPage.tsx` — close/archive semantics; no mock save.
- `[MODIFY] frontend/src/features/employer/components/ViewApplicantsModal.tsx` — `GET /opportunities/:id/referrals` and referral IDs.
- `[MODIFY] frontend/src/features/employer/pages/ApplicantsPage.tsx` — referral list filters/pagination.
- `[MODIFY] frontend/src/features/employer/pages/ReviewApplicantPage.tsx` — referral detail/accept/reject/interview calls.
- `[MODIFY] frontend/src/features/employer/components/ScheduleInterviewModal.tsx` — emit exact date/time/mode/location/url/remark DTO.
- `[MODIFY] frontend/src/features/employer/components/RejectApplicantModal.tsx` — nullable trimmed remark.
- `[MODIFY] frontend/src/features/employer/pages/InternshipWorkflowPages.tsx` — candidates, referral route key, exact assignment create body.
- `[MODIFY] frontend/src/features/employer/pages/AttendanceMonitoringPage.tsx` — server date/search/status/page and summary.
- `[MODIFY] frontend/src/features/employer/pages/AttendanceInternshipDetailsPage.tsx` — assignment attendance history.
- `[MODIFY] frontend/src/features/employer/pages/MonitorInternshipPage.tsx` — server summary/list and raw status filters.
- `[MODIFY] frontend/src/features/employer/pages/MonitorInternshipDetailsPage.tsx` — server capability flags; cancel/complete/update; remove delete.
- `[MODIFY] frontend/src/features/employer/pages/ReportsPage.tsx` — backend report totals and honest chart scope.
- `[MODIFY] frontend/src/features/employer/pages/EmployerSettingsPage.tsx` — actual password/logout-all actions.
- `[MODIFY] frontend/src/App.tsx` — change `:applicantId` route params to `:internshipAssignmentId`; use `:referralId` for applicant review/assignment candidate details.

### 4.5 Admin feature files

- `[NEW] frontend/src/features/admin/stores/useAdminStore.ts` — independent metrics, student, employer, PESO, create/edit/status slices.
- `[NEW] frontend/src/features/admin/adapters/admin.adapters.ts` — profile ID/user-account ID separation and enum/display mapping.
- `[MODIFY] frontend/src/features/admin/services/admin.service.ts` — replace mock state with `/admin`, `/dashboard/admin`, and `/users` calls.
- `[MODIFY] frontend/src/features/admin/types/admin.types.ts` — lowercase API enums, numeric IDs, exact list/detail DTOs, separate display types; remove timed-suspension state.
- `[MODIFY] frontend/src/features/admin/hooks/useAdminDashboard.ts` — real account metrics; remove notifications/audit/backup calls.
- `[MODIFY] frontend/src/features/admin/pages/AdminDashboardPage.tsx` — three role metric groups; no fake system health/notification data.
- `[MODIFY] frontend/src/features/admin/pages/ManageStudentsPage.tsx` — backend search/status/page.
- `[MODIFY] frontend/src/features/admin/pages/AdminStudentDetailsPage.tsx` — `studentId` detail plus `userAccountId` status action.
- `[MODIFY] frontend/src/features/admin/pages/AdminStudentProfileEditorPage.tsx` — exact `/admin/students/:studentId` PATCH.
- `[MODIFY] frontend/src/features/admin/pages/ManageEmployersPage.tsx` — backend list.
- `[MODIFY] frontend/src/features/admin/pages/AdminEmployerRecordPages.tsx` — `companyId` detail/edit, `userAccountId` status.
- `[MODIFY] frontend/src/features/admin/pages/ManageQCPesoPage.tsx` — backend list and verification labels only where returned.
- `[MODIFY] frontend/src/features/admin/pages/AdminQCPesoRecordPages.tsx` — `pesoPersonnelId` detail/edit, `userAccountId` status/verification action.
- `[MODIFY] frontend/src/features/admin/pages/AdminCreateRecordPages.tsx` — real PESO create; real company create only with approved safe-logo compatibility.
- `[MODIFY] frontend/src/features/admin/components/ManageRecordModal.tsx` — typed resource/status actions or remove after pages own these actions.
- `[MODIFY] frontend/src/features/admin/pages/AdminSettingsPage.tsx` — actual auth settings calls.
- `[MODIFY] frontend/src/features/admin/components/AdminSidebar.tsx` — feature-disable audit logs/backups until supported.
- `[MODIFY] frontend/src/features/admin/pages/AuditLogsPage.tsx` — unavailable state; no mock service call.
- `[MODIFY] frontend/src/features/admin/pages/BackupsMaintenancePage.tsx` — unavailable state; no destructive mock controls.

### 4.6 Minimal backend files

- `[MODIFY] backend/src/auth/auth.controller.ts` — additive role-profile IDs in `/auth/me`.
- `[NEW] backend/src/auth/guards/peso-approved.guard.ts` — server-side approved-status enforcement for PESO operational routes.
- `[MODIFY] backend/src/users/users.service.ts` — resolve existing role-profile IDs.
- `[MODIFY] backend/src/users/users.controller.ts` — PESO own-profile GET/PATCH.
- `[NEW] backend/src/users/dto/peso-profile.dto.ts` — whitelisted self-edit fields.
- `[MODIFY] backend/src/users/account-management.service.ts` — self-profile reads/updates and safe company-logo creation path if approved.
- `[NEW] backend/src/reference/reference.module.ts` — reference-data feature registration.
- `[NEW] backend/src/reference/reference.controller.ts` — authenticated `GET /reference/industries`.
- `[NEW] backend/src/reference/reference.service.ts` — read existing `industry` rows only.
- `[MODIFY] backend/src/app.module.ts` — import `ReferenceModule`; no TypeORM schema synchronization changes.
- `[NEW] backend/src/applications/opportunity-catalog.controller.ts` — student/PESO list/detail reads.
- `[NEW] backend/src/applications/dto/opportunity-catalog.dto.ts` — filter validation.
- `[NEW] backend/src/applications/opportunity-catalog.service.ts` — `vw_opportunity_summary` queries and explicit number mapping.
- `[MODIFY] backend/src/applications/applications.module.ts` — register/export catalog components as required.
- `[MODIFY] backend/src/students/controllers/students.controller.ts` — attendance GET.
- `[MODIFY] backend/src/students/services/students.service.ts` — assignment/summary/history read with ownership.
- `[NEW] backend/src/students/dto/student-attendance-query.dto.ts` — strict date range validation.
- `[MODIFY] backend/src/dashboard/controllers/peso-dashboard.controller.ts` — direct read-only detail/list routes.
- `[MODIFY] backend/src/dashboard/services/peso-dashboard.service.ts` — existing view/table reads only; no workflow writes.
- `[NEW] backend/src/dashboard/dto/peso-detail.dto.ts` — pagination/search validation for monitor lists.
- `[MODIFY] backend/src/employer/dto/opportunity.dto.ts` — current-schema allowance request.
- `[MODIFY] backend/src/employer/services/employer-opportunity.service.ts` — transactional insert/update against current columns.
- `[MODIFY] backend/src/employer/employer.module.ts` — export logo storage only if used by company provisioning.
- `[MODIFY] backend/src/users/users.module.ts` — import exported storage provider only if safe-logo provisioning is approved.
- `[MODIFY] backend/docs/dashboard.md`, `[MODIFY] backend/docs/employer-api.md`, `[MODIFY] backend/docs/auth.md`, `[MODIFY] backend/docs/student-endpoints-test-report.md` — align with implemented contracts and remove existing merge-conflict markers in `auth.md` while retaining correct behavior.
- `[NEW] backend/test/integration/frontend-contract.e2e-spec.ts` — additive frontend-contract coverage.

### 4.7 Exact shared TypeScript API contracts

Place shared contracts in `frontend/src/types/api.ts`; feature-specific contracts may be re-exported from feature type files. These types represent wire data, not display labels.

```ts
export type UserRole = 'student' | 'company' | 'peso_personnel' | 'admin'
export type AccountStatus = 'active' | 'suspended' | 'archived'
export type VerificationStatus = 'pending' | 'approved' | 'rejected'
export type CompanyType = 'government' | 'private'
export type WorkArrangement = 'onsite' | 'remote' | 'hybrid'
export type WorkSchedule = 'weekdays' | 'weekends' | 'flexible'
export type ApplicationStatus =
  | 'submitted' | 'under_review' | 'approved_for_referral'
  | 'rejected_for_referral' | 'closed' | 'withdrawn' | 'expired'
export type ReferralStatus = 'sent' | 'under_review' | 'closed' | 'withdrawn' | 'expired'
export type CompanyResponse = 'pending' | 'for_interview' | 'accepted' | 'rejected'
export type StudentResponse = 'pending' | 'accepted' | 'declined'
export type AssignmentStatus = 'pending' | 'ongoing' | 'completed' | 'withdrawn' | 'cancelled'
export type TimeInStatus = 'on_time' | 'late'
export type RenderedHoursStatus = 'complete' | 'undertime' | 'overtime' | 'incomplete'

export interface PageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}
export interface PaginatedResponse<T> { data: T[]; meta: PageMeta }
export interface AdminSummary { total: number; active: number; suspended: number; archived: number }
export interface AdminListResponse<T> extends PaginatedResponse<T> { summary: AdminSummary }
export interface MessageResponse { message: string }

export interface AuthTokenResponse { accessToken: string }
export interface CurrentUserResponse {
  userAccountId: number
  email: string
  userRole: UserRole
  accountStatus: AccountStatus
  verificationStatus: VerificationStatus | null
  studentId: number | null       // additive /auth/me field
  companyId: number | null       // additive /auth/me field
  pesoPersonnelId: number | null // additive /auth/me field
}
```

Student/profile wire contracts must retain the current raw-query snake_case keys:

```ts
export interface StudentRowDto {
  student_id: number
  user_account_id: number
  first_name: string
  middle_name: string | null
  last_name: string
  extension_name: string | null
  sex: string
  birth_date: string
  contact_number: string
  contact_email: string
  linkedin_url: string | null
  address_line: string
  address_barangay: string
  address_district: string
  address_city: string
  inquiry_method: 'walk_in' | 'online' | 'phone_call' | 'school'
  photo_file_path: string | null
  created_at: string
  updated_at: string
}
export interface StudentAcademicRowDto {
  student_academic_information_id: number
  student_id: number
  school_name: string
  year_level: string
  strand_program: string
  created_at: string
  updated_at: string
}
export interface InternshipPreferenceRowDto {
  internship_preference_id: number
  student_id: number
  required_hours: number
  available_days: WorkSchedule
  allows_outside_preferred_field: boolean
  start_date: string
  preferred_company_type: CompanyType
  created_at: string
  updated_at: string
}
export interface PreferredIndustryRowDto {
  student_id: number
  industry_id: number
  custom_industry_name: string | null
  industry_name: string | null
}
export interface StudentProfileResponse {
  student: StudentRowDto
  academic: StudentAcademicRowDto | null
  internshipPreference: InternshipPreferenceRowDto | null
  preferredIndustries: PreferredIndustryRowDto[]
}
```

Opportunity/application contracts:

```ts
export interface OpportunitySummaryDto {
  opportunityId: number
  companyId: number
  companyName: string
  companyType: CompanyType
  industryId: number
  industryName: string
  companyLogoFilePath: string | null
  companyAddressCity: string
  title: string
  department: string
  description: string
  qualification: string | null
  minimumRequiredHours: number
  workArrangement: WorkArrangement
  offeredSlots: number
  hasAllowance: boolean
  allowance: number | null
  applicationDeadline: string
  opportunityStatus: 'open' | 'closed' | 'archived'
  createdAt: string
  updatedAt: string
  totalApplicationCount: number
  activeApplicationCount: number
  approvedForReferralCount: number
  hasApplied: boolean
}
export interface DashboardApplicationDto {
  applicationId: number
  studentId: number
  studentFullName: string
  studentContactEmail: string
  studentContactNumber: string
  schoolName: string | null
  yearLevel: string | null
  strandProgram: string | null
  opportunityId: number
  opportunityTitle: string
  opportunityStatus: 'open' | 'closed' | 'archived'
  companyId: number
  companyName: string
  submittedAt: string
  applicationStatus: ApplicationStatus
  applicationRemark: string | null
  studentResponse: StudentResponse
  studentRespondedAt: string | null
  referralId: number | null
  referralStatus: ReferralStatus | null
  companyResponse: CompanyResponse | null
  internshipAssignmentId: number | null
  assignmentStatus: AssignmentStatus | null
}
export interface StudentApplicationDto {
  applicationId: number
  submittedAt: string
  applicationStatus: ApplicationStatus
  applicationRemark: string | null
  studentResponse: StudentResponse
  studentRespondedAt: string | null
  opportunity: {
    opportunityId: number; title: string; opportunityStatus: 'open' | 'closed' | 'archived'
    applicationDeadline: string; workArrangement: WorkArrangement; minimumRequiredHours: number
  }
  company: { companyId: number; companyName: string; industryName: string }
  referral: { referralId: number; referralStatus: ReferralStatus; companyResponse: CompanyResponse } | null
  assignment: { internshipAssignmentId: number; assignmentStatus: AssignmentStatus } | null
}
export interface StudentApplicationStatusDto {
  applicationId: number
  studentId: number
  applicationStatus: ApplicationStatus
  studentResponse: StudentResponse
  studentRespondedAt: string | null
  submittedAt: string
  remark: string | null
  opportunity: {
    opportunityId: number; title: string; opportunityStatus: 'open' | 'closed' | 'archived'
    applicationDeadline: string; workArrangement: WorkArrangement; minimumRequiredHours: number
  }
  company: { companyId: number; companyName: string; industryName: string }
  referral: { referralId: number; referralStatus: ReferralStatus; companyResponse: CompanyResponse } | null
  interview: {
    interview_id: number; scheduled_at: string; interview_mode: 'physical' | 'online'
    physical_location: string | null; online_meeting_url: string | null; remark: string | null
  } | null
  assignment: { internshipAssignmentId: number; assignmentStatus: AssignmentStatus } | null
  timeline: Array<{
    statusHistoryId: number; previousStatus: ApplicationStatus
    newStatus: ApplicationStatus; changedAt: string; changedByRole: UserRole | null
  }>
}
```

Requirements and student attendance contracts:

```ts
export interface RequirementSubmissionDto {
  student_requirement_submission_id: number
  student_id: number
  requirement_type_id: number
  requirement_type_name: string
  requirement_name: string
  requirement_file_path: string
  submitted_at: string
  updated_at: string
}
export interface StudentRequirementsResponse {
  student: StudentRowDto
  requirements: RequirementSubmissionDto[]
}
export interface AttendanceRecordRowDto {
  attendance_record_id: number
  internship_assignment_id: number
  attendance_date: string
  time_in: string
  time_in_status: TimeInStatus
  time_out: string | null
  hours_rendered: string | null
  rendered_hours_status: RenderedHoursStatus
  photo_file_path: string | null
  created_at: string
  updated_at: string
}
export interface StudentAttendanceDayDto {
  attendanceRecordId: number | null
  date: string
  status: 'present' | 'late' | 'absent'
  timeIn: string | null
  timeOut: string | null
  renderedHours: number
  renderedHoursStatus: RenderedHoursStatus
}
export interface StudentAttendanceResponse {
  assignment: null | {
    internshipAssignmentId: number
    companyId: number
    companyName: string
    opportunityId: number
    jobTitle: string
    workingDays: WorkSchedule
    requiredHours: number
    startDate: string
    expectedEndDate: string | null
    endDate: string | null
    startShift: string
    endShift: string
    assignmentStatus: AssignmentStatus
    totalRenderedHours: number
    remainingHours: number
  }
  today: AttendanceRecordRowDto | null
  records: StudentAttendanceDayDto[]
  summary: {
    daysPresent: number
    absences: number
    lateArrivals: number
    attendanceRate: number
    totalRenderedHours: number
  }
}
```

PESO/dashboard contracts must reflect the service's actual current output, including PostgreSQL numeric strings where the service does not convert them:

```ts
export interface PesoStudentMetricsDto {
  totalPendingApplications: number
  totalVerifiedRequirements: number
  totalActiveEmployers: number
  totalAvailableOpportunities: number
}
export interface PesoApplicationMetricsDto {
  pendingApplications: number
  verifiedRequirements: number
  rejectedSubmissions: number
}
export interface PesoEmployerMetricsDto {
  totalPartnerEmployers: number
  totalAvailableOpportunities: number
  pendingRegistrations: number
}
export interface PesoInternMetricsDto {
  applicantsOvertime: number
  pendingReview: number
  accepted: number
  shortlisted: number
  rejected: number
}
export interface PesoReferralDto {
  referralId: number; applicationId: number; studentId: number; studentFullName: string
  studentContactEmail: string; studentContactNumber: string
  opportunityId: number; opportunityTitle: string; companyId: number; companyName: string
  referredAt: string; referralStatus: ReferralStatus; companyResponse: CompanyResponse
  companyRespondedAt: string | null; referralRemark: string | null
  pesoPersonnelId: number; pesoPersonnelFullName: string
  interviewId: number | null; interviewScheduledAt: string | null; interviewMode: 'physical' | 'online' | null
  internshipAssignmentId: number | null; assignmentStatus: AssignmentStatus | null
}
export interface PesoInternSummaryDto {
  internshipAssignmentId: number; studentId: number; studentFullName: string
  opportunityId: number; opportunityTitle: string; companyId: number; companyName: string
  assignmentStatus: AssignmentStatus; requiredHours: number
  totalRenderedHours: string; attendanceRecordCount: string; completeCount: string
  incompleteCount: string; lateCount: string; undertimeCount: string; overtimeCount: string
  firstAttendanceDate: string | null; latestAttendanceDate: string | null
  completionPercentage: string
}
export interface PesoDtrEntryDto {
  attendanceRecordId: number; internshipAssignmentId: number; studentFullName: string
  role: string; department: string; company: string; dtrDate: string
  timeIn: string; timeInStatus: TimeInStatus; timeOut: string | null
  totalHours: string | null; status: RenderedHoursStatus
}
```

Employer contracts:

```ts
export interface EmployerDashboardMetricsDto {
  activeOpportunities: number; pendingReviews: number; totalApplicants: number
  acceptedCount: number; rejectedCount: number
}
export interface EmployerOpportunityDto {
  opportunityId: number; title: string; department: string; description: string
  qualification: string | null; minimumRequiredHours: number; workArrangement: WorkArrangement
  offeredSlots: number; allowance: string | null; applicationDeadline: string
  opportunityStatus: 'open' | 'closed' | 'archived'; totalApplicantCount: number
}
export interface EmployerReferralListItemDto {
  referralId: number; applicationId: number; studentId: number; studentFullName: string
  opportunityId: number; opportunityTitle: string; strandProgram: string | null
  yearLevel: string | null; submittedAt: string; companyResponse: CompanyResponse
}
export interface EmployerAttendanceItemDto {
  internshipAssignmentId: number; studentId: number; studentFullName: string
  jobTitle: string; date: string; status: 'present' | 'late' | 'absent'
  timeIn: string | null; timeOut: string | null; renderedHours: number
  renderedHoursStatus: RenderedHoursStatus
}
export interface EmployerInternshipListItemDto {
  internshipAssignmentId: number; studentId: number; studentFullName: string
  jobTitle: string; requiredHours: number; renderedHours: number; remainingHours: number
  assignmentStatus: AssignmentStatus; displayStatus: string
}
```

Admin contracts:

```ts
export interface AdminMetricsDto {
  totalRegistered: number; activeAccounts: number; deactivatedAccounts: number
}
export interface AdminStudentListItemDto {
  studentId: number; userAccountId: number; fullName: string
  accountEmail: string; createdAt: string; accountStatus: AccountStatus
}
export interface AdminEmployerListItemDto {
  companyId: number; userAccountId: number; companyName: string
  accountEmail: string; createdAt: string; accountStatus: AccountStatus
}
export interface AdminPesoListItemDto {
  pesoPersonnelId: number; userAccountId: number; fullName: string
  accountEmail: string; employeeId: string; createdAt: string; accountStatus: AccountStatus
}
```

Detail request/response interfaces must mirror the fields listed in `backend/docs/admin-api.md`; do not reuse the existing `Partial<StudentRecord>`/`Partial<EmployerRecord>` types as PATCH payloads because they contain forbidden display and ownership properties.

---

## 5. Step-by-Step Execution Phases & Tasks

### Phase 0 — Contract freeze and safety guardrails

- [ ] Record a clean `git status` and preserve any unrelated user changes.
- [ ] Add a pull-request/checklist rule: no files under `backend/src/database/migrations/` may change.
- [ ] Capture the current backend route inventory from controllers and keep it with implementation notes.
- [ ] Treat actual controllers/DTOs as authoritative where `backend/docs/auth.md` merge-conflict text or older dashboard examples disagree.
- [ ] Decide whether the existing-schema opportunity POST/PATCH and safe Admin company-logo creation changes are approved; otherwise feature-disable those forms.
- [ ] Confirm development API/frontend origins (`3000`/`5173`) and do not introduce a proxy and direct base URL simultaneously.

### Phase 1 — API/auth foundation

- [ ] Create frontend env files and validate a missing `VITE_API_BASE_URL` with a startup error in development.
- [ ] Implement shared API types, error normalization, Axios instance, and auth callback bridge.
- [ ] Implement single-flight refresh and replay tests before wiring feature calls.
- [ ] Implement auth service and Zustand store with `anonymous`, `bootstrapping`, `authenticated`, and `error` states.
- [ ] Add `/auth/me` role-profile IDs and backend tests.
- [ ] Add the backend PESO approval guard before relying on the frontend verification gate.
- [ ] Add protected/role routes and PESO verification gate.
- [ ] Wire login and student signup; verify payloads omit UI-only fields.
- [ ] Add Google callback and Google onboarding route expected by backend redirects.
- [ ] Wire logout in all four sidebars/layouts.
- [ ] Add toast store/viewport and shared inline error components.
- [ ] Implement/reference-test `GET /reference/industries` and its frontend cache.
- [ ] Remove any debug token logging.

### Phase 2 — Student integration

- [ ] Add and test student/PESO opportunity catalog list/detail reads from `vw_opportunity_summary`.
- [ ] Replace `internship-portal.service.ts` mocks with catalog/profile calls.
- [ ] Implement student store and adapters; use numeric IDs internally.
- [ ] Wire portal cards, detail modal, URL search filters, pagination, empty state, and cancellation.
- [ ] Wire Apply and resume-required error handling.
- [ ] Wire profile read/save and industry ID selections.
- [ ] Wire resume and requirements read/upload/replace/download.
- [ ] Remove unsupported requirement delete behavior.
- [ ] Wire application list and fetch selected lifecycle detail.
- [ ] Implement deterministic tracker mapping for every application/referral/company/student state.
- [ ] Wire offer accepted/declined and application withdrawal; remove application deletion.
- [ ] Add/test combined student attendance read.
- [ ] Wire attendance month cache, current assignment, clock-in, clock-out, and refetch.
- [ ] Remove mock date constants (`2026`, month `7`) and initialize from `Asia/Manila` current date.
- [ ] Hide unsupported internship withdrawal.
- [ ] Remove student mock imports from production services and verify no `setTimeout` remains.

### Phase 3 — PESO integration

- [ ] Implement/test PESO own-profile GET/PATCH.
- [ ] Implement/test all proposed PESO read-only detail routes.
- [ ] Build `useQCPesoStore` with independent loads so one failed panel does not blank the dashboard.
- [ ] Replace dashboard metric and recent-application mocks.
- [ ] Render requirement verification as unavailable rather than a false zero metric.
- [ ] Replace application list/detail mocks and remove every application/referral mutation.
- [ ] Replace employer/student monitoring mocks with paginated reads.
- [ ] Replace referral monitoring mocks; use `companyResponse` query name.
- [ ] Replace intern and DTR mocks; route by `internshipAssignmentId`.
- [ ] Wire shared opportunity details.
- [ ] Wire own profile read/edit.
- [ ] Convert reports to client-side exports of authoritative read data.
- [ ] Hide PESO company creation and referral-processing routes/buttons.
- [ ] Verify an approved PESO token can read all Phase 3 screens and a pending/rejected token sees only the verification gate.

### Phase 4 — Employer integration

- [ ] Replace company profile mocks; verify null/number form conversions and logo upload.
- [ ] Replace dashboard metrics/recent referrals in `useEmployerDashboard`.
- [ ] Replace opportunity list/detail reads with server pagination.
- [ ] Complete and test existing-schema opportunity create/update, or feature-disable the forms.
- [ ] Change “Delete opportunity” to “Archive opportunity”; wire close/archive.
- [ ] Replace applicants with referral list/detail calls and rename IDs/routes.
- [ ] Wire accept/reject/interview and document downloads.
- [ ] Replace assignment candidates and create-assignment workflow.
- [ ] Replace internship summary/list/detail/update/cancel/complete.
- [ ] Remove internship delete and withdraw-acceptance controls.
- [ ] Replace attendance summary/list/history with `/employer/*` APIs.
- [ ] Replace report mock calculations with backend report totals.
- [ ] Wire password and logout-all settings.
- [ ] Verify cross-company IDs return 404/403 without leaking another company's data.

### Phase 5 — Admin integration

- [ ] Build Admin store/adapters with separate profile IDs and `userAccountId`.
- [ ] Replace dashboard mock summary with the three metrics calls.
- [ ] Replace student list/detail/edit with `/admin/students` and server filters/pagination.
- [ ] Replace employer list/detail/edit with `/admin/employers`.
- [ ] Replace PESO list/detail/edit with `/admin/qc-peso`.
- [ ] Wire indefinite `active/suspended/archived` status updates through completed dashboard Admin PATCH routes.
- [ ] Remove suspension-day fields and never simulate timed suspension.
- [ ] Wire PESO verification queue/approve/reject where shown.
- [ ] Wire Admin PESO creation with a real employee-ID file payload.
- [ ] Wire Admin company creation only after safe logo provisioning is available; otherwise disable it explicitly.
- [ ] Remove/fence audit, notification, backup, optimize, and cache-clear mocks.
- [ ] Wire Admin password/logout-all settings.
- [ ] Verify archive removes login access and does not physically delete profile data.

### Phase 6 — Mock removal and hardening

- [ ] Run `rg "MOCK_|setTimeout\(|structuredClone\(MOCK" frontend/src` and remove every production-path match.
- [ ] Keep mock fixtures only under test/MSW directories.
- [ ] Ensure every list has loading, empty, error, retry, and pagination states.
- [ ] Ensure every mutation disables duplicate submission and uses server response/refetch.
- [ ] Ensure date input/output is `YYYY-MM-DD` at the API boundary and formatted only for display.
- [ ] Ensure all server numeric strings are converted once in adapters.
- [ ] Ensure asset/download URLs are created from the configured API base and temporary blob URLs are revoked.
- [ ] Confirm no access/refresh token, password, employee ID file, or private document payload is logged.
- [ ] Confirm no frontend component imports from a production `mocks` folder.
- [ ] Confirm `git diff -- backend/src/database/migrations` is empty.

---

## 6. Verification & Testing Plan

### 6.1 Frontend test tooling and scripts

Add Vitest, React Testing Library, `@testing-library/user-event`, `@testing-library/jest-dom`, jsdom, and MSW. Add scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc -b"
  }
}
```

Create:

- `[NEW] frontend/src/test/setup.ts` — jest-dom and MSW lifecycle.
- `[NEW] frontend/src/test/server.ts` — MSW test server.
- `[NEW] frontend/src/test/handlers.ts` — representative auth/student/PESO/employer/admin handlers.
- `[NEW] frontend/src/services/api.test.ts` — Bearer injection, one refresh for concurrent 401s, replay once, refresh failure, 403, 429, validation and network errors.
- `[NEW] frontend/src/stores/useAuthStore.test.ts` — bootstrap/login/role mismatch/logout.
- `[NEW] frontend/src/components/routing/RoleRoute.test.tsx` — all role boundaries and PESO verification states.
- `[NEW] frontend/src/features/intern-seeker/adapters/student.adapters.test.ts` — snake_case mapping and lifecycle tracker cases.
- `[NEW] frontend/src/features/qcpeso/adapters/qcpeso.adapters.test.ts` — numeric-string conversion and read-only state.
- `[NEW] frontend/src/features/employer/adapters/employer.adapters.test.ts` — DTO/form/status mapping.
- `[NEW] frontend/src/features/admin/adapters/admin.adapters.test.ts` — ID separation and PATCH allowlists.

Minimum frontend assertions:

- Login sends no `role` or `rememberMe` property.
- Multipart calls do not force a JSON content type.
- Student decline sends `declined`, not `rejected`.
- PESO code exposes no mutation that changes application/referral state.
- Employer applicant routes use `referralId`.
- Admin status calls use `userAccountId`, while details use profile ID.
- No delete action is shown for applications, requirements, internship records, or accounts where only archival/history is supported.

### 6.2 Backend unit/e2e verification

Extend tests without changing the database schema:

- `/auth/me` returns the correct role-profile ID and null for unrelated profile IDs.
- Industry reference is authenticated, ordered, and read-only.
- Opportunity catalog excludes closed/archived/expired opportunities for students, applies filters, maps numeric fields to numbers, and reports `hasApplied` only for the current student.
- Student A cannot read Student B attendance; Admin can read when intended.
- Student attendance returns null assignment cleanly, current day state, date-range rows, and existing summary values.
- PESO detail routes return 404 for unknown IDs and 403 for other roles.
- Pending/rejected PESO accounts receive 403 from operational APIs even when called outside the frontend.
- No PESO route writes `application`, `referral`, or their status-history tables.
- Opportunity create/update compatibility validates the current allowance constraint and remains company-scoped.
- Admin company creation cleans up a newly stored logo if the database transaction fails.
- Existing dashboard, employer, admin, auth, and student tests remain green.

Run from `backend/`:

```powershell
npm run build
npm test -- --runInBand
npm run test:e2e
npm run test:employer:e2e
npm run test:admin:e2e
```

Run from `frontend/`:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

### 6.3 Manual end-to-end UI checklist

- [ ] Start logged out; open a protected URL; verify redirect to login with `returnTo`.
- [ ] Login as Student; confirm token is applied, `/auth/me` supplies `studentId`, and the original URL resumes.
- [ ] Reload; confirm refresh-cookie bootstrap restores the Student session.
- [ ] Search/filter opportunities, open detail, apply, and see the new application without a page reload.
- [ ] Attempt Apply without a resume and verify the backend message directs the user to upload one.
- [ ] Upload/replace a requirement, download it, and confirm no fake delete remains.
- [ ] Load application tracker, withdraw an eligible application, and accept/decline an eligible company offer.
- [ ] Load student attendance, clock in, reload, clock out, and confirm server-calculated state/history.
- [ ] Login as approved PESO; verify dashboard/application/employer/referral/intern/DTR reads and absence of referral-processing actions.
- [ ] Login as pending/rejected PESO; verify the operational dashboard is blocked by the verification gate.
- [ ] Login as Employer; verify profile, opportunity reads, referral decisions/interview, assignment creation, attendance, internship cancel/complete, and report totals.
- [ ] Attempt a cross-company referral/assignment ID and verify no data is shown.
- [ ] Login as Admin; verify each role list/search/filter/page/detail/edit and account status patch.
- [ ] Suspend a user and verify their existing session is rejected; reactivate and verify they must log in again.
- [ ] Archive a user and verify the record remains in Admin history/list while authentication stays blocked.
- [ ] Verify unsupported audit/backup/notification/timed-suspension/delete controls are not presented as working.
- [ ] Force access-token expiry; verify one refresh and successful request replay.
- [ ] Remove/expire the refresh cookie; verify redirect to login with one “session expired” notice and no loop.
- [ ] Simulate backend offline; verify retryable errors and no forced logout.

### 6.4 Running both development servers

Use two terminals so logs remain readable.

Terminal 1:

```powershell
Set-Location 'D:\files\Online Classes\College\3rd Year\Summer\INTERNet\backend'
npm run start:dev
```

Terminal 2:

```powershell
Set-Location 'D:\files\Online Classes\College\3rd Year\Summer\INTERNet\frontend'
npm run dev
```

Expected URLs:

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`

Before starting, copy `backend/.env.example` to the local ignored backend env file and provide database/JWT values. Never commit real secrets. The frontend development env contains only the public API origin.

### 6.5 Completion gate

Integration is complete only when:

- All production frontend services use the centralized Axios instance.
- All protected UI surfaces source data from backend APIs or clearly state that the backend capability is unavailable.
- Auth refresh, role routing, and unauthorized redirects pass automated and manual checks.
- The four role workflows pass their checklists with direct-route reloads.
- All relevant backend and frontend tests/builds pass.
- PESO has no referral-processing mutation.
- `git diff -- backend/src/database/migrations backend/src/database/migrations/001_initial_schema.sql` is empty and no generated migration exists.
