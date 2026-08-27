# Employer API

## Overview

This module provides the company/employer profile, opportunities, referred-applicant workflow, internship assignments, attendance, and internship-management APIs. It does not provide employer Dashboard, Reports, or Settings APIs and does not use the legacy `/dashboard/employer/*` namespace.

Base path: `/employer`

Every endpoint requires an access token in `Authorization: Bearer <token>` and the authenticated account must have `userRole = company`. The server derives `company_id` from `CurrentUser.userAccountId -> company.user_account_id`; clients cannot provide or override a company ID. A resource outside that company scope returns `404`, preventing ID enumeration.

Unless stated otherwise, successful reads and mutations return `200`. Assignment creation returns the Nest default `201`. Validation errors return `400`, missing scoped resources return `404`, invalid workflow states return `409`, and unsupported uploads return `415`.

## Shared contracts

List endpoints use:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0
  }
}
```

`page` starts at 1. `limit` is 1-100. Opportunities default to 7 per page; other lists default to 10. Ordering always has a deterministic ID tie-breaker. Search and filter values are SQL parameters.

Dates use strict `YYYY-MM-DD`; times use strict `HH:mm`. All business dates and schedule decisions use `Asia/Manila`. An application-deadline date represents the end of that Manila calendar date in the final write model. Current opportunity reads convert the stored timestamp back to a stable Manila date.

## Company profile

### 1. GET `/employer/profile`

Returns the authenticated company profile from `company` joined to `industry`.

Query/body: none.

```json
{
  "companyId": 12,
  "companyName": "Example Corporation",
  "companyType": "private",
  "industryId": 4,
  "industryName": "Information Technology",
  "description": "Software services",
  "websiteUrl": "https://example.com",
  "yearEstablished": 2012,
  "companySize": 120,
  "addressLine": "100 Main Street",
  "addressBarangay": "Central",
  "addressDistrict": null,
  "addressCity": "Quezon City",
  "contactEmail": "hr@example.com",
  "contactNumber": "+63 900 000 0000",
  "contactPersonFirstName": "Alex",
  "contactPersonMiddleName": null,
  "contactPersonLastName": "Santos",
  "contactPersonExtensionName": null,
  "logoFilePath": "/uploads/company-logos/generated.png"
}
```

`companyType` uses the database values `private` or `government`.

### 2. PATCH `/employer/profile`

Updates only profile fields. Every property is optional for PATCH. Supplied required text fields must be nonblank. Whitespace-only nullable text becomes `null`.

```json
{
  "companyName": "Example Corporation",
  "companyType": "private",
  "industryName": "Information Technology",
  "description": "Updated description",
  "websiteUrl": "https://example.com",
  "yearEstablished": 2012,
  "companySize": 125,
  "addressLine": "100 Main Street",
  "addressBarangay": "Central",
  "addressDistrict": null,
  "addressCity": "Quezon City",
  "contactEmail": "hr@example.com",
  "contactNumber": "+63 900 000 0000",
  "contactPersonFirstName": "Alex",
  "contactPersonMiddleName": null,
  "contactPersonLastName": "Santos",
  "contactPersonExtensionName": null
}
```

The response is the same shape as endpoint 1. `companySize` must be positive, the establishment year cannot be later than the current Manila year, website/email values are validated, and `industryName` must case-insensitively match a standardized `industry` row with `is_custom_text = false`. Ownership cannot be changed.

### 3. PUT `/employer/profile/image`

Replaces the company logo. Content type is `multipart/form-data`; the field name is `image`. JPEG, PNG, WebP, and GIF are accepted up to 5 MiB. The server generates the filename, stores the new file before changing `company.logo_file_path`, removes the new file if the DB update fails, and only then attempts cleanup of the old managed logo.

```json
{ "logoFilePath": "/uploads/company-logos/generated-uuid.png" }
```

Client-supplied paths are never accepted. Storage paths are constrained to the generated company-logo directory.

## Opportunities

The relevant tables are `opportunity`, `application`, and `referral`. Employer applicant counts are counts of referrals, not all raw applications.

### 4. GET `/employer/opportunities`

Query: `status? = open | closed | archived`, `page?`, `limit?`.

```json
{
  "data": [
    {
      "opportunityId": 44,
      "title": "Software Developer Intern",
      "department": "Engineering",
      "description": "...",
      "qualification": null,
      "minimumRequiredHours": 400,
      "workArrangement": "hybrid",
      "offeredSlots": 3,
      "allowance": "PHP 500 per day",
      "applicationDeadline": "2026-10-31",
      "opportunityStatus": "open",
      "totalApplicantCount": 8
    }
  ],
  "meta": { "page": 1, "limit": 7, "total": 1, "totalPages": 1 }
}
```

`allowance` is stored as free-text (e.g. `'PHP 5,000 monthly'` or `'PHP 500 per day'`) or `null` for uncompensated opportunities.

### 5. POST `/employer/opportunities`

Request contract:

```json
{
  "title": "Software Developer Intern",
  "department": "Engineering",
  "workArrangement": "hybrid",
  "minimumRequiredHours": 400,
  "offeredSlots": 3,
  "allowance": "PHP 500 per day",
  "description": "...",
  "qualification": null,
  "applicationDeadline": "2026-10-31"
}
```

Creates a new opportunity owned by the authenticated company in `open` status. Returns `201` with the created opportunity resource.

### 6. GET `/employer/opportunities/:opportunityId`

Returns the same opportunity fields as endpoint 4 plus the full description and qualification. The `opportunity` row must belong to the authenticated company.

### 7. PATCH `/employer/opportunities/:opportunityId`

Editable body mirrors endpoint 5 and every property is optional for PATCH. Updates the opportunity fields for the company-owned record. Returns `200` with the updated opportunity resource.

### 8. PATCH `/employer/opportunities/:opportunityId/close`

Transitions `open -> closed`. Closing an already closed opportunity is idempotent and returns the current resource. An archived opportunity returns `409`.

```json
{ "opportunityId": 44, "opportunityStatus": "closed" }
```

### 9. DELETE `/employer/opportunities/:opportunityId`

Archives rather than deletes. `open` is transitioned transactionally through `closed` before `archived`; `closed` transitions directly to `archived`; archived is idempotent. No SQL delete occurs.

```json
{ "opportunityId": 44, "opportunityStatus": "archived" }
```

### 10. GET `/employer/opportunities/:opportunityId/referrals`

Query: `search?` (student name and opportunity title), `companyResponse? = pending | for_interview | accepted | rejected`, `page?`, `limit?`.

```json
{
  "data": [
    {
      "referralId": 91,
      "applicationId": 80,
      "studentId": 33,
      "studentFullName": "Jamie Cruz",
      "opportunityId": 44,
      "opportunityTitle": "Software Developer Intern",
      "strandProgram": "BS Information Technology",
      "yearLevel": "third_year_college",
      "submittedAt": "2026-08-01T02:00:00.000Z",
      "companyResponse": "pending"
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

The opportunity and every returned referral are company-scoped.

## Applicants and referrals

Employer decisions use `referral.company_response`, never `application.application_status`. Core reads join `referral`, `application`, `student`, `student_academic_information`, `internship_preference`, `opportunity`, `interview`, and requirement tables; the schema's `vw_referral_details` represents the same ownership chain.

### 11. GET `/employer/referrals`

Query: `search?` (student name or opportunity title), `companyResponse?`, `page?`, `limit?`. Response items use the endpoint 10 shape. Only referred applications are returned.

### 12. GET `/employer/referrals/:referralId`

Returns the aggregated review model:

```json
{
  "referral": {
    "referralId": 91,
    "referralStatus": "under_review",
    "companyResponse": "for_interview",
    "companyRespondedAt": "2026-08-20T01:00:00.000Z",
    "referralRemark": null
  },
  "application": {
    "applicationId": 80,
    "submittedAt": "2026-08-01T02:00:00.000Z",
    "studentResponse": "pending"
  },
  "student": {
    "studentId": 33,
    "fullName": "Jamie Cruz",
    "contactEmail": "jamie@example.com",
    "contactNumber": "+63 900 000 0000",
    "addressLine": "...",
    "addressBarangay": "...",
    "addressDistrict": "...",
    "addressCity": "Quezon City",
    "schoolName": "Example University",
    "yearLevel": "third_year_college",
    "strandProgram": "BS Information Technology"
  },
  "internshipPreference": {
    "requiredHours": 400,
    "availableDays": "weekdays",
    "startDate": "2026-09-01"
  },
  "opportunity": { "opportunityId": 44, "title": "Software Developer Intern" },
  "interview": {
    "interviewId": 7,
    "scheduledAt": "2026-09-05T01:30:00.000Z",
    "interviewMode": "online",
    "physicalLocation": null,
    "onlineMeetingUrl": "https://example.com/meeting",
    "remark": null
  },
  "documents": [
    {
      "submissionId": 21,
      "requirementTypeId": 3,
      "requirementTypeName": "curriculum_vitae_resume",
      "requirementName": "Jamie CV"
    }
  ]
}
```

`interview` is `null` when none exists.

### 13. PATCH `/employer/referrals/:referralId/accept`

Accepts only `pending` or `for_interview`. A `sent` referral first follows `sent -> under_review`; the final state is `under_review + accepted` while student response remains pending. The action is transactional and status history receives the authenticated employer actor. Response uses endpoint 12.

### 14. PUT `/employer/referrals/:referralId/interview`

```json
{
  "interviewDate": "2026-09-05",
  "interviewTime": "09:30",
  "interviewMode": "online",
  "onlineMeetingUrl": "https://example.com/meeting",
  "physicalLocation": null,
  "remark": null
}
```

`online` requires only `onlineMeetingUrl`; `physical` requires only `physicalLocation`. Date and time are combined as Manila local time and must be in the future. In one transaction the referral becomes `under_review + for_interview`, and `interview` is inserted or updated by its unique `referral_id`. Accepted/rejected responses return `409`. Response uses endpoint 12.

### 15. PATCH `/employer/referrals/:referralId/reject`

Body: `{ "remark": "Optional reason" }`; `remark` may be omitted or `null`. Pending/for-interview responses are eligible. A sent referral follows the valid `sent -> under_review -> closed` path, ending at `closed + rejected` transactionally. Prior acceptance cannot use this endpoint. Response uses endpoint 12.

### 16. GET `/employer/referrals/:referralId/documents/:documentId/download`

Streams a `student_requirement_submission` as an attachment. The referral must belong to the company and the submission must belong to that referral's student. The server accepts only the stored `/uploads/requirements/<single generated filename>` form, resolves it under the requirement root, and returns `404` for a missing record, unsafe path, or missing file. MIME/filename metadata comes from the requirement row and safe extension mapping.

## Internship assignment workflow

### 17. GET `/employer/internship-assignment-candidates`

Query: `search?` (student or job title), `studentResponse? = pending | accepted | declined`, `page?`, `limit?`. Only referrals with employer `company_response = accepted` are included.

```json
{
  "data": [
    {
      "referralId": 91,
      "applicationId": 80,
      "studentId": 33,
      "studentFullName": "Jamie Cruz",
      "opportunityId": 44,
      "jobTitle": "Software Developer Intern",
      "companyName": "Example Corporation",
      "acceptanceDate": "2026-08-20T01:00:00.000Z",
      "studentResponse": "accepted",
      "studentRespondedAt": "2026-08-21T01:00:00.000Z",
      "internshipAssignmentId": null
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

The raw student enum is `declined` (a UI may label it “Rejected”).

### 18. POST `/employer/referrals/:referralId/internship-assignment`

```json
{
  "workingDays": "weekdays",
  "requiredHours": 400,
  "startDate": "2026-09-01",
  "expectedEndDate": "2026-12-31",
  "startShift": "08:00",
  "endShift": "17:00"
}
```

`workingDays` accepts only `weekdays` or `weekends`; hours are positive; expected end is optional/null and cannot precede start; end shift must follow start shift. Company and job title are not body fields and are rejected by global whitelist validation. They are derived through referral -> application -> opportunity -> company. Creation requires employer acceptance, student acceptance, and no existing assignment. New status is `pending`.

Response uses the endpoint 25 detail shape.

### 19. PATCH `/employer/referrals/:referralId/withdraw-acceptance`

The employer withdraws a previously accepted referral, transitioning company response from `accepted -> rejected`. In one transaction, `referral.company_response` is set to `'rejected'`, `company_responded_at` is updated, and status history records the authenticated employer actor. Response returns `200` with the updated referral model.

## Attendance

The database trigger automatically computes attendance rendered hours, subtracting the fixed 1-hour lunch break:

```text
renderedHours = max((timeOut - timeIn) - 1 hour, 0)
expectedNetHours = max((endShift - startShift) - 1 hour, 0)
```

Values are rounded to two decimals. Missing `time_out` is `incomplete`; less/equal/greater than expected becomes `undertime`/`complete`/`overtime`.

Categories are mutually exclusive: an `on_time` row is `present`, a `late` row is `late`, and a missing scheduled row after shift end is `absent`. Weekdays are Monday-Friday and weekends Saturday-Sunday. No virtual flexible-schedule absences are generated. Future dates produce no absence rows. Today's missing row becomes absent only after `end_shift` in Manila.

### 20. GET `/employer/attendance/summary`

Query: `date?` (defaults to current Manila date).

```json
{ "totalActive": 8, "present": 5, "late": 2, "absent": 1 }
```

Always `totalActive = present + late + absent`. Applicability depends on the selected Manila date:

- Today uses assignments whose current persisted status is `ongoing`.
- A historical date uses assignments with `start_date <= selectedDate` whose actual terminal date is null or is on/after the selected date. The terminal date is inclusive.
- A future date returns no attendance or absence rows.

For completed assignments the actual terminal date is `internship_assignment.end_date`. For cancelled and withdrawn assignments it is the Manila calendar date of the corresponding transition in `internship_assignment_status_history.changed_at`. Pending and ongoing assignments have no terminal date. `expected_end_date` is not an actual terminal boundary.

### 21. GET `/employer/attendance`

Query: `date?`, `search?` (student or job title), `status? = present | late | absent`, `page?`, `limit?`.

```json
{
  "data": [
    {
      "internshipAssignmentId": 61,
      "studentId": 33,
      "studentFullName": "Jamie Cruz",
      "jobTitle": "Software Developer Intern",
      "date": "2026-09-02",
      "status": "present",
      "timeIn": "08:00:00",
      "timeOut": "17:00:00",
      "renderedHours": 8,
      "renderedHoursStatus": "complete"
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

A virtual absent row has null times, `renderedHours = 0`, and `renderedHoursStatus = incomplete`.

The same today/historical/future applicability policy documented for endpoint 20 applies to this list.

### 22. GET `/employer/internships/:internshipAssignmentId/attendance`

Returns company-scoped header and history. Actual attendance remains visible regardless of the assignment's current terminal status and is retained even on an exceptional nonscheduled day. Virtual absence rows are generated only for scheduled elapsed days from `start_date` through the inclusive actual terminal date, or through the current Manila date when no actual terminal date exists. `expected_end_date` does not stop virtual absence generation. Cancelled/withdrawn terminal dates come from `internship_assignment_status_history.changed_at` interpreted in `Asia/Manila`.

```json
{
  "header": {
    "internshipAssignmentId": 61,
    "studentFullName": "Jamie Cruz",
    "jobTitle": "Software Developer Intern",
    "requiredHours": 400,
    "renderedHours": 96.5,
    "remainingHours": 303.5
  },
  "history": [
    {
      "date": "2026-09-02",
      "timeIn": "08:11:00",
      "timeInStatus": "late",
      "timeOut": "17:00:00",
      "renderedHours": 7.82,
      "renderedHoursStatus": "undertime"
    }
  ]
}
```

Virtual absence history rows use null `timeIn`, `timeInStatus`, and `timeOut`, zero hours, and `incomplete`.

## Manage internships

Relevant tables are `internship_assignment`, `referral`, `application`, `opportunity`, `company`, `student`, and raw `attendance_record`. `vw_internship_assignment_details` describes the ownership chain, but totals are recomputed from raw attendance.

`Awaiting Completion` is not a DB enum. It means persisted `ongoing` with recomputed rendered hours greater than or equal to required hours. Remaining hours are `max(required - rendered, 0)`.

### 23. GET `/employer/internships/summary`

```json
{
  "totalInterns": 12,
  "ongoingInterns": 5,
  "completedInterns": 4,
  "awaitingCompletionInterns": 2
}
```

Awaiting completion is excluded from `ongoingInterns`. Current schema has no soft-deleted assignment rows, so `totalInterns` counts all company-owned assignments.

### 24. GET `/employer/internships`

Query: `search?` (student/job title), `status? = pending | ongoing | awaiting_completion | completed | withdrawn | cancelled`, `page?`, `limit?`. `ongoing` excludes derived awaiting-completion rows; `awaiting_completion` is evaluated in application code.

```json
{
  "data": [
    {
      "internshipAssignmentId": 61,
      "studentId": 33,
      "studentFullName": "Jamie Cruz",
      "jobTitle": "Software Developer Intern",
      "requiredHours": 400,
      "renderedHours": 401.25,
      "remainingHours": 0,
      "assignmentStatus": "ongoing",
      "displayStatus": "Awaiting Completion"
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

Other display values are `Pending`, `On Going`, `Completed`, `Withdrawn by Student`, and `Cancelled`.

### 25. GET `/employer/internships/:internshipAssignmentId`

```json
{
  "intern": {
    "studentId": 33,
    "studentFullName": "Jamie Cruz",
    "jobTitle": "Software Developer Intern",
    "requiredHours": 400,
    "renderedHours": 401.25,
    "remainingHours": 0
  },
  "assignment": {
    "internshipAssignmentId": 61,
    "companyName": "Example Corporation",
    "jobTitle": "Software Developer Intern",
    "workingDays": "weekdays",
    "requiredHours": 400,
    "startDate": "2026-09-01",
    "expectedEndDate": "2026-12-31",
    "endDate": null,
    "startShift": "08:00:00",
    "endShift": "17:00:00"
  },
  "status": {
    "assignmentStatus": "ongoing",
    "displayStatus": "Awaiting Completion",
    "targetHours": 400,
    "renderedHours": 401.25,
    "remainingHours": 0,
    "canEdit": false,
    "canComplete": true,
    "canCancel": true,
    "canDelete": false
  }
}
```

`canEdit` is pending only; `canComplete` is eligible ongoing only; `canCancel` is pending/ongoing; `canDelete` describes the final terminal-state behavior.

### 26. PATCH `/employer/internships/:internshipAssignmentId`

Editable body uses the same six assignment fields as endpoint 18; every field is optional for PATCH. Company, job title, and referral cannot change. The merged assignment is revalidated. Non-pending status returns `409`.

Response uses endpoint 25.

### 27. PATCH `/employer/internships/:internshipAssignmentId/cancel`

Transactionally transitions company-owned `pending` or `ongoing` to `cancelled`, with the authenticated employer propagated to status history. Terminal statuses return `409`. No reason field and no deletion are performed. Response uses endpoint 25.

### 28. PATCH `/employer/internships/:internshipAssignmentId/complete`

Requires persisted `ongoing` and recomputed rendered hours at least equal to required hours. In one actor-aware transaction it transitions to `completed` and sets `end_date` to the current Manila date. Otherwise it returns `409`. Response uses endpoint 25.

### 29. DELETE `/employer/internships/:internshipAssignmentId`

Soft deletes terminal assignments (`completed`, `cancelled`, or `withdrawn`). The server verifies company ownership and that the assignment is in a terminal status. It sets `internship_assignment.deleted_at = CURRENT_TIMESTAMP` and returns `200` with the soft-deleted assignment. Physical deletion is never used.

## Automatic assignment start

At `00:00 Asia/Manila` every day, and once on module startup, the scheduler selects `pending` assignments whose `start_date` has arrived. Each candidate is rechecked and updated to `ongoing` in its own transaction. The status actor is `null` for this system transition, allowing the existing trigger to append history without impersonating a user. Non-pending/future rows are untouched; one failed assignment does not partially update or prevent independent candidates from being attempted.

## Status transitions

```text
Opportunity: open -> closed -> archived

Referral interview: sent -> under_review
                    pending -> for_interview
Referral accept:    pending|for_interview -> accepted (under_review)
Referral reject:    sent -> under_review -> closed
                    pending|for_interview -> rejected
Referral withdraw:  accepted -> rejected

Assignment: pending -> ongoing (scheduler)
            pending|ongoing -> cancelled
            ongoing -> completed (hours requirement met)
            withdrawn remains a student-side terminal state
            terminal assignments -> soft deleted (deleted_at set)
```

All multi-step workflow actions use transactions and the existing status-actor mechanism. Expected invalid states are reported as `409` rather than exposing database constraint text.
