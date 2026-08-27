BEGIN;

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
DROP TRIGGER trg_peso_verification_history ON public.peso_personnel;
DROP TRIGGER trg_peso_personnel_verification ON public.peso_personnel;
DROP TRIGGER trg_peso_verification_history_append_only
  ON public.peso_personnel_verification_history;
DROP INDEX public.ix_peso_personnel_verification_status;
DROP INDEX public.ix_peso_personnel_reviewed_by;
ALTER TABLE public.peso_personnel
  DROP CONSTRAINT fk_peso_personnel_reviewed_by;
DROP TABLE public.peso_personnel_verification_history;
ALTER TABLE public.peso_personnel
  DROP CONSTRAINT ck_peso_personnel_id_file_path_not_blank,
  DROP CONSTRAINT ck_peso_personnel_verification_remark_not_blank,
  DROP CONSTRAINT ck_peso_personnel_verification_review_consistency,
  DROP COLUMN employee_id_file_path,
  DROP COLUMN verification_status,
  DROP COLUMN reviewed_at,
  DROP COLUMN reviewed_by_user_account_id,
  DROP COLUMN verification_remark;
DROP FUNCTION public.fn_validate_peso_verification();
DROP TYPE public.personnel_verification_status_enum;

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
