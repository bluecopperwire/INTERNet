# INTERNet Database Migration Guide

## 1. Overview of Redesign & Schema Changes

This guide documents the database schema redesign implemented in migration `1787788800000-ApprovedDatabaseRedesign.ts` (`002_approved_database_redesign.sql`). The redesign eliminates legacy workflow blockers and unblocks core system operations across User Management, Employer, Student, and QC PESO modules.

### Summary of Schema Changes

1. **Timed Account Suspensions (`user_account.suspended_until`)**:
   - Added nullable `suspended_until TIMESTAMPTZ` and partial index `ix_user_account_suspended_until` (`WHERE account_status = 'suspended'`).
   - Enforces check constraint `ck_user_account_suspension_expiry`:
     ```sql
     CHECK (
       (account_status = 'suspended' AND suspended_until IS NOT NULL)
       OR (account_status IN ('active', 'archived') AND suspended_until IS NULL)
     )
     ```
   - Existing suspended accounts during migration are backfilled to `CURRENT_TIMESTAMP` (immediately expired, subject to reactivation/extension).
2. **Optional Company Logo (`company.logo_file_path`)**:
   - Altered `company.logo_file_path` to be nullable (`DROP NOT NULL`), allowing employer registration and admin creation without upfront logo uploads.
   - Updated constraint `ck_company_logo_file_path_not_blank` to `logo_file_path IS NULL OR btrim(logo_file_path) <> ''`.
3. **Free-Text Opportunity Allowance (`opportunity.allowance`)**:
   - Dropped legacy `has_allowance` boolean column from `opportunity`.
   - Converted `allowance` to nullable `TEXT` (e.g. `'PHP 5,000 monthly'`, `'PHP 500 per day'`, or `NULL`).
   - Database views (including `vw_opportunity_summary`) expose `(allowance IS NOT NULL) AS has_allowance` and `allowance` for backward compatibility.
4. **Streamlined QC PESO Personnel Verification**:
   - Dropped `employee_id_file_path`, `verification_status`, `reviewed_at`, `reviewed_by_user_account_id`, and `verification_remark` columns from `peso_personnel`.
   - Dropped retired `peso_personnel_verification_history` table and `personnel_verification_status_enum` type.
   - QC PESO personnel accounts are directly active upon creation without gating verification steps.
5. **Referral Company Response Transition (`accepted -> rejected`)**:
   - Updated `fn_validate_referral()` trigger to allow transition from `company_response = 'accepted'` to `'rejected'`, enabling employer acceptance withdrawal while student response is pending.
6. **Internship Assignment Soft Deletion (`internship_assignment.deleted_at`)**:
   - Added nullable `deleted_at TIMESTAMPTZ` column with partial index `ix_internship_assignment_deleted_at` (`WHERE deleted_at IS NOT NULL`).
   - Terminal assignments (`completed`, `cancelled`, `withdrawn`) are soft-deleted via `deleted_at`, preserving foreign key integrity and attendance histories while filtering them from active views (`vw_internship_assignment_details`, `vw_attendance_summary`, `vw_application_details`, `vw_referral_details`).
7. **Attendance 1-Hour Lunch Break Deduction**:
   - Updated `fn_derive_attendance()` trigger function:
     ```sql
     actual_interval := GREATEST(NEW.time_out - NEW.time_in - interval '1 hour', interval '0');
     ```
   - Automatically recalculated existing attendance records upon migration.
8. **Removed `fifth_year_college` from `year_level_enum`**:
   - Standardized academic year levels to `grade_11`, `grade_12`, `first_year_college`, `second_year_college`, `third_year_college`, and `fourth_year_college`.
   - Preflight guard fails migration if student records still use `fifth_year_college`.

---

## 2. Mandatory Preflight Checklist for Existing Environments

Before executing migration `002`:

1. **Verify PostgreSQL Version**: Confirm server is PostgreSQL 16.x.
2. **Check for Legacy Year Levels**:
   ```sql
   SELECT count(*) FROM public.student_academic_information WHERE year_level::text = 'fifth_year_college';
   ```
   *If count > 0, update those rows to an approved year level before migrating.*
3. **Record Table Baseline Counts**: Record row counts for `user_account`, `company`, `opportunity`, `peso_personnel`, `peso_personnel_verification_history`, `referral`, `internship_assignment`, and `attendance_record`.
4. **Create Verified Backup**:
   ```powershell
   pg_dump -h localhost -p 5433 -U postgres -F c -b -v -f pre_migration_backup.dump internet_db
   ```
   Verify restoration of `pre_migration_backup.dump` in a disposable test database.
5. **Schedule Maintenance Window**: Stop application traffic, as old and new application code are not dual-schema compatible.

---

## 3. Applying the Migration

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

### Step 4: Seed and validate reference data
```powershell
npm run seed:reference
npm run database:validate-reference-seeds
```

> [!NOTE]
> For production environments, only `seed:reference` and `database:validate-reference-seeds` should be executed.
> In local development environments, `npm run seed:dev` followed by `npm run database:validate-dev-seeds` can be used to set up development accounts.

---

## 4. Rollback and Recovery Runbook

> [!CAUTION]
> **Forward-Only Migration Policy**:
> Migration `ApprovedDatabaseRedesign1787788800000` is forward-only and irreversible. Running `npm run migration:revert` will intentionally raise an exception because dropped verification history and free-text allowance cannot be reconstructed losslessly.

If a deployment failure occurs, execute the following disaster recovery procedure:

1. **Stop Application Traffic**: Terminate backend and frontend instances.
2. **Preserve Failed Database State**: Take a forensic dump of the failed database for investigation.
3. **Restore Pre-Migration Backup**:
   ```powershell
   dropdb -h localhost -p 5433 -U postgres internet_db
   createdb -h localhost -p 5433 -U postgres internet_db
   pg_restore -h localhost -p 5433 -U postgres -d internet_db -v pre_migration_backup.dump
   ```
4. **Deploy Previous Application Version**: Redeploy the previous application commit matching schema `001`.
5. **Validate Restoration**:
   - Verify migration table contains only `InitialSchema1785860400000`.
   - Verify row counts match the pre-migration baseline.
   - Run smoke tests on authentication and legacy workflows.

