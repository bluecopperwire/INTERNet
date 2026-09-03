BEGIN;

DROP VIEW IF EXISTS public.vw_attendance_summary;
DROP VIEW IF EXISTS public.vw_internship_assignment_details;
DROP VIEW IF EXISTS public.vw_referral_details;
DROP VIEW IF EXISTS public.vw_application_details;

DROP TRIGGER IF EXISTS trg_assignment_status_history ON public.internship_assignment;
DROP TRIGGER IF EXISTS trg_internship_assignment_workflow ON public.internship_assignment;
DROP TRIGGER IF EXISTS trg_attendance_record_derive ON public.attendance_record;
DROP TRIGGER IF EXISTS trg_internship_feedback_workflow ON public.internship_feedback;
DROP TRIGGER IF EXISTS trg_internship_feedback_updated_at ON public.internship_feedback;
DROP TRIGGER IF EXISTS trg_assignment_history_append_only ON public.internship_assignment_status_history;

DROP FUNCTION IF EXISTS public.fn_validate_assignment();
DROP FUNCTION IF EXISTS public.fn_derive_attendance();
DROP FUNCTION IF EXISTS public.fn_validate_feedback();

ALTER TABLE public.internship_assignment
  DROP CONSTRAINT IF EXISTS ck_internship_assignment_status_end_date,
  DROP CONSTRAINT IF EXISTS ck_internship_assignment_hours_positive,
  ALTER COLUMN assignment_status DROP DEFAULT;
ALTER TABLE public.attendance_record
  DROP CONSTRAINT IF EXISTS ck_attendance_record_hours_range,
  DROP CONSTRAINT IF EXISTS ck_attendance_record_rendered_consistency;
ALTER TABLE public.internship_assignment_status_history
  DROP CONSTRAINT IF EXISTS ck_assignment_status_history_status_changed;

ALTER TYPE public.assignment_status_enum RENAME TO assignment_status_enum_legacy;
CREATE TYPE public.assignment_status_enum AS ENUM (
  'pending', 'ongoing', 'complete_company', 'complete_student',
  'withdrawn', 'cancelled', 'finalized'
);

ALTER TABLE public.internship_assignment
  ALTER COLUMN assignment_status TYPE public.assignment_status_enum
  USING (
    CASE assignment_status::text
      WHEN 'completed' THEN 'complete_company'
      ELSE assignment_status::text
    END
  )::public.assignment_status_enum,
  ALTER COLUMN assignment_status SET DEFAULT 'pending'::public.assignment_status_enum;

ALTER TABLE public.internship_assignment_status_history
  ALTER COLUMN previous_assignment_status DROP NOT NULL,
  ALTER COLUMN previous_assignment_status TYPE public.assignment_status_enum
  USING (
    CASE previous_assignment_status::text
      WHEN 'completed' THEN 'complete_company'
      ELSE previous_assignment_status::text
    END
  )::public.assignment_status_enum,
  ALTER COLUMN new_assignment_status TYPE public.assignment_status_enum
  USING (
    CASE new_assignment_status::text
      WHEN 'completed' THEN 'complete_company'
      ELSE new_assignment_status::text
    END
  )::public.assignment_status_enum;

DROP TYPE public.assignment_status_enum_legacy;

ALTER TABLE public.internship_assignment
  ADD COLUMN working_days_new smallint[],
  ADD COLUMN required_minutes integer,
  ADD COLUMN ended_at timestamptz,
  ADD COLUMN finalized_at timestamptz,
  ADD COLUMN finalized_by_user_account_id integer,
  ADD COLUMN company_completion_remark text,
  ADD COLUMN company_cancellation_remark text,
  ADD COLUMN student_withdrawal_remark text;

UPDATE public.internship_assignment
SET working_days_new = CASE working_days::text
    WHEN 'weekdays' THEN ARRAY[1, 2, 3, 4, 5]::smallint[]
    WHEN 'weekends' THEN ARRAY[6, 0]::smallint[]
    WHEN 'flexible' THEN ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[]
  END,
  required_minutes = required_hours * 60;

