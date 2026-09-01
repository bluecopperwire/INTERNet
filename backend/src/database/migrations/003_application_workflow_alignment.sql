BEGIN;

UPDATE public.application
SET remark = 'No rejection reason was recorded before workflow validation was enabled.'
WHERE application_status = 'rejected_for_referral'
  AND (remark IS NULL OR btrim(remark) = '');

UPDATE public.referral
SET remark = 'No rejection reason was recorded before workflow validation was enabled.'
WHERE company_response = 'rejected'
  AND (remark IS NULL OR btrim(remark) = '');

-- Finish all deferred workflow/history trigger events raised by the legacy-data
-- backfill before altering either affected table. TypeORM executes this migration
-- with transaction mode "none", so these explicit boundaries are authoritative.
COMMIT;

BEGIN;

ALTER TABLE public.application
  ADD CONSTRAINT ck_application_rejection_remark_required
  CHECK (
    application_status <> 'rejected_for_referral'
    OR (remark IS NOT NULL AND btrim(remark) <> '')
  );

ALTER TABLE public.referral
  ADD CONSTRAINT ck_referral_rejection_remark_required
  CHECK (
    company_response <> 'rejected'
    OR (remark IS NOT NULL AND btrim(remark) <> '')
  );

CREATE TABLE public.application_visibility (
  application_id integer NOT NULL,
  student_hidden_at timestamptz,
  student_hidden_by_user_account_id integer,
  qc_peso_hidden_at timestamptz,
  qc_peso_hidden_by_user_account_id integer,
  CONSTRAINT pk_application_visibility PRIMARY KEY (application_id),
  CONSTRAINT fk_application_visibility_application FOREIGN KEY (application_id)
    REFERENCES public.application(application_id) ON DELETE CASCADE,
  CONSTRAINT fk_application_visibility_student_actor FOREIGN KEY (student_hidden_by_user_account_id)
    REFERENCES public.user_account(user_account_id) ON DELETE RESTRICT,
  CONSTRAINT fk_application_visibility_qc_actor FOREIGN KEY (qc_peso_hidden_by_user_account_id)
    REFERENCES public.user_account(user_account_id) ON DELETE RESTRICT,
  CONSTRAINT ck_application_visibility_student_pair CHECK (
    (student_hidden_at IS NULL) = (student_hidden_by_user_account_id IS NULL)
  ),
  CONSTRAINT ck_application_visibility_qc_pair CHECK (
    (qc_peso_hidden_at IS NULL) = (qc_peso_hidden_by_user_account_id IS NULL)
  )
);

CREATE TABLE public.referral_visibility (
  referral_id integer NOT NULL,
  qc_peso_hidden_at timestamptz,
  qc_peso_hidden_by_user_account_id integer,
  employer_hidden_at timestamptz,
  employer_hidden_by_user_account_id integer,
  CONSTRAINT pk_referral_visibility PRIMARY KEY (referral_id),
  CONSTRAINT fk_referral_visibility_referral FOREIGN KEY (referral_id)
    REFERENCES public.referral(referral_id) ON DELETE CASCADE,
  CONSTRAINT fk_referral_visibility_qc_actor FOREIGN KEY (qc_peso_hidden_by_user_account_id)
    REFERENCES public.user_account(user_account_id) ON DELETE RESTRICT,
  CONSTRAINT fk_referral_visibility_employer_actor FOREIGN KEY (employer_hidden_by_user_account_id)
    REFERENCES public.user_account(user_account_id) ON DELETE RESTRICT,
  CONSTRAINT ck_referral_visibility_qc_pair CHECK (
    (qc_peso_hidden_at IS NULL) = (qc_peso_hidden_by_user_account_id IS NULL)
  ),
  CONSTRAINT ck_referral_visibility_employer_pair CHECK (
    (employer_hidden_at IS NULL) = (employer_hidden_by_user_account_id IS NULL)
  )
);

