# INTERNet Database Migration Guide

## 1. Overview of Redesign & Schema Changes

This guide documents the database schema redesign implemented in migration `1787788800000-ApprovedDatabaseRedesign.ts`. The redesign eliminates legacy workflow blockers and unblocks core system operations across User Management, Employer, Student, and QC PESO modules.

### Summary of Schema Changes

1. **Timed Account Suspensions (`user_account.suspended_until`)**:
   - Added nullable `suspended_until TIMESTAMPTZ` to `user_account`.
   - Enforces check constraint `ck_user_account_suspension_window`: when `account_status = 'suspended'`, `suspended_until` must be a future timestamp; when `account_status` is `'active'` or `'archived'`, `suspended_until` must be `NULL`.
2. **Optional Company Logo (`company.logo_file_path`)**:
   - Altered `company.logo_file_path` to be nullable (`DROP NOT NULL`), allowing employer registration and admin creation without upfront logo uploads.
3. **Free-Text Opportunity Allowance (`opportunity.allowance`)**:
   - Dropped legacy `has_allowance` boolean column from `opportunity`.
   - Converted `allowance` to nullable `TEXT` (e.g. `'PHP 5,000 monthly'`, `'PHP 500 per day'`, or `NULL`).
   - Database views (such as `vw_opportunity_catalog` / `vw_opportunity_summary`) expose `(allowance IS NOT NULL) AS has_allowance` for backward compatibility.
4. **Streamlined QC PESO Personnel Verification**:
   - Dropped `employee_id_file_path`, `employee_id_file_mime_type`, `verification_status`, `reviewed_at`, `reviewed_by_user_account_id`, and `verification_remark` columns from `peso_personnel`.
   - Dropped retired `peso_personnel_verification_status_history` table.
   - QC PESO personnel accounts are directly active upon creation without gating verification steps.
5. **Referral Company Response Transition (`accepted -> rejected`)**:
   - Updated `fn_validate_referral_transition()` trigger to allow transition from `company_response = 'accepted'` to `'rejected'`, enabling employer acceptance withdrawal.
6. **Internship Assignment Soft Deletion (`internship_assignment.deleted_at`)**:
   - Added nullable `deleted_at TIMESTAMPTZ` column with partial index `idx_internship_assignment_active_lookup` (`WHERE deleted_at IS NULL`).
   - Terminal assignments (`completed`, `cancelled`, `withdrawn`) are soft-deleted via `deleted_at`, preserving foreign key integrity and attendance histories.
7. **Attendance 1-Hour Lunch Break Deduction**:
   - Updated `fn_derive_attendance()` and `fn_calculate_attendance_hours()` triggers: `actual_interval := GREATEST(NEW.time_out - NEW.time_in - interval '1 hour', interval '0')`.
8. **Removed `fifth_year_college` from `year_level_enum`**:
   - Standardized academic year levels to `grade_11`, `grade_12`, `first_year_college`, `second_year_college`, `third_year_college`, and `fourth_year_college`.

---

## 2. Running the Migration

From the `backend/` directory:

### Step 1: Check pending migrations
```powershell
npm run migration:show
```

### Step 2: Apply the migration
```powershell
npm run migration:run
```

### Step 3: Validate the schema
```powershell
npm run database:validate
```

---

## 3. Reference and Development Seeding

### Reference Seed (Mandatory lookup data)
```powershell
npm run seed:reference
```
Inserts the 8 standardized industries (`Accounting/ Finance`, `Information Technology`, etc.). Idempotent.

### Development Seed (Local development & testing only)
```powershell
$env:NODE_ENV='development'
$env:ALLOW_DEV_SEED='true'
$env:DEV_SEED_PASSWORD='TestPassword123'
npm run seed:dev
```

### Validate Seeds
```powershell
npm run database:validate-seeds
```

---

## 4. Rollback and Down Migration Constraints

The down migration (`revert`) drops the redesign changes and restores the previous schema definitions:

```powershell
npm run migration:revert
```

> [!CAUTION]
> **Rollback Pre-flight Checks**:
> - Free-text `allowance` values that cannot be parsed as numeric amounts must be sanitized prior to down-migration.
> - Any active timed suspensions (`suspended_until`) will be dropped.
> - Soft-deleted internship assignments (`deleted_at IS NOT NULL`) will need reconciliation before reinstating hard deletion checks.
