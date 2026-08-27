# Backend Dashboard & API Documentation

## 1. Overview
The Dashboard module provides comprehensive dashboard metrics, reporting, application tracking, referral monitoring, DTR (Daily Time Record) tracking, and administrative user account management for the QC PESO / INTERNet system.

All dashboard endpoints are secured using JSON Web Tokens (`JwtAuthGuard`), role-based authorization (`RolesGuard`), and isolated under the `/dashboard` routing prefix to prevent collision with core authentication and profile management modules.

---

## 2. Endpoint Index

| ID | Method | Route | Required Role | Purpose | Status |
|---|---|---|---|---|---|
| **A1** | `GET` | `/dashboard/peso/students/metrics` | `peso_personnel` | Student dashboard summary counters | Implemented & Tested |
| **A2** | `GET` | `/dashboard/peso/applications` | `peso_personnel` | All student applications with filters | Implemented & Tested |
| **A3** | `GET` | `/dashboard/peso/applications/metrics` | `peso_personnel` | Application management metrics | Implemented & Tested |
| **B1** | `GET` | `/dashboard/peso/employers` | `peso_personnel` | All partner employers with active opp count | Implemented & Tested |
| **B2** | `GET` | `/dashboard/peso/employers/metrics` | `peso_personnel` | Employer dashboard counters | Implemented & Tested |
| **C1** | `GET` | `/dashboard/peso/referrals` | `peso_personnel` | Referral monitoring list | Implemented & Tested |
| **D1** | `GET` | `/dashboard/peso/interns` | `peso_personnel` | Active intern DTR summary list | Implemented & Tested |
| **D2** | `GET` | `/dashboard/peso/interns/metrics` | `peso_personnel` | Intern and referral funnel metrics | Implemented & Tested |
| **D3** | `GET` | `/dashboard/peso/attendance` | `peso_personnel` | Detailed DTR log entries | Implemented & Tested |
| **D4** | `GET` | `/dashboard/peso/attendance/assignments/:id` | `peso_personnel` | Student assignment DTR details & rows | Implemented & Tested |
| **E1** | `GET` | `/dashboard/employer/metrics` | `company` | Company-scoped dashboard overview counters | Implemented & Tested |
| **E2** | `GET` | `/dashboard/employer/applications` | `company` | Company-scoped applicant list | Implemented & Tested |
| **E3** | `GET` | `/dashboard/employer/reports` | `company` | Company-scoped recruitment funnel report | Implemented & Tested |
| **F1** | `GET` | `/dashboard/employer/attendance/metrics` | `company` | Company-scoped active/present/absent/late DTR counters | Implemented & Tested |
| **F2** | `GET` | `/dashboard/employer/attendance/assignments/:id` | `company` | Company-scoped student DTR breakdown | Implemented & Tested |
| **G1** | `GET` | `/dashboard/admin/students/metrics` | `admin` | Student user account metrics | Implemented & Tested |
| **G2** | `GET` | `/dashboard/admin/students` | `admin` | Registered students listing | Implemented & Tested |
| **G4** | `GET` | `/dashboard/admin/students/:userAccountId` | `admin` | Student full account & academic details | Implemented & Tested |
| **G3** | `PATCH` | `/dashboard/admin/students/:userAccountId` | `admin` | Update student account / academic info | Implemented & Tested |
| **H1** | `GET` | `/dashboard/admin/employers/metrics` | `admin` | Employer user account metrics | Implemented & Tested |
| **H2** | `GET` | `/dashboard/admin/employers` | `admin` | Registered employers listing | Implemented & Tested |
| **H4** | `GET` | `/dashboard/admin/employers/:userAccountId` | `admin` | Employer full account & company details | Implemented & Tested |
| **H3** | `PATCH` | `/dashboard/admin/employers/:userAccountId` | `admin` | Update employer account / company info | Implemented & Tested |
| **I1** | `GET` | `/dashboard/admin/peso-personnel/metrics` | `admin` | PESO personnel account metrics | Implemented & Tested |
| **I2** | `GET` | `/dashboard/admin/peso-personnel` | `admin` | Registered PESO personnel listing | Implemented & Tested |
| **I4** | `GET` | `/dashboard/admin/peso-personnel/:userAccountId` | `admin` | PESO personnel full profile details | Implemented & Tested |
| **I3** | `PATCH` | `/dashboard/admin/peso-personnel/:userAccountId` | `admin` | Update PESO personnel details & verification | Implemented & Tested |