CREATE TABLE public.internship_assignment_visibility (
  internship_assignment_id integer NOT NULL,
  student_hidden_at timestamptz,
  student_hidden_by_user_account_id integer,
  employer_hidden_at timestamptz,
  employer_hidden_by_user_account_id integer,
  CONSTRAINT pk_internship_assignment_visibility PRIMARY KEY (internship_assignment_id),
  CONSTRAINT fk_assignment_visibility_assignment FOREIGN KEY (internship_assignment_id)
    REFERENCES public.internship_assignment(internship_assignment_id) ON DELETE CASCADE,
  CONSTRAINT fk_assignment_visibility_student_actor FOREIGN KEY (student_hidden_by_user_account_id)
    REFERENCES public.user_account(user_account_id) ON DELETE RESTRICT,
  CONSTRAINT fk_assignment_visibility_employer_actor FOREIGN KEY (employer_hidden_by_user_account_id)
    REFERENCES public.user_account(user_account_id) ON DELETE RESTRICT,
  CONSTRAINT ck_assignment_visibility_student_pair CHECK (
    (student_hidden_at IS NULL) = (student_hidden_by_user_account_id IS NULL)
  ),
  CONSTRAINT ck_assignment_visibility_employer_pair CHECK (
    (employer_hidden_at IS NULL) = (employer_hidden_by_user_account_id IS NULL)
  )
);

CREATE INDEX ix_application_visibility_student_hidden
  ON public.application_visibility (application_id)
  WHERE student_hidden_at IS NOT NULL;
CREATE INDEX ix_application_visibility_qc_hidden
  ON public.application_visibility (application_id)
  WHERE qc_peso_hidden_at IS NOT NULL;
CREATE INDEX ix_referral_visibility_qc_hidden
  ON public.referral_visibility (referral_id)
  WHERE qc_peso_hidden_at IS NOT NULL;
CREATE INDEX ix_referral_visibility_employer_hidden
  ON public.referral_visibility (referral_id)
  WHERE employer_hidden_at IS NOT NULL;
CREATE INDEX ix_assignment_visibility_student_hidden
  ON public.internship_assignment_visibility (internship_assignment_id)
  WHERE student_hidden_at IS NOT NULL;
CREATE INDEX ix_assignment_visibility_employer_hidden
  ON public.internship_assignment_visibility (internship_assignment_id)
  WHERE employer_hidden_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_validate_opportunity_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.opportunity_status IS DISTINCT FROM OLD.opportunity_status AND NOT (
    (OLD.opportunity_status = 'open' AND NEW.opportunity_status IN ('closed', 'archived'))
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
      OR (OLD.application_status = 'approved_for_referral' AND NEW.application_status IN ('closed', 'withdrawn', 'expired'))
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

-- Terminal lifecycle states preserve the latest company response for audit and
-- display. The original consistency function treated that retained response as
-- invalid once a referral was withdrawn or expired.
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
  IF stored_company_response = 'for_interview'
     AND stored_referral_status NOT IN ('under_review', 'withdrawn', 'expired') THEN
    RAISE EXCEPTION 'The interview stage requires an under_review or terminal referral';
  END IF;
  IF stored_company_response = 'accepted'
     AND stored_referral_status NOT IN ('under_review', 'closed', 'withdrawn', 'expired') THEN
    RAISE EXCEPTION 'An accepted company response requires an under_review or terminal referral';
  END IF;
  IF stored_company_response = 'rejected'
     AND stored_referral_status NOT IN ('closed', 'withdrawn', 'expired') THEN
    RAISE EXCEPTION 'A rejected company response requires a closed or terminal referral';
  END IF;
  IF stored_student_response <> 'pending' AND stored_company_response <> 'accepted' THEN
    RAISE EXCEPTION 'A non-pending student response requires company acceptance';
  END IF;
  IF stored_referral_status = 'closed'
     AND stored_company_response = 'accepted'
     AND stored_student_response = 'pending' THEN
    RAISE EXCEPTION 'An accepted referral cannot close before the student responds';
  END IF;
  RETURN NULL;
END;
$$;

COMMIT;