ALTER TABLE public.internship_assignment
  DROP COLUMN working_days;
ALTER TABLE public.internship_assignment
  RENAME COLUMN working_days_new TO working_days;
ALTER TABLE public.internship_assignment DROP COLUMN required_hours;
ALTER TABLE public.internship_assignment
  ALTER COLUMN working_days SET NOT NULL,
  ALTER COLUMN required_minutes SET NOT NULL;

CREATE FUNCTION public.fn_valid_working_days(days smallint[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT cardinality(days) > 0
    AND COALESCE((SELECT bool_and(day BETWEEN 0 AND 6) FROM unnest(days) AS day), false)
    AND cardinality(days) = (SELECT count(DISTINCT day) FROM unnest(days) AS day)
$$;

ALTER TABLE public.internship_assignment
  ADD CONSTRAINT ck_internship_assignment_working_days
    CHECK (public.fn_valid_working_days(working_days)),
  ADD CONSTRAINT ck_internship_assignment_required_minutes_positive
    CHECK (required_minutes > 0 AND required_minutes % 60 = 0),
  ADD CONSTRAINT fk_internship_assignment_finalized_by
    FOREIGN KEY (finalized_by_user_account_id)
    REFERENCES public.user_account(user_account_id) ON DELETE RESTRICT;

ALTER TABLE public.attendance_record ADD COLUMN rendered_minutes integer;
UPDATE public.attendance_record
SET rendered_minutes = CASE
  WHEN hours_rendered IS NULL THEN NULL
  ELSE round(hours_rendered * 60)::integer
END;
ALTER TABLE public.attendance_record DROP COLUMN hours_rendered;
ALTER TABLE public.attendance_record
  ADD CONSTRAINT ck_attendance_record_rendered_minutes_range
    CHECK (rendered_minutes IS NULL OR rendered_minutes BETWEEN 0 AND 1440),
  ADD CONSTRAINT ck_attendance_record_rendered_consistency
    CHECK (
      (time_out IS NULL AND rendered_minutes IS NULL AND rendered_hours_status = 'incomplete')
      OR (time_out IS NOT NULL AND rendered_minutes IS NOT NULL)
    );

ALTER TABLE public.internship_feedback RENAME COLUMN feedback_text TO remark;
ALTER TABLE public.internship_feedback RENAME COLUMN submitted_at TO reviewed_at;
UPDATE public.internship_feedback
SET remark = 'No review remark was recorded before Student Company reviews required remarks.'
WHERE remark IS NULL OR btrim(remark) = '';
ALTER TABLE public.internship_feedback
  ALTER COLUMN remark SET NOT NULL,
  DROP CONSTRAINT IF EXISTS ck_internship_feedback_text_not_blank,
  ADD CONSTRAINT ck_internship_feedback_remark_not_blank CHECK (btrim(remark) <> '');

UPDATE public.internship_assignment ia
SET ended_at = COALESCE(
      ia.end_date::timestamp AT TIME ZONE 'Asia/Manila',
      (
        SELECT h.changed_at
        FROM public.internship_assignment_status_history h
        WHERE h.internship_assignment_id = ia.internship_assignment_id
          AND h.new_assignment_status::text IN ('complete_company', 'withdrawn', 'cancelled')
        ORDER BY h.changed_at, h.internship_assignment_status_history_id
        LIMIT 1
      ),
      ia.updated_at
    ),
    company_completion_remark = CASE
      WHEN ia.assignment_status = 'complete_company'
        THEN 'No Company completion remark was recorded before completion remarks became required.'
      ELSE ia.company_completion_remark
    END,
    company_cancellation_remark = CASE
      WHEN ia.assignment_status = 'cancelled'
        THEN 'No Company cancellation reason was recorded before cancellation remarks became required.'
      ELSE ia.company_cancellation_remark
    END,
    student_withdrawal_remark = CASE
      WHEN ia.assignment_status = 'withdrawn'
        THEN 'No Student withdrawal reason was recorded before withdrawal remarks became required.'
      ELSE ia.student_withdrawal_remark
    END
WHERE ia.assignment_status IN ('complete_company', 'withdrawn', 'cancelled');

-- LATERAL produces no source row when old history is absent, so finish those rows explicitly.
UPDATE public.internship_assignment
SET ended_at = COALESCE(ended_at, end_date::timestamp AT TIME ZONE 'Asia/Manila', updated_at),
    company_completion_remark = CASE
      WHEN assignment_status = 'complete_company'
        THEN COALESCE(company_completion_remark, 'No Company completion remark was recorded before completion remarks became required.')
      ELSE company_completion_remark
    END,
    company_cancellation_remark = CASE
      WHEN assignment_status = 'cancelled'
        THEN COALESCE(company_cancellation_remark, 'No Company cancellation reason was recorded before cancellation remarks became required.')
      ELSE company_cancellation_remark
    END,
    student_withdrawal_remark = CASE
      WHEN assignment_status = 'withdrawn'
        THEN COALESCE(student_withdrawal_remark, 'No Student withdrawal reason was recorded before withdrawal remarks became required.')
      ELSE student_withdrawal_remark
    END
WHERE assignment_status IN ('complete_company', 'withdrawn', 'cancelled');

-- Existing completed assignments with a valid legacy feedback row had already reached Student review.
UPDATE public.internship_assignment ia
SET assignment_status = 'complete_student'
WHERE ia.assignment_status = 'complete_company'
  AND EXISTS (
    SELECT 1 FROM public.internship_feedback f
    WHERE f.internship_assignment_id = ia.internship_assignment_id
  );

INSERT INTO public.internship_assignment_status_history (
  internship_assignment_id, previous_assignment_status, new_assignment_status,
  changed_by_user_account_id, changed_at
)
SELECT ia.internship_assignment_id, 'complete_company', 'complete_student',
       s.user_account_id, f.reviewed_at
FROM public.internship_assignment ia
JOIN public.internship_feedback f
  ON f.internship_assignment_id = ia.internship_assignment_id
JOIN public.referral r ON r.referral_id = ia.referral_id
JOIN public.application a ON a.application_id = r.application_id
JOIN public.student s ON s.student_id = a.student_id
WHERE ia.assignment_status = 'complete_student'
  AND NOT EXISTS (
    SELECT 1 FROM public.internship_assignment_status_history h
    WHERE h.internship_assignment_id = ia.internship_assignment_id
      AND h.new_assignment_status = 'complete_student'
  );

INSERT INTO public.internship_assignment_status_history (
  internship_assignment_id, previous_assignment_status, new_assignment_status,
  changed_by_user_account_id, changed_at
)
SELECT ia.internship_assignment_id, NULL, 'pending', c.user_account_id, ia.created_at
FROM public.internship_assignment ia
JOIN public.referral r ON r.referral_id = ia.referral_id
JOIN public.application a ON a.application_id = r.application_id
JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
JOIN public.company c ON c.company_id = o.company_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.internship_assignment_status_history h
  WHERE h.internship_assignment_id = ia.internship_assignment_id
    AND h.previous_assignment_status IS NULL
    AND h.new_assignment_status = 'pending'
);

ALTER TABLE public.internship_assignment_status_history
  ADD COLUMN transition_remark text,
  ADD CONSTRAINT ck_assignment_status_history_status_changed
    CHECK (previous_assignment_status IS NULL OR previous_assignment_status <> new_assignment_status),
  ADD CONSTRAINT ck_assignment_status_history_initial_pending
    CHECK (previous_assignment_status IS NOT NULL OR new_assignment_status = 'pending'),
  ADD CONSTRAINT ck_assignment_status_history_remark_not_blank
    CHECK (transition_remark IS NULL OR btrim(transition_remark) <> '');

ALTER TABLE public.internship_assignment
  ADD CONSTRAINT ck_internship_assignment_completion_remark
    CHECK (company_completion_remark IS NULL OR btrim(company_completion_remark) <> ''),
  ADD CONSTRAINT ck_internship_assignment_cancellation_remark
    CHECK (company_cancellation_remark IS NULL OR btrim(company_cancellation_remark) <> ''),
  ADD CONSTRAINT ck_internship_assignment_withdrawal_remark
    CHECK (student_withdrawal_remark IS NULL OR btrim(student_withdrawal_remark) <> ''),
  ADD CONSTRAINT ck_internship_assignment_lifecycle_metadata CHECK (
    (assignment_status IN ('pending', 'ongoing') AND ended_at IS NULL AND finalized_at IS NULL AND finalized_by_user_account_id IS NULL)
    OR (assignment_status IN ('complete_company', 'complete_student') AND ended_at IS NOT NULL AND company_completion_remark IS NOT NULL AND finalized_at IS NULL AND finalized_by_user_account_id IS NULL)
    OR (assignment_status = 'withdrawn' AND ended_at IS NOT NULL AND student_withdrawal_remark IS NOT NULL AND finalized_at IS NULL AND finalized_by_user_account_id IS NULL)
    OR (assignment_status = 'cancelled' AND ended_at IS NOT NULL AND company_cancellation_remark IS NOT NULL AND finalized_at IS NULL AND finalized_by_user_account_id IS NULL)
    OR (assignment_status = 'finalized' AND ended_at IS NOT NULL AND finalized_at IS NOT NULL AND finalized_by_user_account_id IS NOT NULL)
  );

ALTER TABLE public.internship_assignment_visibility
  DROP CONSTRAINT IF EXISTS fk_assignment_visibility_assignment,
  ADD CONSTRAINT fk_assignment_visibility_assignment FOREIGN KEY (internship_assignment_id)
    REFERENCES public.internship_assignment(internship_assignment_id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.fn_validate_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  assigned_student_id integer;
  total_rendered_minutes integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.assignment_status <> 'pending' THEN
      RAISE EXCEPTION 'A new assignment must begin as pending';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM public.referral r
      JOIN public.application a ON a.application_id = r.application_id
      WHERE r.referral_id = NEW.referral_id
        AND r.company_response = 'accepted'
        AND a.student_response = 'accepted'
        AND a.application_status = 'closed'
        AND r.referral_status = 'closed'
    ) THEN
      RAISE EXCEPTION 'Assignment creation requires a finalized accepted referral candidate';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.ended_at IS NOT NULL AND NEW.ended_at IS DISTINCT FROM OLD.ended_at THEN
    RAISE EXCEPTION 'Assignment ended_at is immutable after the internship ends';
  END IF;
  IF OLD.finalized_at IS NOT NULL AND (
    NEW.finalized_at IS DISTINCT FROM OLD.finalized_at
    OR NEW.finalized_by_user_account_id IS DISTINCT FROM OLD.finalized_by_user_account_id
  ) THEN
    RAISE EXCEPTION 'Assignment finalization metadata is immutable';
  END IF;

  IF NEW.assignment_status IS DISTINCT FROM OLD.assignment_status THEN
    IF NOT (
      (OLD.assignment_status = 'pending' AND NEW.assignment_status IN ('ongoing', 'withdrawn', 'cancelled'))
      OR (OLD.assignment_status = 'ongoing' AND NEW.assignment_status IN ('complete_company', 'withdrawn', 'cancelled'))
      OR (OLD.assignment_status = 'complete_company' AND NEW.assignment_status = 'complete_student')
      OR (OLD.assignment_status IN ('complete_student', 'withdrawn', 'cancelled') AND NEW.assignment_status = 'finalized')
    ) THEN
      RAISE EXCEPTION 'Invalid assignment status transition: % -> %', OLD.assignment_status, NEW.assignment_status;
    END IF;

    IF NEW.assignment_status = 'complete_company' THEN
      SELECT COALESCE(sum(rendered_minutes), 0)::integer
      INTO total_rendered_minutes
      FROM public.attendance_record
      WHERE internship_assignment_id = NEW.internship_assignment_id;
      IF total_rendered_minutes < NEW.required_minutes THEN
        RAISE EXCEPTION 'Company completion requires all required minutes';
      END IF;
      IF NEW.company_completion_remark IS NULL OR btrim(NEW.company_completion_remark) = '' OR NEW.ended_at IS NULL THEN
        RAISE EXCEPTION 'Company completion requires a nonblank remark and ended_at';
      END IF;
    ELSIF NEW.assignment_status = 'cancelled' THEN
      IF NEW.company_cancellation_remark IS NULL OR btrim(NEW.company_cancellation_remark) = '' OR NEW.ended_at IS NULL THEN
        RAISE EXCEPTION 'Company cancellation requires a nonblank reason and ended_at';
      END IF;
    ELSIF NEW.assignment_status = 'withdrawn' THEN
      IF NEW.student_withdrawal_remark IS NULL OR btrim(NEW.student_withdrawal_remark) = '' OR NEW.ended_at IS NULL THEN
        RAISE EXCEPTION 'Student withdrawal requires a nonblank reason and ended_at';
      END IF;
    ELSIF NEW.assignment_status = 'complete_student' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.internship_feedback f
        WHERE f.internship_assignment_id = NEW.internship_assignment_id
          AND f.rating BETWEEN 1 AND 5 AND btrim(f.remark) <> ''
      ) THEN
        RAISE EXCEPTION 'Student completion requires a valid Company review';
      END IF;
    ELSIF NEW.assignment_status = 'finalized' THEN
      IF NEW.finalized_at IS NULL OR NEW.finalized_by_user_account_id IS NULL THEN
        RAISE EXCEPTION 'Finalization requires actor and timestamp metadata';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.user_account ua
        WHERE ua.user_account_id = NEW.finalized_by_user_account_id
          AND ua.user_role = 'peso_personnel'
      ) THEN
        RAISE EXCEPTION 'Only QC PESO personnel may finalize an assignment';
      END IF;
    END IF;
  END IF;

  IF NEW.assignment_status = 'ongoing'
     AND OLD.assignment_status IS DISTINCT FROM NEW.assignment_status THEN
    SELECT a.student_id INTO assigned_student_id
    FROM public.referral r
    JOIN public.application a ON a.application_id = r.application_id
    WHERE r.referral_id = NEW.referral_id;
    PERFORM 1 FROM public.student WHERE student_id = assigned_student_id FOR UPDATE;
    IF EXISTS (
      SELECT 1
      FROM public.internship_assignment ia
      JOIN public.referral r ON r.referral_id = ia.referral_id
      JOIN public.application a ON a.application_id = r.application_id
      WHERE a.student_id = assigned_student_id
        AND ia.assignment_status = 'ongoing'
        AND ia.internship_assignment_id <> NEW.internship_assignment_id
    ) THEN
      RAISE EXCEPTION 'Student % already has an ongoing assignment', assigned_student_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_derive_attendance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  assignment_start date;
  assignment_limit date;
  shift_start time;
  shift_end time;
  actual_minutes integer;
  shift_minutes integer;
