BEGIN;

-- AuthAlignmentV3 used user_account.password_hash plus oauth_identity/auth_session.
-- The application now uses dedicated credential, identity, and session tables.
-- Normalize that supported historical lineage before making the redesign changes.
CREATE TABLE IF NOT EXISTS public.local_authentication_credential (
  user_account_id integer NOT NULL,
  password_hash text NOT NULL,
  password_changed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_local_auth_credential PRIMARY KEY (user_account_id),
  CONSTRAINT ck_local_auth_credential_password_hash_not_blank CHECK (btrim(password_hash) <> '')
);

CREATE TABLE IF NOT EXISTS public.external_authentication_identity (
  external_authentication_identity_id integer GENERATED ALWAYS AS IDENTITY,
  user_account_id integer NOT NULL,
  authentication_provider public.authentication_provider_enum NOT NULL DEFAULT 'google',
  provider_subject text NOT NULL,
  provider_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_external_auth_identity PRIMARY KEY (external_authentication_identity_id),
  CONSTRAINT uq_external_auth_identity_provider_subject UNIQUE (authentication_provider, provider_subject),
  CONSTRAINT uq_external_auth_identity_account_provider UNIQUE (user_account_id, authentication_provider),
  CONSTRAINT ck_external_auth_identity_subject_not_blank CHECK (btrim(provider_subject) <> ''),
  CONSTRAINT ck_external_auth_identity_email_not_blank CHECK (btrim(provider_email) <> '')
);

