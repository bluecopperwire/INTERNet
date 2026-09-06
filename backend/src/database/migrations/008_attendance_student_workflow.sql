BEGIN;

LOCK TABLE public.attendance_record IN ACCESS EXCLUSIVE MODE;

DROP VIEW IF EXISTS public.vw_attendance_summary;
DROP TRIGGER IF EXISTS trg_attendance_record_derive ON public.attendance_record;
DROP FUNCTION IF EXISTS public.fn_derive_attendance();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status_enum') THEN
    CREATE TYPE public.attendance_status_enum AS ENUM ('present', 'absent', 'incomplete');
  END IF;
END;
$$;

ALTER TABLE public.attendance_record
  ADD COLUMN attendance_status public.attendance_status_enum;

ALTER TABLE public.attendance_record
  DROP CONSTRAINT IF EXISTS ck_attendance_record_photo_path_not_blank,
  DROP CONSTRAINT IF EXISTS ck_attendance_record_rendered_consistency,
  DROP CONSTRAINT IF EXISTS ck_attendance_record_rendered_minutes_range,
  DROP CONSTRAINT IF EXISTS ck_attendance_record_time_order;

UPDATE public.attendance_record
SET attendance_status = CASE
      WHEN time_out IS NOT NULL THEN 'present'::public.attendance_status_enum
      WHEN time_in IS NOT NULL
       AND attendance_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::date
        THEN 'incomplete'::public.attendance_status_enum
      WHEN time_in IS NOT NULL THEN 'present'::public.attendance_status_enum
      ELSE NULL
    END,
    rendered_minutes = CASE
      WHEN time_in IS NOT NULL AND time_out IS NULL THEN 0
      ELSE rendered_minutes
    END;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.attendance_record WHERE attendance_status IS NULL) THEN
    RAISE EXCEPTION 'Attendance migration found rows without provable Clock In semantics';
  END IF;
END;
$$;

ALTER TABLE public.attendance_record
  ALTER COLUMN time_in DROP NOT NULL,
  ALTER COLUMN rendered_minutes SET DEFAULT 0,
  ALTER COLUMN rendered_minutes SET NOT NULL,
  ALTER COLUMN attendance_status SET NOT NULL,
  DROP COLUMN time_in_status,
  DROP COLUMN rendered_hours_status,
  DROP COLUMN photo_file_path;

ALTER TABLE public.attendance_record
  ADD CONSTRAINT ck_attendance_record_rendered_minutes_nonnegative
    CHECK (rendered_minutes >= 0),
  ADD CONSTRAINT ck_attendance_record_time_order
    CHECK (time_out IS NULL OR (time_in IS NOT NULL AND time_out > time_in)),
  ADD CONSTRAINT ck_attendance_record_status_shape CHECK (
    (attendance_status = 'absent' AND time_in IS NULL AND time_out IS NULL AND rendered_minutes = 0)
    OR
    (attendance_status = 'incomplete' AND time_in IS NOT NULL AND time_out IS NULL AND rendered_minutes = 0)
    OR
    (attendance_status = 'present' AND time_in IS NOT NULL AND
      ((time_out IS NULL AND rendered_minutes = 0) OR
       (time_out IS NOT NULL AND rendered_minutes >= 0)))
  );

CREATE FUNCTION public.fn_derive_attendance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  assignment_start date;
  assignment_limit date;
  actual_minutes integer;
BEGIN
  SELECT start_date, (ended_at AT TIME ZONE 'Asia/Manila')::date
  INTO assignment_start, assignment_limit
  FROM public.internship_assignment
  WHERE internship_assignment_id = NEW.internship_assignment_id
  FOR KEY SHARE;

  IF NEW.attendance_date < assignment_start
     OR (assignment_limit IS NOT NULL AND NEW.attendance_date > assignment_limit) THEN
    RAISE EXCEPTION 'Attendance date % is outside the operational assignment period', NEW.attendance_date;
  END IF;

  IF NEW.attendance_status = 'absent' THEN
    NEW.time_in := NULL;
    NEW.time_out := NULL;
    NEW.rendered_minutes := 0;
    RETURN NEW;
  END IF;

  IF NEW.time_in IS NULL THEN
    RAISE EXCEPTION '% Attendance requires time_in', NEW.attendance_status;
  END IF;

  IF NEW.attendance_status = 'incomplete' THEN
    NEW.time_out := NULL;
    NEW.rendered_minutes := 0;
    RETURN NEW;
  END IF;

  IF NEW.time_out IS NULL THEN
    NEW.rendered_minutes := 0;
    RETURN NEW;
  END IF;

  IF NEW.time_out <= NEW.time_in THEN
    RAISE EXCEPTION 'Attendance time_out must be later than time_in';
  END IF;

  actual_minutes := GREATEST(
    floor(extract(epoch FROM (NEW.time_out - NEW.time_in)) / 60)::integer - 60,
    0
  );
  NEW.rendered_minutes := actual_minutes;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attendance_record_derive
BEFORE INSERT OR UPDATE ON public.attendance_record
FOR EACH ROW EXECUTE FUNCTION public.fn_derive_attendance();

CREATE VIEW public.vw_attendance_summary AS
SELECT ia.internship_assignment_id, ia.assignment_status,
  s.student_id, concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
  o.opportunity_id, o.title AS opportunity_title,
  c.company_id, c.company_name,
  ia.required_minutes, (ia.required_minutes / 60) AS required_hours,
  COALESCE(sum(ar.rendered_minutes), 0::bigint) AS total_rendered_minutes,
  round(COALESCE(sum(ar.rendered_minutes), 0::numeric) / 60, 2) AS total_rendered_hours,
  count(ar.attendance_record_id) AS attendance_record_count,
  count(ar.attendance_record_id) FILTER (WHERE ar.attendance_status = 'present') AS present_count,
  count(ar.attendance_record_id) FILTER (WHERE ar.attendance_status = 'absent') AS absent_count,
  count(ar.attendance_record_id) FILTER (WHERE ar.attendance_status = 'incomplete') AS incomplete_count,
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

DROP TYPE IF EXISTS public.rendered_hours_status_enum;
DROP TYPE IF EXISTS public.time_in_status_enum;

COMMIT;