BEGIN
  SELECT start_date, (ended_at AT TIME ZONE 'Asia/Manila')::date, start_shift, end_shift
  INTO assignment_start, assignment_limit, shift_start, shift_end
  FROM public.internship_assignment
  WHERE internship_assignment_id = NEW.internship_assignment_id
  FOR KEY SHARE;

  IF NEW.attendance_date < assignment_start
     OR (assignment_limit IS NOT NULL AND NEW.attendance_date > assignment_limit) THEN
    RAISE EXCEPTION 'Attendance date % is outside the assignment period', NEW.attendance_date;
  END IF;
  NEW.time_in_status := CASE WHEN NEW.time_in > shift_start THEN 'late'::public.time_in_status_enum ELSE 'on_time'::public.time_in_status_enum END;
  IF NEW.time_out IS NULL THEN
    NEW.rendered_minutes := NULL;
    NEW.rendered_hours_status := 'incomplete';
    RETURN NEW;
  END IF;
  IF NEW.time_out <= NEW.time_in THEN
    RAISE EXCEPTION 'Attendance time_out must be later than time_in';
  END IF;

  actual_minutes := GREATEST(round(extract(epoch FROM (NEW.time_out - NEW.time_in)) / 60)::integer - 60, 0);
  shift_minutes := GREATEST(round(extract(epoch FROM (shift_end - shift_start)) / 60)::integer - 60, 0);
  NEW.rendered_minutes := actual_minutes;
  NEW.rendered_hours_status := CASE
    WHEN actual_minutes < shift_minutes THEN 'undertime'::public.rendered_hours_status_enum
    WHEN actual_minutes > shift_minutes THEN 'overtime'::public.rendered_hours_status_enum
    ELSE 'complete'::public.rendered_hours_status_enum
  END;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_validate_feedback()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor_id integer := public.fn_current_status_actor();
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Student Company reviews are final and cannot be changed or deleted';
  END IF;
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.internship_assignment ia
    JOIN public.referral r ON r.referral_id = ia.referral_id
    JOIN public.application a ON a.application_id = r.application_id
    JOIN public.student s ON s.student_id = a.student_id
    WHERE ia.internship_assignment_id = NEW.internship_assignment_id
      AND ia.assignment_status = 'complete_company'
      AND s.user_account_id = actor_id
  ) THEN
    RAISE EXCEPTION 'Only the assigned Student may review a complete_company assignment';
  END IF;
  IF NEW.rating NOT BETWEEN 1 AND 5 OR NEW.remark IS NULL OR btrim(NEW.remark) = '' THEN
    RAISE EXCEPTION 'Student Company review requires rating 1-5 and a nonblank remark';
  END IF;
  RETURN NEW;