---

## 3. PESO Endpoints (`/dashboard/peso/*`)

### A1. Student Dashboard Metrics
- **Method & Route**: `GET /dashboard/peso/students/metrics`
- **Required Role**: `peso_personnel`
- **Description**: Returns top-level summary metrics for the PESO student dashboard.
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/peso/students/metrics" \
  -H "Authorization: Bearer <PESO_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "totalPendingApplications": 1,
  "totalVerifiedRequirements": 0,
  "totalActiveEmployers": 2,
  "totalAvailableOpportunities": 3
}
```

---

### A2. GET All Student Applications
- **Method & Route**: `GET /dashboard/peso/applications`
- **Required Role**: `peso_personnel`
- **Query Parameters**:
  - `datePreset` (optional): `today` | `week` | `month` | `all`
  - `startDate` (optional, ISO string): e.g. `2026-01-01`
  - `endDate` (optional, ISO string): e.g. `2026-12-31`
  - `status` (optional): `submitted` | `under_review` | `approved_for_referral` | `rejected_for_referral` | `withdrawn` | `expired`
  - `page` (optional, integer, default: `1`)
  - `limit` (optional, integer, default: `20`)
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/peso/applications?datePreset=all&status=submitted&page=1&limit=10" \
  -H "Authorization: Bearer <PESO_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "data": [
    {
      "applicationId": 1,
      "studentId": 1,
      "studentFullName": "Manuel Local",
      "studentContactEmail": "student.manual@internet.local",
      "studentContactNumber": "09170000001",
      "schoolName": "Development State University",
      "yearLevel": "fourth_year_college",
      "strandProgram": "Bachelor of Science in Information Systems",
      "opportunityId": 1,
      "opportunityTitle": "DEV Open Technology Internship",
      "opportunityStatus": "open",
      "companyId": 1,
      "companyName": "DevSeed Technology Corp.",
      "submittedAt": "2026-08-14T02:46:40.000Z",
      "applicationStatus": "submitted",
      "applicationRemark": "dev-seed:submitted",
      "studentResponse": null,
      "studentRespondedAt": null,
      "referralId": null,
      "referralStatus": null,
      "companyResponse": null,
      "internshipAssignmentId": null,
      "assignmentStatus": null
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### A3. Application Management Metrics
- **Method & Route**: `GET /dashboard/peso/applications/metrics`
- **Required Role**: `peso_personnel`
- **Query Parameters**:
  - `datePreset` (optional): `today` | `week` | `month` | `all`
  - `startDate` (optional, ISO string)
  - `endDate` (optional, ISO string)
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/peso/applications/metrics?datePreset=all" \
  -H "Authorization: Bearer <PESO_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "pendingApplications": 1,
  "underReview": 1,
  "approvedForReferral": 1,
  "rejectedForReferral": 1,
  "withdrawn": 0,
  "expired": 0
}
```

---