CREATE TABLE IF NOT EXISTS public.authentication_session (
  authentication_session_id integer GENERATED ALWAYS AS IDENTITY,
  user_account_id integer NOT NULL,
  token_family_id uuid NOT NULL,
  refresh_token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_authentication_session PRIMARY KEY (authentication_session_id),
  CONSTRAINT uq_authentication_session_token_family UNIQUE (token_family_id),
  CONSTRAINT ck_authentication_session_token_hash_not_blank CHECK (btrim(refresh_token_hash) <> ''),
  CONSTRAINT ck_authentication_session_expiry_after_creation CHECK (expires_at > created_at),
  CONSTRAINT ck_authentication_session_last_used_at_valid CHECK (last_used_at IS NULL OR last_used_at >= created_at),
  CONSTRAINT ck_authentication_session_revoked_at_valid CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE TABLE IF NOT EXISTS public.registration_onboarding (
  registration_onboarding_id integer GENERATED ALWAYS AS IDENTITY,
  onboarding_token_hash text NOT NULL,
  authentication_provider public.authentication_provider_enum NOT NULL DEFAULT 'google',
  provider_subject text NOT NULL,
  verified_email text NOT NULL,
  first_name text,
  last_name text,
  intended_user_role public.user_role_enum NOT NULL DEFAULT 'student',
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_registration_onboarding PRIMARY KEY (registration_onboarding_id),
  CONSTRAINT uq_registration_onboarding_token_hash UNIQUE (onboarding_token_hash),
  CONSTRAINT uq_registration_onboarding_provider_subject UNIQUE (authentication_provider, provider_subject),
  CONSTRAINT ck_registration_onboarding_token_hash_not_blank CHECK (btrim(onboarding_token_hash) <> ''),
  CONSTRAINT ck_registration_onboarding_provider_data_not_blank CHECK (btrim(provider_subject) <> '' AND btrim(verified_email) <> ''),
  CONSTRAINT ck_registration_onboarding_first_name_not_blank CHECK (first_name IS NULL OR btrim(first_name) <> ''),
  CONSTRAINT ck_registration_onboarding_last_name_not_blank CHECK (last_name IS NULL OR btrim(last_name) <> ''),
  CONSTRAINT ck_registration_onboarding_student_role_only CHECK (intended_user_role = 'student'),
  CONSTRAINT ck_registration_onboarding_expiry_after_creation CHECK (expires_at > created_at),
  CONSTRAINT ck_registration_onboarding_consumed_at_valid CHECK (consumed_at IS NULL OR consumed_at >= created_at)
);

DO $$
DECLARE
  historical_auth boolean := to_regclass('public.oauth_identity') IS NOT NULL
                             OR to_regclass('public.auth_session') IS NOT NULL;
  canonical_auth boolean := to_regclass('public.local_authentication_credential') IS NOT NULL
                            AND to_regclass('public.external_authentication_identity') IS NOT NULL
                            AND to_regclass('public.authentication_session') IS NOT NULL
                            AND to_regclass('public.registration_onboarding') IS NOT NULL;
BEGIN
  IF historical_auth AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_account' AND column_name = 'password_hash'
  ) THEN
    RAISE EXCEPTION 'Unsupported AuthAlignmentV3 schema: user_account.password_hash is missing';
  END IF;
  IF historical_auth AND NOT canonical_auth THEN
    RAISE EXCEPTION 'Unable to create the canonical authentication schema';
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.oauth_identity') IS NOT NULL THEN
    INSERT INTO public.local_authentication_credential (user_account_id, password_hash, password_changed_at, created_at, updated_at)
    SELECT user_account_id, password_hash, updated_at, created_at, updated_at
    FROM public.user_account
    WHERE password_hash IS NOT NULL
    ON CONFLICT (user_account_id) DO NOTHING;

    INSERT INTO public.external_authentication_identity
      (user_account_id, authentication_provider, provider_subject, provider_email, created_at, updated_at)
    SELECT user_account_id, authentication_provider, provider_subject, provider_email, created_at, updated_at
    FROM public.oauth_identity
    ON CONFLICT (authentication_provider, provider_subject) DO NOTHING;

    INSERT INTO public.authentication_session
      (user_account_id, token_family_id, refresh_token_hash, expires_at, last_used_at, revoked_at, created_at, updated_at)
    SELECT user_account_id, token_family_id, refresh_token_hash, expires_at, NULL, revoked_at, created_at, updated_at
    FROM public.auth_session
    ON CONFLICT (token_family_id) DO NOTHING;

    IF (SELECT count(*) FROM public.local_authentication_credential) <
       (SELECT count(*) FROM public.user_account WHERE password_hash IS NOT NULL) THEN
      RAISE EXCEPTION 'Historical password hashes were not fully converted';
    END IF;
    IF (SELECT count(*) FROM public.external_authentication_identity) <
       (SELECT count(*) FROM public.oauth_identity) THEN
      RAISE EXCEPTION 'Historical OAuth identities were not fully converted';
    END IF;
    IF (SELECT count(*) FROM public.authentication_session) <
       (SELECT count(*) FROM public.auth_session) THEN
      RAISE EXCEPTION 'Historical authentication sessions were not fully converted';
    END IF;

    DROP TRIGGER IF EXISTS trg_user_account_auth_method_integrity ON public.user_account;
    DROP TABLE public.auth_session;
    DROP TABLE public.oauth_identity;
    DROP FUNCTION IF EXISTS public.fn_check_account_auth_method_integrity();
    DROP FUNCTION IF EXISTS public.fn_validate_auth_session_account();
    DROP FUNCTION IF EXISTS public.fn_validate_oauth_identity_account();
    ALTER TABLE public.user_account DROP CONSTRAINT IF EXISTS ck_user_account_password_hash_not_blank;
    ALTER TABLE public.user_account DROP COLUMN password_hash;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_local_auth_credential_user_account') THEN
    ALTER TABLE public.local_authentication_credential ADD CONSTRAINT fk_local_auth_credential_user_account
      FOREIGN KEY (user_account_id) REFERENCES public.user_account(user_account_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_external_auth_identity_user_account') THEN
    ALTER TABLE public.external_authentication_identity ADD CONSTRAINT fk_external_auth_identity_user_account
      FOREIGN KEY (user_account_id) REFERENCES public.user_account(user_account_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_authentication_session_user_account') THEN
    ALTER TABLE public.authentication_session ADD CONSTRAINT fk_authentication_session_user_account
      FOREIGN KEY (user_account_id) REFERENCES public.user_account(user_account_id) ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS ix_external_auth_identity_user_account ON public.external_authentication_identity (user_account_id);
CREATE INDEX IF NOT EXISTS ix_authentication_session_user_account ON public.authentication_session (user_account_id);
CREATE INDEX IF NOT EXISTS ix_authentication_session_account_revoked ON public.authentication_session (user_account_id, revoked_at);
CREATE INDEX IF NOT EXISTS ix_authentication_session_expires_at ON public.authentication_session (expires_at);
CREATE INDEX IF NOT EXISTS ix_registration_onboarding_expires_at ON public.registration_onboarding (expires_at);
CREATE INDEX IF NOT EXISTS ix_registration_onboarding_consumed_at ON public.registration_onboarding (consumed_at);

CREATE OR REPLACE FUNCTION public.fn_check_authentication_method_integrity()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE account_id integer; account_role public.user_role_enum; local_count integer; external_count integer;
BEGIN
  account_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.user_account_id ELSE NEW.user_account_id END;
  SELECT user_role INTO account_role FROM public.user_account WHERE user_account_id = account_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT count(*) INTO local_count FROM public.local_authentication_credential WHERE user_account_id = account_id;
  SELECT count(*) INTO external_count FROM public.external_authentication_identity WHERE user_account_id = account_id;
  IF local_count + external_count = 0 THEN RAISE EXCEPTION 'Account % must retain at least one authentication method', account_id; END IF;
  IF external_count > 0 AND account_role <> 'student' THEN RAISE EXCEPTION 'External authentication identities are permitted only for student accounts'; END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_revoke_account_sessions()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.account_status IS DISTINCT FROM OLD.account_status AND NEW.account_status IN ('suspended', 'archived') THEN
    UPDATE public.authentication_session SET revoked_at = CURRENT_TIMESTAMP
    WHERE user_account_id = NEW.user_account_id AND revoked_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_local_auth_credential_updated_at ON public.local_authentication_credential;
DROP TRIGGER IF EXISTS trg_external_auth_identity_updated_at ON public.external_authentication_identity;
DROP TRIGGER IF EXISTS trg_authentication_session_updated_at ON public.authentication_session;
DROP TRIGGER IF EXISTS trg_registration_onboarding_updated_at ON public.registration_onboarding;
DROP TRIGGER IF EXISTS trg_user_account_auth_method_integrity ON public.user_account;
DROP TRIGGER IF EXISTS trg_local_auth_method_integrity ON public.local_authentication_credential;
DROP TRIGGER IF EXISTS trg_external_auth_method_integrity ON public.external_authentication_identity;
DROP TRIGGER IF EXISTS trg_user_account_session_revocation ON public.user_account;
CREATE TRIGGER trg_local_auth_credential_updated_at BEFORE UPDATE ON public.local_authentication_credential FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_external_auth_identity_updated_at BEFORE UPDATE ON public.external_authentication_identity FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_authentication_session_updated_at BEFORE UPDATE ON public.authentication_session FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_registration_onboarding_updated_at BEFORE UPDATE ON public.registration_onboarding FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE CONSTRAINT TRIGGER trg_user_account_auth_method_integrity AFTER INSERT OR UPDATE OF user_role ON public.user_account DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_check_authentication_method_integrity();
CREATE CONSTRAINT TRIGGER trg_local_auth_method_integrity AFTER INSERT OR UPDATE OF user_account_id OR DELETE ON public.local_authentication_credential DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_check_authentication_method_integrity();
CREATE CONSTRAINT TRIGGER trg_external_auth_method_integrity AFTER INSERT OR UPDATE OF user_account_id OR DELETE ON public.external_authentication_identity DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_check_authentication_method_integrity();
CREATE TRIGGER trg_user_account_session_revocation AFTER UPDATE OF account_status ON public.user_account FOR EACH ROW EXECUTE FUNCTION public.fn_revoke_account_sessions();

-- Fail before destructive work if an application-only value still exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.student_academic_information
    WHERE year_level::text = 'fifth_year_college'
  ) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Cannot remove fifth_year_college while student records still use it',
      HINT = 'Correct those student records to an approved year level, then rerun the migration.';
  END IF;
END;
$$;

-- Views are recreated in this transaction so no committed schema can expose
-- removed columns or stale attendance calculations.
DROP VIEW public.vw_attendance_summary;
DROP VIEW public.vw_internship_assignment_details;
DROP VIEW public.vw_referral_details;
DROP VIEW public.vw_application_details;
DROP VIEW public.vw_opportunity_summary;
DROP VIEW public.vw_student_profile_details;

-- Timed account suspension.
ALTER TABLE public.user_account
  ADD COLUMN suspended_until timestamptz;
UPDATE public.user_account
SET suspended_until = CURRENT_TIMESTAMP
WHERE account_status = 'suspended';
ALTER TABLE public.user_account
  ADD CONSTRAINT ck_user_account_suspension_expiry CHECK (
    (account_status = 'suspended' AND suspended_until IS NOT NULL)
    OR (account_status IN ('active', 'archived') AND suspended_until IS NULL)
  );
CREATE INDEX ix_user_account_suspended_until
  ON public.user_account (suspended_until)
  WHERE account_status = 'suspended';

-- Admin-created companies do not have a logo at creation time.
ALTER TABLE public.company
  ALTER COLUMN logo_file_path DROP NOT NULL;
ALTER TABLE public.company
  DROP CONSTRAINT ck_company_logo_file_path_not_blank;
ALTER TABLE public.company
  ADD CONSTRAINT ck_company_logo_file_path_not_blank CHECK (
    logo_file_path IS NULL OR btrim(logo_file_path) <> ''
  );

-- Replace the boolean/numeric allowance pair with one nullable display value.
ALTER TABLE public.opportunity
  DROP CONSTRAINT ck_opportunity_allowance_consistency;
ALTER TABLE public.opportunity
  ALTER COLUMN allowance TYPE text
  USING CASE WHEN has_allowance THEN allowance::text ELSE NULL END;
ALTER TABLE public.opportunity
  DROP COLUMN has_allowance;
ALTER TABLE public.opportunity
  ADD CONSTRAINT ck_opportunity_allowance_not_blank CHECK (
    allowance IS NULL OR btrim(allowance) <> ''
  );

-- QC PESO accounts no longer require document submission or verification.
DROP TRIGGER IF EXISTS trg_peso_verification_history ON public.peso_personnel;
DROP TRIGGER IF EXISTS trg_peso_personnel_verification ON public.peso_personnel;
DROP INDEX IF EXISTS public.ix_peso_personnel_verification_status;
DROP INDEX IF EXISTS public.ix_peso_personnel_reviewed_by;
ALTER TABLE public.peso_personnel
  DROP CONSTRAINT IF EXISTS fk_peso_personnel_reviewed_by;
DROP TABLE IF EXISTS public.peso_personnel_verification_history CASCADE;
ALTER TABLE public.peso_personnel
  DROP CONSTRAINT IF EXISTS ck_peso_personnel_id_file_path_not_blank,
  DROP CONSTRAINT IF EXISTS ck_peso_personnel_verification_remark_not_blank,
  DROP CONSTRAINT IF EXISTS ck_peso_personnel_verification_review_consistency,
  DROP COLUMN IF EXISTS employee_id_file_path,
  DROP COLUMN IF EXISTS verification_status,
  DROP COLUMN IF EXISTS reviewed_at,
  DROP COLUMN IF EXISTS reviewed_by_user_account_id,
  DROP COLUMN IF EXISTS verification_remark;
DROP FUNCTION IF EXISTS public.fn_validate_peso_verification();
DROP TYPE IF EXISTS public.personnel_verification_status_enum;

CREATE OR REPLACE FUNCTION public.fn_record_status_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor_id integer := public.fn_current_status_actor();
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'user_account' THEN
      IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
        INSERT INTO public.user_account_status_history (user_account_id, previous_account_status, new_account_status, changed_by_user_account_id)
        VALUES (NEW.user_account_id, OLD.account_status, NEW.account_status, actor_id);
      END IF;
    WHEN 'application' THEN
      IF NEW.application_status IS DISTINCT FROM OLD.application_status THEN
        INSERT INTO public.application_status_history (application_id, previous_application_status, new_application_status, changed_by_user_account_id)
        VALUES (NEW.application_id, OLD.application_status, NEW.application_status, actor_id);
      END IF;
    WHEN 'referral' THEN
      IF NEW.referral_status IS DISTINCT FROM OLD.referral_status THEN
        INSERT INTO public.referral_status_history (referral_id, previous_referral_status, new_referral_status, changed_by_user_account_id)
        VALUES (NEW.referral_id, OLD.referral_status, NEW.referral_status, actor_id);
      END IF;
    WHEN 'internship_assignment' THEN
      IF NEW.assignment_status IS DISTINCT FROM OLD.assignment_status THEN
        INSERT INTO public.internship_assignment_status_history (internship_assignment_id, previous_assignment_status, new_assignment_status, changed_by_user_account_id)
        VALUES (NEW.internship_assignment_id, OLD.assignment_status, NEW.assignment_status, actor_id);
      END IF;
  END CASE;
  RETURN NULL;
END;
$$;

-- Remove the unsupported year level by rebuilding the PostgreSQL enum.
ALTER TYPE public.year_level_enum RENAME TO year_level_enum_old;
CREATE TYPE public.year_level_enum AS ENUM (
  'grade_11',
  'grade_12',
  'first_year_college',
  'second_year_college',
  'third_year_college',
  'fourth_year_college'
);
ALTER TABLE public.student_academic_information
  ALTER COLUMN year_level TYPE public.year_level_enum
  USING year_level::text::public.year_level_enum;
DROP TYPE public.year_level_enum_old;

-- Employers may reverse acceptance only into the rejected terminal state.
CREATE OR REPLACE FUNCTION public.fn_validate_referral()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.referral_status <> 'sent' OR NEW.company_response <> 'pending' THEN
      RAISE EXCEPTION 'A new referral must begin as sent with a pending company response';
    END IF;
    IF NOT (EXISTS (SELECT 1 FROM public.application WHERE application_id = NEW.application_id AND application_status = 'approved_for_referral')) THEN
      RAISE EXCEPTION 'A referral requires an approved_for_referral application';
    END IF;
  ELSE
    IF NEW.referral_status IS DISTINCT FROM OLD.referral_status AND NOT (
      (OLD.referral_status = 'sent' AND NEW.referral_status IN ('under_review', 'withdrawn', 'expired'))
      OR (OLD.referral_status = 'under_review' AND NEW.referral_status IN ('closed', 'withdrawn', 'expired'))
    ) THEN
      RAISE EXCEPTION 'Invalid referral status transition: % -> %', OLD.referral_status, NEW.referral_status;
    END IF;
    IF NEW.company_response IS DISTINCT FROM OLD.company_response AND NOT (
      (OLD.company_response = 'pending' AND NEW.company_response IN ('for_interview', 'accepted', 'rejected'))
      OR (OLD.company_response = 'for_interview' AND NEW.company_response IN ('accepted', 'rejected'))
      OR (OLD.company_response = 'accepted' AND NEW.company_response = 'rejected')
    ) THEN
      RAISE EXCEPTION 'Invalid company response transition: % -> %', OLD.company_response, NEW.company_response;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Soft deletion preserves assignment history while hiding records from active views.
ALTER TABLE public.internship_assignment
  ADD COLUMN deleted_at timestamptz;
CREATE INDEX ix_internship_assignment_deleted_at
  ON public.internship_assignment (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Persist net hours after the standard one-hour break and correct existing rows.
CREATE OR REPLACE FUNCTION public.fn_derive_attendance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  assignment_start date;
  assignment_limit date;
  shift_start time;
  shift_end time;
  actual_interval interval;
  shift_interval interval;
BEGIN
  SELECT start_date, COALESCE(end_date, expected_end_date), start_shift, end_shift
  INTO assignment_start, assignment_limit, shift_start, shift_end
  FROM public.internship_assignment
  WHERE internship_assignment_id = NEW.internship_assignment_id
  FOR KEY SHARE;

  IF NEW.attendance_date < assignment_start OR (assignment_limit IS NOT NULL AND NEW.attendance_date > assignment_limit) THEN
    RAISE EXCEPTION 'Attendance date % is outside the assignment period', NEW.attendance_date;
  END IF;

  NEW.time_in_status := CASE WHEN NEW.time_in > shift_start THEN 'late'::public.time_in_status_enum ELSE 'on_time'::public.time_in_status_enum END;
  IF NEW.time_out IS NULL THEN
    NEW.hours_rendered := NULL;
    NEW.rendered_hours_status := 'incomplete';
    RETURN NEW;
  END IF;
  IF NEW.time_out <= NEW.time_in THEN
    RAISE EXCEPTION 'Attendance time_out must be later than time_in';
  END IF;

  actual_interval := GREATEST(NEW.time_out - NEW.time_in - interval '1 hour', interval '0');
  shift_interval := GREATEST(shift_end - shift_start - interval '1 hour', interval '0');
  NEW.hours_rendered := round((extract(epoch FROM actual_interval) / 3600)::numeric, 2);
  NEW.rendered_hours_status := CASE
    WHEN actual_interval < shift_interval THEN 'undertime'::public.rendered_hours_status_enum
    WHEN actual_interval > shift_interval THEN 'overtime'::public.rendered_hours_status_enum
    ELSE 'complete'::public.rendered_hours_status_enum
  END;
  RETURN NEW;
END;
$$;

UPDATE public.attendance_record
SET time_out = time_out
WHERE time_out IS NOT NULL;

CREATE VIEW public.vw_student_profile_details AS
WITH preferred_industry AS (
  SELECT spi.student_id,
    jsonb_agg(jsonb_build_object('industry_id', i.industry_id, 'industry_name', i.industry_name, 'custom_industry_name', spi.custom_industry_name) ORDER BY i.industry_name, i.industry_id) AS preferred_industries
  FROM public.student_preferred_industry spi
  JOIN public.industry i ON i.industry_id = spi.industry_id
  GROUP BY spi.student_id
)
SELECT s.student_id, s.user_account_id, ua.account_status, ua.deleted_at,
  s.first_name, s.middle_name, s.last_name, s.extension_name,
  concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS full_name,
  s.contact_number, s.contact_email, s.linkedin_url,
  s.address_line, s.address_barangay, s.address_district, s.address_city,
  s.inquiry_method, s.photo_file_path,
  sai.school_name, sai.year_level, sai.strand_program,
  ip.required_hours AS preferred_required_hours,
  ip.available_days AS preferred_available_days,
  ip.start_date AS preferred_start_date,
  ip.preferred_company_type,
  ip.allows_outside_preferred_field,
  COALESCE(pi.preferred_industries, '[]'::jsonb) AS preferred_industries
FROM public.student s
JOIN public.user_account ua ON ua.user_account_id = s.user_account_id
LEFT JOIN public.student_academic_information sai ON sai.student_id = s.student_id
LEFT JOIN public.internship_preference ip ON ip.student_id = s.student_id
LEFT JOIN preferred_industry pi ON pi.student_id = s.student_id;

CREATE VIEW public.vw_opportunity_summary AS
WITH application_counts AS (
  SELECT a.opportunity_id,
    count(a.application_id) AS total_application_count,
    count(a.application_id) FILTER (WHERE a.application_status IN ('submitted', 'under_review', 'approved_for_referral')) AS active_application_count,
    count(a.application_id) FILTER (WHERE a.application_status = 'approved_for_referral') AS approved_for_referral_count
  FROM public.application a
  GROUP BY a.opportunity_id
)
SELECT o.opportunity_id, c.company_id, c.company_name, c.company_type,
  i.industry_id, i.industry_name, c.logo_file_path AS company_logo_file_path,
  c.address_city AS company_address_city,
  o.title, o.department, o.description, o.qualification,
  o.minimum_required_hours, o.work_arrangement, o.offered_slots,
  (o.allowance IS NOT NULL) AS has_allowance, o.allowance,
  o.application_deadline, o.opportunity_status,
  o.created_at, o.updated_at,
  COALESCE(ac.total_application_count, 0::bigint) AS total_application_count,
  COALESCE(ac.active_application_count, 0::bigint) AS active_application_count,
  COALESCE(ac.approved_for_referral_count, 0::bigint) AS approved_for_referral_count
FROM public.opportunity o
JOIN public.company c ON c.company_id = o.company_id
JOIN public.industry i ON i.industry_id = c.industry_id
LEFT JOIN application_counts ac ON ac.opportunity_id = o.opportunity_id;

CREATE VIEW public.vw_application_details AS
SELECT a.application_id, a.submitted_at, a.application_status, a.remark AS application_remark,
  a.student_response, a.student_responded_at,
  s.student_id, concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
  s.contact_email AS student_contact_email, s.contact_number AS student_contact_number,
  sai.school_name, sai.year_level, sai.strand_program,
  o.opportunity_id, o.title AS opportunity_title, o.opportunity_status,
  o.application_deadline, o.work_arrangement, o.minimum_required_hours,
  c.company_id, c.company_name, i.industry_name,
  r.referral_id, r.referral_status, r.company_response,
  ia.internship_assignment_id, ia.assignment_status
FROM public.application a
JOIN public.student s ON s.student_id = a.student_id
LEFT JOIN public.student_academic_information sai ON sai.student_id = s.student_id
JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
JOIN public.company c ON c.company_id = o.company_id
JOIN public.industry i ON i.industry_id = c.industry_id
LEFT JOIN public.referral r ON r.application_id = a.application_id
LEFT JOIN public.internship_assignment ia
  ON ia.referral_id = r.referral_id AND ia.deleted_at IS NULL;

CREATE VIEW public.vw_referral_details AS
SELECT r.referral_id, r.referred_at, r.referral_status, r.referral_document_file_path,
  r.company_response, r.company_responded_at, r.remark AS referral_remark,
  a.application_id, a.application_status, a.student_response, a.student_responded_at,
  s.student_id, concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
  s.contact_email AS student_contact_email, s.contact_number AS student_contact_number,
  o.opportunity_id, o.title AS opportunity_title,
  c.company_id, c.company_name, i.industry_name,
  pp.peso_personnel_id, pp.employee_id AS peso_employee_id,
  concat_ws(' ', pp.first_name, pp.middle_name, pp.last_name, pp.extension_name) AS peso_personnel_full_name,
  iv.interview_id, iv.scheduled_at, iv.interview_mode, iv.physical_location,
  iv.online_meeting_url, iv.remark AS interview_remark,
  ia.internship_assignment_id, ia.assignment_status
FROM public.referral r
JOIN public.application a ON a.application_id = r.application_id
JOIN public.student s ON s.student_id = a.student_id
JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
JOIN public.company c ON c.company_id = o.company_id
JOIN public.industry i ON i.industry_id = c.industry_id
JOIN public.peso_personnel pp ON pp.peso_personnel_id = r.peso_personnel_id
LEFT JOIN public.interview iv ON iv.referral_id = r.referral_id
LEFT JOIN public.internship_assignment ia
  ON ia.referral_id = r.referral_id AND ia.deleted_at IS NULL;

CREATE VIEW public.vw_internship_assignment_details AS
SELECT ia.internship_assignment_id, r.referral_id, a.application_id,
  s.student_id, concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
  s.contact_email AS student_contact_email, s.contact_number AS student_contact_number,
  o.opportunity_id, o.title AS opportunity_title,
  c.company_id, c.company_name,
  ia.required_hours, ia.start_date, ia.expected_end_date, ia.end_date,
  ia.working_days, ia.start_shift, ia.end_shift, ia.assignment_status,
  a.application_status, r.referral_status, r.company_response, a.student_response,
  f.internship_feedback_id, f.rating AS feedback_rating, f.submitted_at AS feedback_submitted_at
FROM public.internship_assignment ia
JOIN public.referral r ON r.referral_id = ia.referral_id
JOIN public.application a ON a.application_id = r.application_id
JOIN public.student s ON s.student_id = a.student_id
JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
JOIN public.company c ON c.company_id = o.company_id
LEFT JOIN public.internship_feedback f ON f.internship_assignment_id = ia.internship_assignment_id
WHERE ia.deleted_at IS NULL;

CREATE VIEW public.vw_attendance_summary AS
SELECT ia.internship_assignment_id, ia.assignment_status,
  s.student_id, concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
  o.opportunity_id, o.title AS opportunity_title,
  c.company_id, c.company_name, ia.required_hours,
  COALESCE(sum(ar.hours_rendered), 0::numeric) AS total_rendered_hours,
  count(ar.attendance_record_id) AS attendance_record_count,
  count(ar.attendance_record_id) FILTER (WHERE ar.rendered_hours_status = 'complete') AS complete_count,
  count(ar.attendance_record_id) FILTER (WHERE ar.rendered_hours_status = 'incomplete') AS incomplete_count,
  count(ar.attendance_record_id) FILTER (WHERE ar.time_in_status = 'late') AS late_count,
  count(ar.attendance_record_id) FILTER (WHERE ar.rendered_hours_status = 'undertime') AS undertime_count,
  count(ar.attendance_record_id) FILTER (WHERE ar.rendered_hours_status = 'overtime') AS overtime_count,
  min(ar.attendance_date) AS first_attendance_date,
  max(ar.attendance_date) AS latest_attendance_date,
  CASE WHEN ia.required_hours > 0 THEN round(COALESCE(sum(ar.hours_rendered), 0::numeric) / ia.required_hours * 100, 2) ELSE 0::numeric END AS completion_percentage
FROM public.internship_assignment ia
JOIN public.referral r ON r.referral_id = ia.referral_id
JOIN public.application a ON a.application_id = r.application_id
JOIN public.student s ON s.student_id = a.student_id
JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
JOIN public.company c ON c.company_id = o.company_id
LEFT JOIN public.attendance_record ar ON ar.internship_assignment_id = ia.internship_assignment_id
WHERE ia.deleted_at IS NULL
GROUP BY ia.internship_assignment_id, ia.assignment_status, s.student_id, s.first_name, s.middle_name, s.last_name, s.extension_name, o.opportunity_id, o.title, c.company_id, c.company_name, ia.required_hours;

COMMIT;