END;
$$;

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
      IF TG_OP = 'INSERT' THEN
        INSERT INTO public.internship_assignment_status_history (
          internship_assignment_id, previous_assignment_status, new_assignment_status,
          changed_by_user_account_id
        ) VALUES (NEW.internship_assignment_id, NULL, NEW.assignment_status, actor_id);
      ELSIF NEW.assignment_status IS DISTINCT FROM OLD.assignment_status THEN
        INSERT INTO public.internship_assignment_status_history (
          internship_assignment_id, previous_assignment_status, new_assignment_status,
          changed_by_user_account_id, transition_remark
        ) VALUES (
          NEW.internship_assignment_id, OLD.assignment_status, NEW.assignment_status,
          actor_id,
          CASE NEW.assignment_status
            WHEN 'complete_company' THEN NEW.company_completion_remark
            WHEN 'cancelled' THEN NEW.company_cancellation_remark
            WHEN 'withdrawn' THEN NEW.student_withdrawal_remark
            ELSE NULL
          END
        );
      END IF;
  END CASE;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_internship_assignment_workflow
BEFORE INSERT OR UPDATE ON public.internship_assignment
FOR EACH ROW EXECUTE FUNCTION public.fn_validate_assignment();
CREATE TRIGGER trg_assignment_status_history
AFTER INSERT OR UPDATE OF assignment_status ON public.internship_assignment
FOR EACH ROW EXECUTE FUNCTION public.fn_record_status_history();
CREATE TRIGGER trg_attendance_record_derive
BEFORE INSERT OR UPDATE ON public.attendance_record
FOR EACH ROW EXECUTE FUNCTION public.fn_derive_attendance();
CREATE TRIGGER trg_internship_feedback_workflow
BEFORE INSERT OR UPDATE OR DELETE ON public.internship_feedback
FOR EACH ROW EXECUTE FUNCTION public.fn_validate_feedback();
CREATE TRIGGER trg_assignment_history_append_only
BEFORE UPDATE OR DELETE ON public.internship_assignment_status_history
FOR EACH ROW EXECUTE FUNCTION public.fn_block_status_history_mutation();

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
LEFT JOIN public.internship_assignment ia ON ia.referral_id = r.referral_id AND ia.deleted_at IS NULL;

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
LEFT JOIN public.internship_assignment ia ON ia.referral_id = r.referral_id AND ia.deleted_at IS NULL;