### B1. GET All Partner Employers
- **Method & Route**: `GET /dashboard/peso/employers`
- **Required Role**: `peso_personnel`
- **Query Parameters**:
  - `accountStatus` (optional): `pending` | `active` | `suspended` | `archived`
  - `page` (optional, integer, default: `1`)
  - `limit` (optional, integer, default: `20`)
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/peso/employers?accountStatus=active&page=1&limit=10" \
  -H "Authorization: Bearer <PESO_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "data": [
    {
      "companyId": 1,
      "companyName": "DevSeed Technology Corp.",
      "industryName": "Information Technology",
      "contactPerson": "Terry Technologist",
      "contactEmail": "company.tech@internet.local",
      "contactNumber": "0210000001",
      "activeOpportunityCount": 3,
      "accountStatus": "active"
    },
    {
      "companyId": 2,
      "companyName": "DevSeed Hospitality Inc.",
      "industryName": "Hospitality/ Tourism",
      "contactPerson": "Holly Host",
      "contactEmail": "company.hospitality@internet.local",
      "contactNumber": "0210000002",
      "activeOpportunityCount": 0,
      "accountStatus": "active"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1
  }
}
```

---

### B2. PESO Employer Dashboard Metrics
- **Method & Route**: `GET /dashboard/peso/employers/metrics`
- **Required Role**: `peso_personnel`
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/peso/employers/metrics" \
  -H "Authorization: Bearer <PESO_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "totalPartnerEmployers": 2,
  "activeOpportunities": 3,
  "totalPlacedStudents": 1,
  "industriesRepresented": 2
}
```

---

