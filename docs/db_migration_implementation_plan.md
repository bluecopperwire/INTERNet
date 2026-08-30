# Database Migration Implementation Plan

## Executive Summary

This document outlines the database migration and schema redesign implementation plan for the INTERNet project. The migration resolves critical schema and workflow blockers identified in the legacy architecture, unblocking core functionality for administrators, employers, students, and QC PESO personnel.

---

## 1. Migration Scope & Schema Changes

The approved migration (`1787788800000-ApprovedDatabaseRedesign.ts` / `002_approved_database_redesign.sql`) introduces eight key changes to the PostgreSQL schema:

### 1.1 Timed Account Suspensions (`user_account.suspended_until`)
- **Problem**: Admin suspension required a duration, but `user_account` only had `account_status = 'suspended'` with no expiry tracking or validation.
- **Solution**: Added nullable `suspended_until TIMESTAMPTZ` with check constraint `ck_user_account_suspension_expiry` and partial index `ix_user_account_suspended_until`. When `account_status = 'suspended'`, `suspended_until` must be non-null; when active or archived, `suspended_until` must be `NULL`.

### 1.2 Optional Employer Logo (`company.logo_file_path`)
- **Problem**: `company.logo_file_path` was `NOT NULL`, blocking company creation via admin API and employer signup before a logo was uploaded.
- **Solution**: Relaxed column nullability (`DROP NOT NULL`). Logos are updated via dedicated `PUT /employer/profile/image`. Constraint `ck_company_logo_file_path_not_blank` allows `NULL` or non-blank strings.

### 1.3 Free-Text Opportunity Allowance (`opportunity.allowance`)
- **Problem**: Binary `has_allowance` flag and numeric amount could not capture real-world stipend formats (e.g. "PHP 5,000 monthly", "Transportation allowance only", "PHP 500/day").
- **Solution**: Dropped `has_allowance` column; converted `allowance` to nullable `TEXT`. Database views (including `vw_opportunity_summary`) project `(allowance IS NOT NULL) AS has_allowance` for backward-compatible client reads.

### 1.4 Direct QC PESO Personnel Creation & Verification Removal
- **Problem**: Legacy schema forced mandatory `employee_id_file_path` and `verification_status` review gates for municipal PESO staff accounts.
- **Solution**: Removed `employee_id_file_path`, `verification_status`, and related review columns; dropped retired `peso_personnel_verification_history` table and `personnel_verification_status_enum` type. PESO personnel accounts are immediately active upon creation.

### 1.5 Employer Referral Acceptance Withdrawal
- **Problem**: The referral state machine trigger prohibited transitioning from `company_response = 'accepted'` to `'rejected'`.
- **Solution**: Updated `fn_validate_referral()` trigger to allow `accepted -> rejected` transitions, enabling employers to withdraw offers before assignment creation.

### 1.6 Soft Deletion of Internship Assignments (`deleted_at`)
- **Problem**: Deleting completed/cancelled internships violated relational integrity and destroyed attendance records.
- **Solution**: Added nullable `deleted_at TIMESTAMPTZ` to `internship_assignment` and partial index `ix_internship_assignment_deleted_at` (`WHERE deleted_at IS NOT NULL`). Deletion sets `deleted_at = CURRENT_TIMESTAMP`, preserving audit logs and attendance while filtering out deleted records from views (`vw_internship_assignment_details`, `vw_attendance_summary`, `vw_application_details`, `vw_referral_details`).

### 1.7 Attendance Lunch Break Deduction
- **Problem**: Rendered hours calculation did not deduct the statutory 1-hour lunch break for standard shifts.
- **Solution**: Updated `fn_derive_attendance()` to compute: `actual_interval := GREATEST(NEW.time_out - NEW.time_in - interval '1 hour', interval '0')`.

### 1.8 Year Level Enum Alignment
- **Problem**: `year_level_enum` contained non-standard `fifth_year_college`.
- **Solution**: Standardized to `grade_11`, `grade_12`, `first_year_college`, `second_year_college`, `third_year_college`, and `fourth_year_college`. Preflight check verifies no student records use `fifth_year_college`.

---

## 2. Unblocked Features & Previously Disabled Functionality

| Module | Endpoint / Feature | Previous Status | New Working Behavior |
|---|---|---|---|
| **Admin** | `POST /admin/employers` | 503 `DB-ADMIN-002` | 201 Created without logo requirement |
| **Admin** | `POST /admin/qc-peso` | 503 `DB-ADMIN-003` | 201 Created without verification barrier |
| **Admin** | `PATCH /admin/accounts/:id/status` (suspension) | 503 `DB-ADMIN-001` | 200 OK setting `suspended_until` timestamp |
| **Employer** | `POST /employer/opportunities` | 503 `DB-EMP-001` | 201 Created with free-text allowance |
| **Employer** | `PATCH /employer/opportunities/:id` | 503 `DB-EMP-001` | 200 OK updating free-text allowance |
| **Employer** | `PATCH /employer/referrals/:id/withdraw-acceptance` | 503 `DB-EMP-002` | 200 OK transitioning `accepted -> rejected` |
| **Employer** | `DELETE /employer/internships/:id` | 503 `DB-EMP-003` | 200 OK soft deleting with `deleted_at` |

---

## 3. Step-by-Step Setup & Migration Workflow for Developers

### Fresh Setup (New Developers)
1. Start PostgreSQL: `docker compose up -d postgres`
2. Configure `.env` in `backend/`
3. Run forward migrations: `npm run migration:run`
4. Seed reference industries: `npm run seed:reference`
5. Seed development data:
   ```powershell
   $env:NODE_ENV='development'; $env:ALLOW_DEV_SEED='true'; $env:DEV_SEED_PASSWORD='TestPassword123'; npm run seed:dev
   ```
6. Run validators:
   - `npm run database:validate` (schema check against approved contract)
   - `npm run database:validate-seeds` (seed integrity check)

### Existing Database Migration
1. Ensure PostgreSQL instance is running on port 5433 (or host port).
2. Take a full verified pre-migration backup (`pg_dump`).
3. Run `npm run migration:run` in `backend/`.
4. Validate schema with `npm run database:validate`.
5. Validate seeds with `npm run database:validate-seeds`.

---

## 4. Rollback and Disaster Recovery Policy

1. **Forward-Only Migration**: Migration `ApprovedDatabaseRedesign1787788800000` cannot be reverted via `npm run migration:revert` because dropped history (`peso_personnel_verification_history`) and free-text allowances cannot be restored losslessly.
2. **Disaster Recovery**:
   - In case of a migration failure in production/staging, restore the verified pre-migration backup using `pg_restore` and roll back the application deployment to the previous release artifact.
