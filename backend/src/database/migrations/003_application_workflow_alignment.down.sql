BEGIN;

DROP TABLE IF EXISTS public.internship_assignment_visibility;
DROP TABLE IF EXISTS public.referral_visibility;
DROP TABLE IF EXISTS public.application_visibility;

ALTER TABLE public.referral
  DROP CONSTRAINT IF EXISTS ck_referral_rejection_remark_required;
ALTER TABLE public.application
  DROP CONSTRAINT IF EXISTS ck_application_rejection_remark_required;

CREATE OR REPLACE FUNCTION public.fn_validate_opportunity_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.opportunity_status IS DISTINCT FROM OLD.opportunity_status AND NOT (
    (OLD.opportunity_status = 'open' AND NEW.opportunity_status = 'closed')
    OR (OLD.opportunity_status = 'closed' AND NEW.opportunity_status IN ('open', 'archived'))
    OR (OLD.opportunity_status = 'archived' AND NEW.opportunity_status = 'closed')
  ) THEN
    RAISE EXCEPTION 'Invalid opportunity status transition: % -> %', OLD.opportunity_status, NEW.opportunity_status;
  END IF;
  IF OLD.opportunity_status = 'closed' AND NEW.opportunity_status = 'open' AND NEW.application_deadline <= CURRENT_TIMESTAMP THEN
    RAISE EXCEPTION 'A reopened opportunity requires a future application deadline';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_validate_application()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  opportunity_state public.opportunity_status_enum;
  deadline timestamptz;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.application_status <> 'submitted' OR NEW.student_response <> 'pending' THEN
      RAISE EXCEPTION 'A new application must begin as submitted with a pending student response';
    END IF;
    SELECT opportunity_status, application_deadline INTO opportunity_state, deadline
    FROM public.opportunity WHERE opportunity_id = NEW.opportunity_id FOR KEY SHARE;
    IF opportunity_state <> 'open' OR NEW.submitted_at >= deadline THEN
      RAISE EXCEPTION 'Applications require an open opportunity and submission before its deadline';
    END IF;
  ELSE
    IF NEW.application_status IS DISTINCT FROM OLD.application_status AND NOT (
      (OLD.application_status = 'submitted' AND NEW.application_status IN ('under_review', 'withdrawn', 'expired'))
      OR (OLD.application_status = 'under_review' AND NEW.application_status IN ('approved_for_referral', 'rejected_for_referral', 'withdrawn', 'expired'))
      OR (OLD.application_status = 'approved_for_referral' AND NEW.application_status IN ('closed', 'withdrawn'))
    ) THEN
      RAISE EXCEPTION 'Invalid application status transition: % -> %', OLD.application_status, NEW.application_status;
    END IF;
    IF NEW.student_response IS DISTINCT FROM OLD.student_response AND NOT (
      OLD.student_response = 'pending' AND NEW.student_response IN ('accepted', 'declined')
    ) THEN
      RAISE EXCEPTION 'Invalid student response transition: % -> %', OLD.student_response, NEW.student_response;
    END IF;
    IF NEW.student_response IS DISTINCT FROM OLD.student_response AND NOT EXISTS (
      SELECT 1 FROM public.referral
      WHERE application_id = NEW.application_id AND company_response = 'accepted'
    ) THEN
      RAISE EXCEPTION 'A student may respond only after company acceptance';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_check_referral_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_application_id integer;
  target_referral_id integer;
  stored_referral_status public.referral_status_enum;
  stored_company_response public.company_response_enum;
  stored_student_response public.student_response_enum;
BEGIN
  IF TG_TABLE_NAME = 'referral' THEN
    target_referral_id := COALESCE(NEW.referral_id, OLD.referral_id);
  ELSE
    target_application_id := COALESCE(NEW.application_id, OLD.application_id);
    SELECT referral_id INTO target_referral_id
    FROM public.referral
    WHERE application_id = target_application_id;
  END IF;

  IF target_referral_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT r.referral_status, r.company_response, a.student_response
  INTO stored_referral_status, stored_company_response, stored_student_response
  FROM public.referral r
  JOIN public.application a ON a.application_id = r.application_id
  WHERE r.referral_id = target_referral_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF stored_referral_status = 'sent' AND stored_company_response <> 'pending' THEN
    RAISE EXCEPTION 'A sent referral must have a pending company response';
  END IF;
  IF stored_company_response = 'for_interview' AND stored_referral_status <> 'under_review' THEN
    RAISE EXCEPTION 'The interview stage requires an under_review referral';
  END IF;
  IF stored_company_response = 'accepted' AND stored_referral_status NOT IN ('under_review', 'closed') THEN
    RAISE EXCEPTION 'An accepted company response requires an under_review or closed referral';
  END IF;
  IF stored_company_response = 'rejected' AND stored_referral_status <> 'closed' THEN
    RAISE EXCEPTION 'A rejected company response requires a closed referral';
  END IF;
  IF stored_student_response <> 'pending' AND stored_company_response <> 'accepted' THEN
    RAISE EXCEPTION 'A non-pending student response requires company acceptance';
  END IF;
  IF stored_referral_status = 'closed' AND stored_company_response = 'accepted' AND stored_student_response = 'pending' THEN
    RAISE EXCEPTION 'An accepted referral cannot close before the student responds';
  END IF;
  RETURN NULL;
END;
$$;

COMMIT;