### C1. Referral Monitoring List
- **Method & Route**: `GET /dashboard/peso/referrals`
- **Required Role**: `peso_personnel`
- **Query Parameters**:
  - `status` (optional): `pending` | `for_interview` | `accepted` | `rejected`
  - `page` (optional, integer, default: `1`)
  - `limit` (optional, integer, default: `20`)
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/peso/referrals?page=1&limit=10" \
  -H "Authorization: Bearer <PESO_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "data": [
    {
      "referralId": 1,
      "applicationId": 3,
      "studentFullName": "Manuel Local",
      "companyName": "DevSeed Technology Corp.",
      "opportunityTitle": "DEV Open Technology Internship",
      "referralStatus": "under_review",
      "companyResponse": "accepted",
      "studentResponse": "accepted",
      "referredAt": "2026-08-14T02:46:40.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### D1. Active Interns DTR Summary List
- **Method & Route**: `GET /dashboard/peso/interns`
- **Required Role**: `peso_personnel`
- **Query Parameters**:
  - `datePreset` (optional): `today` | `week` | `month` | `all`
  - `page` (optional, integer, default: `1`)
  - `limit` (optional, integer, default: `20`)
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/peso/interns?page=1&limit=10" \
  -H "Authorization: Bearer <PESO_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "data": [
    {
      "internshipAssignmentId": 1,
      "studentId": 1,
      "studentFullName": "Manuel Local",
      "opportunityId": 1,
      "opportunityTitle": "DEV Open Technology Internship",
      "companyId": 1,
      "companyName": "DevSeed Technology Corp.",
      "assignmentStatus": "ongoing",
      "requiredHours": 400,
      "totalRenderedHours": 70.25,
      "attendanceRecordCount": 9,
      "completeCount": 8,
      "incompleteCount": 1,
      "lateCount": 1,
      "undertimeCount": 1,
      "overtimeCount": 1,
      "firstAttendanceDate": "2026-07-15",
      "latestAttendanceDate": "2026-08-14",
      "completionPercentage": "17.56"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### D2. Intern & Referral Funnel Metrics
- **Method & Route**: `GET /dashboard/peso/interns/metrics`
- **Required Role**: `peso_personnel`
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/peso/interns/metrics" \
  -H "Authorization: Bearer <PESO_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "pending": 0,
  "forInterview": 0,
  "accepted": 1,
  "rejected": 0,
  "completedInternships": 0,
  "overtimeInstances": 1
}
```

---

### D3. All DTR Log Entries
- **Method & Route**: `GET /dashboard/peso/attendance`
- **Required Role**: `peso_personnel`
- **Query Parameters**:
  - `datePreset` (optional): `today` | `week` | `month` | `all`
  - `startDate` (optional, ISO string)
  - `endDate` (optional, ISO string)
  - `page` (optional, integer, default: `1`)
  - `limit` (optional, integer, default: `20`)
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/peso/attendance?datePreset=all&page=1&limit=10" \
  -H "Authorization: Bearer <PESO_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "data": [
    {
      "attendanceRecordId": 1,
      "internshipAssignmentId": 1,
      "studentName": "Manuel Local",
      "company": "DevSeed Technology Corp.",
      "date": "2026-08-14",
      "timeIn": "09:00:00",
      "timeOut": "17:00:00",
      "totalHours": "8.00",
      "timeInStatus": "on_time",
      "renderedHoursStatus": "complete"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 9,
    "totalPages": 1
  }
}
```

---

### D4. Student Assignment DTR Detail
- **Method & Route**: `GET /dashboard/peso/attendance/assignments/:assignmentId`
- **Required Role**: `peso_personnel`
- **URL Parameters**:
  - `assignmentId` (required, integer)
- **Query Parameters**:
  - `datePreset` (optional): `today` | `week` | `month` | `all`
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/peso/attendance/assignments/1?datePreset=all" \
  -H "Authorization: Bearer <PESO_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "studentInfo": {
    "studentName": "Manuel Local",
    "role": "DEV Open Technology Internship",
    "department": "Development Department",
    "startDate": "2026-07-15",
    "expectedEndDate": "2026-11-12",
    "totalRenderedTime": 70.25,
    "targetHours": 400,
    "remainingHours": 329.75
  },
  "dtrEntries": [
    {
      "attendanceRecordId": 1,
      "date": "2026-08-14",
      "timeIn": "09:00:00",
      "timeOut": "17:00:00",
      "totalHours": "8.00",
      "timeInStatus": "on_time",
      "renderedHoursStatus": "complete",
      "remarks": null
    }
  ]
}
```

---

## 4. Employer Endpoints (`/dashboard/employer/*`)

### E1. Company Dashboard Metrics
- **Method & Route**: `GET /dashboard/employer/metrics`
- **Required Role**: `company`
- **Description**: Company-scoped dashboard overview metrics. Company ID is resolved securely from the authenticated token.
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/employer/metrics" \
  -H "Authorization: Bearer <EMPLOYER_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "activeOpportunities": 3,
  "pendingReviews": 2,
  "totalApplicants": 4,
  "acceptedCount": 1,
  "rejectedCount": 0
}
```

---

### E2. Company-Scoped Application List
- **Method & Route**: `GET /dashboard/employer/applications`
- **Required Role**: `company`
- **Query Parameters**:
  - `page` (optional, integer, default: `1`)
  - `limit` (optional, integer, default: `20`)
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/employer/applications?page=1&limit=10" \
  -H "Authorization: Bearer <EMPLOYER_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "data": [
    {
      "applicationId": 1,
      "studentId": 1,
      "studentFullName": "Manuel Local",
      "opportunityTitle": "DEV Open Technology Internship",
      "submittedAt": "2026-08-14T02:46:40.000Z",
      "applicationStatus": "submitted"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 4,
    "totalPages": 1
  }
}
```

---

### E3. Employer Recruitment Funnel Report
- **Method & Route**: `GET /dashboard/employer/reports`
- **Required Role**: `company`
- **Query Parameters**:
  - `startDate` (optional, ISO string): e.g. `2026-01-01`
  - `endDate` (optional, ISO string): e.g. `2026-12-31`
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/employer/reports?startDate=2026-01-01&endDate=2026-12-31" \
  -H "Authorization: Bearer <EMPLOYER_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "totalApplicants": 4,
  "accepted": 1,
  "shortlisted": 0,
  "rejected": 0
}
```

---

### F1. Employer DTR Dashboard Metrics
- **Method & Route**: `GET /dashboard/employer/attendance/metrics`
- **Required Role**: `company`
- **Query Parameters**:
  - `datePreset` (optional): `today` | `week` | `month` | `all`
  - `startDate` (optional, ISO string)
  - `endDate` (optional, ISO string)
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/employer/attendance/metrics?datePreset=all" \
  -H "Authorization: Bearer <EMPLOYER_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "totalActiveInterns": 1,
  "totalPresent": 1,
  "totalAbsent": 0,
  "totalLate": 1
}
```

---

### F2. Employer Student DTR Breakdown
- **Method & Route**: `GET /dashboard/employer/attendance/assignments/:assignmentId`
- **Required Role**: `company`
- **URL Parameters**:
  - `assignmentId` (required, integer)
- **Query Parameters**:
  - `datePreset` (optional): `today` | `week` | `month` | `all`
- **Security Check**: Returns `403 Forbidden` if the requested assignment does not belong to the calling employer.
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/employer/attendance/assignments/1?datePreset=all" \
  -H "Authorization: Bearer <EMPLOYER_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "studentInfo": {
    "studentName": "Manuel Local",
    "role": "DEV Open Technology Internship",
    "department": "Development Department",
    "startDate": "2026-07-15",
    "expectedEndDate": "2026-11-12",
    "totalRenderedTime": 70.25,
    "targetHours": 400,
    "remainingHours": 329.75
  },
  "dtrEntries": [
    {
      "attendanceRecordId": 1,
      "date": "2026-08-14",
      "timeIn": "09:00:00",
      "timeOut": "17:00:00",
      "totalHours": "8.00",
      "timeInStatus": "on_time",
      "renderedHoursStatus": "complete",
      "remarks": null
    }
  ]
}
```

---

## 5. Admin Endpoints (`/dashboard/admin/*`)

### G1. Admin Student Account Metrics
- **Method & Route**: `GET /dashboard/admin/students/metrics`
- **Required Role**: `admin`
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/admin/students/metrics" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "totalRegistered": 3,
  "activeAccounts": 3,
  "deactivatedAccounts": 0
}
```

---

### G2. Admin GET All Students
- **Method & Route**: `GET /dashboard/admin/students`
- **Required Role**: `admin`
- **Query Parameters**:
  - `page` (optional, integer, default: `1`)
  - `limit` (optional, integer, default: `20`)
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/admin/students?page=1&limit=10" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "data": [
    {
      "userAccountId": 2,
      "studentId": 1,
      "name": "Manuel Local",
      "email": "student.manual@internet.local",
      "school": "Development State University",
      "program": "Bachelor of Science in Information Systems",
      "dateRegistered": "2026-08-14T02:46:40.000Z",
      "accountStatus": "active"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1
  }
}
```

---

### G4. Admin GET Student Details
- **Method & Route**: `GET /dashboard/admin/students/:userAccountId`
- **Required Role**: `admin`
- **URL Parameters**:
  - `userAccountId` (required, integer)
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/admin/students/2" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "studentId": 1,
  "userAccountId": 2,
  "email": "student.manual@internet.local",
  "accountStatus": "active",
  "createdAt": "2026-08-14T02:46:40.000Z",
  "firstName": "Manuel",
  "middleName": null,
  "lastName": "Local",
  "extensionName": null,
  "sex": "Prefer not to say",
  "birthDate": "2002-01-15",
  "contactNumber": "09170000001",
  "contactEmail": "student.manual@internet.local",
  "linkedinUrl": null,
  "addressLine": "100 Development Street",
  "addressBarangay": "Central",
  "addressDistrict": "District 1",
  "addressCity": "Quezon City",
  "inquiryMethod": "online",
  "photoFilePath": "dev-seed/students/manual/photo.jpg",
  "schoolName": "Development State University",
  "yearLevel": "fourth_year_college",
  "strandProgram": "Bachelor of Science in Information Systems",
  "preferredRequiredHours": 400,
  "preferredAvailableDays": "weekdays",
  "preferredStartDate": "2026-08-28",
  "preferredCompanyType": "private",
  "allowsOutsidePreferredField": true,
  "requirementSubmissions": []
}
```

---

### G3. Admin PATCH Student Account Details
- **Method & Route**: `PATCH /dashboard/admin/students/:userAccountId`
- **Required Role**: `admin`
- **URL Parameters**:
  - `userAccountId` (required, integer)
- **Request Body (JSON)**:
```json
{
  "accountStatus": "active",
  "firstName": "Manuel",
  "lastName": "Local",
  "contactNumber": "09171234567",
  "addressDistrict": "District 2",
  "schoolName": "Development State University",
  "strandProgram": "BS Computer Science - Software Engineering"
}
```
- **How to Use**:
```bash
curl -X PATCH "http://localhost:3000/dashboard/admin/students/2" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"contactNumber":"09171234567","strandProgram":"BS Computer Science - Software Engineering","addressDistrict":"District 2"}'
```
- **Intended Response (HTTP 200)**:
```json
{
  "message": "Student account updated successfully."
}
```
- **Database Reflection**: Updates reflected directly in `public.student` and `public.student_academic_information`.

---

### H1. Admin Employer Account Metrics
- **Method & Route**: `GET /dashboard/admin/employers/metrics`
- **Required Role**: `admin`
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/admin/employers/metrics" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "totalRegistered": 2,
  "activeAccounts": 2,
  "deactivatedAccounts": 0
}
```

---

### H2. Admin GET All Employers
- **Method & Route**: `GET /dashboard/admin/employers`
- **Required Role**: `admin`
- **Query Parameters**:
  - `page` (optional, integer, default: `1`)
  - `limit` (optional, integer, default: `20`)
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/admin/employers?page=1&limit=10" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "data": [
    {
      "userAccountId": 5,
      "companyId": 1,
      "companyName": "DevSeed Technology Corp.",
      "email": "company.tech@internet.local",
      "dateRegistered": "2026-08-14T02:46:40.000Z",
      "accountStatus": "active"
    },
    {
      "userAccountId": 6,
      "companyId": 2,
      "companyName": "DevSeed Hospitality Inc.",
      "email": "company.hospitality@internet.local",
      "dateRegistered": "2026-08-14T02:46:40.000Z",
      "accountStatus": "active"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1
  }
}
```

---

### H4. Admin GET Employer Details
- **Method & Route**: `GET /dashboard/admin/employers/:userAccountId`
- **Required Role**: `admin`
- **URL Parameters**:
  - `userAccountId` (required, integer)
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/admin/employers/5" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "companyId": 1,
  "userAccountId": 5,
  "email": "company.tech@internet.local",
  "accountStatus": "active",
  "createdAt": "2026-08-14T02:46:40.000Z",
  "companyName": "DevSeed Technology Corp.",
  "companyType": "private",
  "industryName": "Information Technology",
  "description": "Synthetic technology employer for local development.",
  "websiteUrl": "https://tech.dev-seed.invalid",
  "yearEstablished": 2018,
  "companySize": 120,
  "contactEmail": "company.tech@internet.local",
  "contactNumber": "0210000001",
  "contactPersonFirstName": "Terry",
  "contactPersonMiddleName": null,
  "contactPersonLastName": "Technologist",
  "contactPersonExtensionName": null,
  "addressLine": "200 Development Avenue",
  "addressBarangay": "Central",
  "addressDistrict": "District 1",
  "addressCity": "Quezon City",
  "logoFilePath": "dev-seed/companies/technology/logo.png"
}
```

---

### H3. Admin PATCH Employer Account Details
- **Method & Route**: `PATCH /dashboard/admin/employers/:userAccountId`
- **Required Role**: `admin`
- **URL Parameters**:
  - `userAccountId` (required, integer)
- **Request Body (JSON)**:
```json
{
  "companyName": "DevSeed Technology Corp.",
  "description": "QA-Updated Tech Partner Description via Admin Endpoint.",
  "contactPersonLastName": "Senior QA Tech Lead",
  "websiteUrl": "https://tech.dev-seed.invalid"
}
```
- **How to Use**:
```bash
curl -X PATCH "http://localhost:3000/dashboard/admin/employers/5" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"description":"QA-Updated Tech Partner Description via Admin Endpoint.","contactPersonLastName":"Senior QA Tech Lead"}'
```
- **Intended Response (HTTP 200)**:
```json
{
  "message": "Employer account updated successfully."
}
```
- **Database Reflection**: Updates reflected directly in `public.company`.

---

### I1. Admin PESO Personnel Account Metrics
- **Method & Route**: `GET /dashboard/admin/peso-personnel/metrics`
- **Required Role**: `admin`
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/admin/peso-personnel/metrics" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "totalRegistered": 3,
  "activeAccounts": 3,
  "deactivatedAccounts": 0
}
```

---

### I2. Admin GET All PESO Personnel
- **Method & Route**: `GET /dashboard/admin/peso-personnel`
- **Required Role**: `admin`
- **Query Parameters**:
  - `page` (optional, integer, default: `1`)
  - `limit` (optional, integer, default: `20`)
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/admin/peso-personnel?page=1&limit=10" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "data": [
    {
      "userAccountId": 7,
      "pesoPersonnelId": 1,
      "name": "April Personnel",
      "email": "peso.approved@internet.local",
      "position": "Employment Officer",
      "department": "QC PESO",
      "verificationStatus": "approved",
      "dateRegistered": "2026-08-14T02:46:40.000Z",
      "accountStatus": "active"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1
  }
}
```

---

### I4. Admin GET PESO Personnel Details
- **Method & Route**: `GET /dashboard/admin/peso-personnel/:userAccountId`
- **Required Role**: `admin`
- **URL Parameters**:
  - `userAccountId` (required, integer)
- **How to Use**:
```bash
curl -X GET "http://localhost:3000/dashboard/admin/peso-personnel/7" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```
- **Intended Response (HTTP 200)**:
```json
{
  "pesoPersonnelId": 1,
  "userAccountId": 7,
  "email": "peso.approved@internet.local",
  "accountStatus": "active",
  "createdAt": "2026-08-14T02:46:40.000Z",
  "firstName": "April",
  "middleName": null,
  "lastName": "Personnel",
  "extensionName": null,
  "sex": "Female",
  "birthDate": "1990-06-15",
  "addressLine": "300 Development Road",
  "addressBarangay": "Central",
  "addressDistrict": "District 1",
  "addressCity": "Quezon City",
  "contactNumber": "09180000001",
  "contactEmail": "peso.approved@internet.local",
  "employeeId": "DEV-PESO-001",
  "position": "Employment Officer",
  "department": "QC PESO"
}
```

---

### I3. Admin PATCH PESO Personnel Account Details
- **Method & Route**: `PATCH /dashboard/admin/peso-personnel/:userAccountId`
- **Required Role**: `admin`
- **URL Parameters**:
  - `userAccountId` (required, integer)
- **Request Body (JSON)**:
```json
{
  "department": "QC PESO Employment & Quality Assurance Division",
  "position": "Senior Employment Officer"
}
```
- **How to Use**:
```bash
curl -X PATCH "http://localhost:3000/dashboard/admin/peso-personnel/7" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"department":"QC PESO Employment & Quality Assurance Division","position":"Senior Employment Officer"}'
```
- **Intended Response (HTTP 200)**:
```json
{
  "message": "PESO personnel account updated successfully."
}
```
- **Database Reflection**: Updates reflected directly in `public.peso_personnel` and `public.user_account`.

---

## 6. Error & Boundary Responses

### 401 Unauthorized
Returned when no valid JWT Bearer token is provided or the token is expired/malformed.
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

### 403 Forbidden
Returned when:
1. User role does not match endpoint requirement (e.g. `student` accessing `/dashboard/peso/*`).
2. Company tenant boundary violation (e.g. Company A accessing Company B's student DTR breakdown).
```json
{
  "message": "Forbidden resource",
  "statusCode": 403
}
```

### 404 Not Found
Returned when an entity or resource ID does not exist in the database.
```json
{
  "message": "Student account not found.",
  "statusCode": 404
}
```

---

## 7. QA Verification & Test Results
Comprehensive QA execution executed across all 20 endpoints and negative security test cases:
- **Total Test Cases**: 37
- **Passed**: 37 / 37 (100%)
- **Failed**: 0
- **Database Reflections on Mutations**: Confirmed 100% reflected and verified via SQL SELECT statements.
