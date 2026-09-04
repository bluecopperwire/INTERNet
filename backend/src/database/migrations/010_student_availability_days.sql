BEGIN;

ALTER TABLE public.internship_preference
  ADD COLUMN available_days_new smallint[];

UPDATE public.internship_preference
SET available_days_new = CASE available_days::text
    WHEN 'weekdays' THEN ARRAY[1, 2, 3, 4, 5]::smallint[]
    WHEN 'weekends' THEN ARRAY[6, 0]::smallint[]
    WHEN 'flexible' THEN ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[]
  END;

DROP VIEW IF EXISTS public.vw_student_profile_details;

ALTER TABLE public.internship_preference
  DROP COLUMN available_days;
ALTER TABLE public.internship_preference
  RENAME COLUMN available_days_new TO available_days;
ALTER TABLE public.internship_preference
  ALTER COLUMN available_days SET NOT NULL,
  ADD CONSTRAINT ck_internship_preference_available_days
    CHECK (public.fn_valid_working_days(available_days));

DROP TYPE public.work_schedule_enum;

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

COMMIT;