CREATE VIEW public.vw_internship_assignment_details AS
SELECT ia.internship_assignment_id, r.referral_id, a.application_id,
  s.student_id, concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
  s.contact_email AS student_contact_email, s.contact_number AS student_contact_number,
  sai.strand_program, o.opportunity_id, o.title AS opportunity_title,
  c.company_id, c.company_name,
  ia.required_minutes, (ia.required_minutes / 60) AS required_hours,
  ia.start_date, ia.expected_end_date, ia.end_date, ia.ended_at,
  ia.working_days, ia.start_shift, ia.end_shift, ia.assignment_status,
  ia.company_completion_remark, ia.company_cancellation_remark,
  ia.student_withdrawal_remark, ia.finalized_at, ia.finalized_by_user_account_id,
  a.application_status, r.referral_status, r.company_response, a.student_response,
  f.internship_feedback_id, f.rating AS student_company_review_rating,
  f.remark AS student_company_review_remark, f.reviewed_at
FROM public.internship_assignment ia
JOIN public.referral r ON r.referral_id = ia.referral_id
JOIN public.application a ON a.application_id = r.application_id
JOIN public.student s ON s.student_id = a.student_id
LEFT JOIN public.student_academic_information sai ON sai.student_id = s.student_id
JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
JOIN public.company c ON c.company_id = o.company_id
LEFT JOIN public.internship_feedback f ON f.internship_assignment_id = ia.internship_assignment_id
WHERE ia.deleted_at IS NULL;

CREATE VIEW public.vw_attendance_summary AS
SELECT ia.internship_assignment_id, ia.assignment_status,
  s.student_id, concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
  o.opportunity_id, o.title AS opportunity_title,
  c.company_id, c.company_name,
  ia.required_minutes, (ia.required_minutes / 60) AS required_hours,
  COALESCE(sum(ar.rendered_minutes), 0::bigint) AS total_rendered_minutes,
  round(COALESCE(sum(ar.rendered_minutes), 0::numeric) / 60, 2) AS total_rendered_hours,
  count(ar.attendance_record_id) AS attendance_record_count,
  count(ar.attendance_record_id) FILTER (WHERE ar.rendered_hours_status = 'complete') AS complete_count,
  count(ar.attendance_record_id) FILTER (WHERE ar.rendered_hours_status = 'incomplete') AS incomplete_count,
  count(ar.attendance_record_id) FILTER (WHERE ar.time_in_status = 'late') AS late_count,
  count(ar.attendance_record_id) FILTER (WHERE ar.rendered_hours_status = 'undertime') AS undertime_count,
  count(ar.attendance_record_id) FILTER (WHERE ar.rendered_hours_status = 'overtime') AS overtime_count,
  min(ar.attendance_date) AS first_attendance_date,
  max(ar.attendance_date) AS latest_attendance_date,
  CASE WHEN ia.required_minutes > 0
    THEN round(COALESCE(sum(ar.rendered_minutes), 0::numeric) / ia.required_minutes * 100, 2)
    ELSE 0::numeric
  END AS completion_percentage
FROM public.internship_assignment ia
JOIN public.referral r ON r.referral_id = ia.referral_id
JOIN public.application a ON a.application_id = r.application_id
JOIN public.student s ON s.student_id = a.student_id
JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
JOIN public.company c ON c.company_id = o.company_id
LEFT JOIN public.attendance_record ar ON ar.internship_assignment_id = ia.internship_assignment_id
WHERE ia.deleted_at IS NULL
GROUP BY ia.internship_assignment_id, ia.assignment_status, s.student_id,
  s.first_name, s.middle_name, s.last_name, s.extension_name,
  o.opportunity_id, o.title, c.company_id, c.company_name, ia.required_minutes;

COMMIT;
