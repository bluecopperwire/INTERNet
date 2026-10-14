BEGIN;

CREATE TABLE public.audit_event (
  audit_event_id bigint GENERATED ALWAYS AS IDENTITY,
  category text NOT NULL,
  action_code text NOT NULL,
  entity_user_account_id integer NOT NULL,
  entity_email text NOT NULL,
  entity_code text NOT NULL,
  actor_user_account_id integer,
  actor_email text NOT NULL,
  actor_code text,
  previous_status text,
  new_status text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_kind text NOT NULL,
  source_record_id integer NOT NULL,
  provenance_key text,
  CONSTRAINT pk_audit_event PRIMARY KEY (audit_event_id),
  CONSTRAINT uq_audit_event_provenance UNIQUE (provenance_key),
  CONSTRAINT fk_audit_event_entity FOREIGN KEY (entity_user_account_id)
    REFERENCES public.user_account(user_account_id) ON DELETE RESTRICT,
  CONSTRAINT fk_audit_event_actor FOREIGN KEY (actor_user_account_id)
    REFERENCES public.user_account(user_account_id) ON DELETE SET NULL,
  CONSTRAINT ck_audit_event_category CHECK (
    category IN ('accounts', 'applications_referrals', 'internships')
  ),
  CONSTRAINT ck_audit_event_action CHECK (
    action_code IN (
      'account_created', 'account_suspended', 'account_unsuspended',
      'account_deactivated', 'application_submitted',
      'qc_peso_review_started', 'application_referred_to_employer',
      'application_rejected_by_qc_peso', 'employer_review_started',
      'interview_scheduled', 'offer_extended_by_employer',
      'referral_rejected_by_employer', 'offer_accepted_by_student',
      'offer_declined_by_student', 'application_withdrawn_by_student',
      'application_or_referral_expired', 'internship_created',
      'internship_started', 'internship_marked_complete_by_company',
      'internship_completion_confirmed_by_student',
      'internship_withdrawn_by_student', 'internship_cancelled_by_company',
      'internship_finalized_by_qc_peso'
    )
  ),
  CONSTRAINT ck_audit_event_required_text CHECK (
    btrim(entity_email) <> '' AND btrim(entity_code) <> ''
    AND btrim(actor_email) <> '' AND btrim(new_status) <> ''
    AND btrim(source_kind) <> ''
    AND (previous_status IS NULL OR btrim(previous_status) <> '')
    AND (actor_code IS NULL OR btrim(actor_code) <> '')
    AND (provenance_key IS NULL OR btrim(provenance_key) <> '')
  )
);

CREATE INDEX ix_audit_event_category_occurred
  ON public.audit_event(category, occurred_at DESC, audit_event_id DESC);
CREATE INDEX ix_audit_event_category_action_occurred
  ON public.audit_event(category, action_code, occurred_at DESC);
CREATE INDEX ix_audit_event_entity_search
  ON public.audit_event(lower(entity_email), lower(entity_code));
CREATE INDEX ix_audit_event_actor_search
  ON public.audit_event(lower(actor_email), lower(actor_code));

CREATE FUNCTION public.fn_application_referral_audit_status(
  application_status text,
  student_response text,
  referral_status text,
  company_response text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN application_status = 'withdrawn' OR referral_status = 'withdrawn'
      THEN 'Withdrawn (Student)'
    WHEN application_status = 'expired' OR referral_status = 'expired'
      THEN 'Expired (Employer)'
    WHEN application_status = 'submitted' THEN 'For Review (QC PESO)'
    WHEN application_status = 'under_review' THEN 'Under Review (QC PESO)'
    WHEN application_status = 'rejected_for_referral' THEN 'Rejected (QC PESO)'
    WHEN company_response = 'rejected' THEN 'Rejected (Employer)'
    WHEN company_response = 'accepted' AND student_response = 'accepted'
      THEN 'Offer Accepted (Student)'
    WHEN company_response = 'accepted' AND student_response = 'declined'
      THEN 'Offer Declined (Student)'
    WHEN company_response = 'accepted' THEN 'Offer Received (Student)'
    WHEN company_response = 'for_interview' THEN 'For Interview (Employer)'
    WHEN referral_status = 'under_review' THEN 'Under Review (Employer)'
    ELSE 'For Review (Employer)'
  END
$$;

CREATE FUNCTION public.fn_append_audit_event(
  event_category text,
  event_action_code text,
  entity_account_id integer,
  actor_account_id integer,
  event_previous_status text,
  event_new_status text,
  event_occurred_at timestamptz,
  event_source_kind text,
  event_source_record_id integer,
  event_provenance_key text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  entity_account public.user_account%ROWTYPE;
  actor_account public.user_account%ROWTYPE;
  resolved_actor_email text := 'System';
  resolved_actor_code text := NULL;
BEGIN
  SELECT * INTO STRICT entity_account
  FROM public.user_account
  WHERE user_account_id = entity_account_id;

  IF actor_account_id IS NOT NULL THEN
    SELECT * INTO STRICT actor_account
    FROM public.user_account
    WHERE user_account_id = actor_account_id;
    resolved_actor_email := actor_account.email;
    resolved_actor_code := actor_account.account_code;
  END IF;

  INSERT INTO public.audit_event (
    category, action_code, entity_user_account_id, entity_email, entity_code,
    actor_user_account_id, actor_email, actor_code, previous_status,
    new_status, occurred_at, source_kind, source_record_id, provenance_key
  ) VALUES (
    event_category, event_action_code, entity_account.user_account_id,
    entity_account.email, entity_account.account_code, actor_account_id,
    resolved_actor_email, resolved_actor_code, event_previous_status,
    event_new_status, event_occurred_at, event_source_kind,
    event_source_record_id, event_provenance_key
  )
  ON CONFLICT (provenance_key) DO NOTHING;
END;
$$;

CREATE FUNCTION public.fn_block_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_event is append-only';
END;
$$;

CREATE TRIGGER trg_audit_event_append_only
BEFORE UPDATE OR DELETE ON public.audit_event
FOR EACH ROW EXECUTE FUNCTION public.fn_block_audit_event_mutation();

-- Existing account creation is always recoverable from user_account.created_at.
SELECT public.fn_append_audit_event(
  'accounts', 'account_created', ua.user_account_id, NULL, NULL, 'Active',
  ua.created_at, 'user_account', ua.user_account_id,
  'backfill:user_account:created:' || ua.user_account_id
)
FROM public.user_account ua;

SELECT public.fn_append_audit_event(
  'accounts',
  CASE
    WHEN h.new_account_status::text = 'suspended' THEN 'account_suspended'
    WHEN h.new_account_status::text = 'active' THEN 'account_unsuspended'
    ELSE 'account_deactivated'
  END,
  h.user_account_id, h.changed_by_user_account_id,
  CASE h.previous_account_status::text
    WHEN 'active' THEN 'Active'
    WHEN 'suspended' THEN 'Suspended'
    ELSE 'Deactivated'
  END,
  CASE h.new_account_status::text
    WHEN 'active' THEN 'Active'
    WHEN 'suspended' THEN 'Suspended'
    ELSE 'Deactivated'
  END,
  h.changed_at, 'user_account', h.user_account_id,
  'backfill:user_account_status_history:' || h.user_account_status_history_id
)
FROM public.user_account_status_history h;

-- Backfill only application transitions whose display states are deterministic.
SELECT public.fn_append_audit_event(
  'applications_referrals',
  CASE
    WHEN h.previous_application_status IS NULL THEN 'application_submitted'
    WHEN h.new_application_status::text = 'under_review' THEN 'qc_peso_review_started'
    WHEN h.new_application_status::text = 'approved_for_referral' THEN 'application_referred_to_employer'
    WHEN h.new_application_status::text = 'rejected_for_referral' THEN 'application_rejected_by_qc_peso'
    WHEN h.new_application_status::text = 'withdrawn' THEN 'application_withdrawn_by_student'
    ELSE 'application_or_referral_expired'
  END,
  s.user_account_id, h.changed_by_user_account_id,
  CASE h.previous_application_status::text
    WHEN 'submitted' THEN 'For Review (QC PESO)'
    WHEN 'under_review' THEN 'Under Review (QC PESO)'
    ELSE NULL
  END,
  CASE h.new_application_status::text
    WHEN 'submitted' THEN 'For Review (QC PESO)'
    WHEN 'under_review' THEN 'Under Review (QC PESO)'
    WHEN 'approved_for_referral' THEN 'For Review (Employer)'
    WHEN 'rejected_for_referral' THEN 'Rejected (QC PESO)'
    WHEN 'withdrawn' THEN 'Withdrawn (Student)'
    ELSE 'Expired (Employer)'
  END,
  h.changed_at, 'application', h.application_id,
  'backfill:application_status_history:' || h.application_status_history_id
)
FROM public.application_status_history h
JOIN public.application a ON a.application_id = h.application_id
JOIN public.student s ON s.student_id = a.student_id
WHERE
  (h.previous_application_status IS NULL AND h.new_application_status::text = 'submitted')
  OR (h.previous_application_status::text = 'submitted' AND h.new_application_status::text IN ('under_review', 'withdrawn', 'expired'))
  OR (h.previous_application_status::text = 'under_review' AND h.new_application_status::text IN ('approved_for_referral', 'rejected_for_referral', 'withdrawn', 'expired'));

-- Referral review, withdrawal, and expiry are recoverable when the surrounding
-- response state establishes a single unambiguous display status.
SELECT public.fn_append_audit_event(
  'applications_referrals',
  CASE h.new_referral_status::text
    WHEN 'under_review' THEN 'employer_review_started'
    WHEN 'withdrawn' THEN 'application_withdrawn_by_student'
    ELSE 'application_or_referral_expired'
  END,
  s.user_account_id, h.changed_by_user_account_id,
  public.fn_application_referral_audit_status(
    'approved_for_referral', a.student_response::text,
    h.previous_referral_status::text, r.company_response::text
  ),
  CASE h.new_referral_status::text
    WHEN 'under_review' THEN 'Under Review (Employer)'
    WHEN 'withdrawn' THEN 'Withdrawn (Student)'
    ELSE 'Expired (Employer)'
  END,
  h.changed_at, 'referral', h.referral_id,
  'backfill:referral_status_history:' || h.referral_status_history_id
)
FROM public.referral_status_history h
JOIN public.referral r ON r.referral_id = h.referral_id
JOIN public.application a ON a.application_id = r.application_id
JOIN public.student s ON s.student_id = a.student_id
WHERE
  (h.new_referral_status::text = 'under_review'
    AND (
      r.company_response::text = 'pending'
      OR r.company_responded_at IS NULL
      OR abs(extract(epoch FROM (r.company_responded_at - h.changed_at))) > 1
    ))
  OR (h.new_referral_status::text IN ('withdrawn', 'expired')
    AND h.previous_referral_status::text IN ('sent', 'under_review'));

-- Current employer responses retain a reliable response timestamp and actor role.
SELECT public.fn_append_audit_event(
  'applications_referrals',
  CASE r.company_response::text
    WHEN 'for_interview' THEN 'interview_scheduled'
    WHEN 'accepted' THEN 'offer_extended_by_employer'
    ELSE 'referral_rejected_by_employer'
  END,
  student_account.user_account_id, company_account.user_account_id,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.referral_status_history h
      WHERE h.referral_id = r.referral_id
        AND h.previous_referral_status::text = 'sent'
        AND h.new_referral_status::text = 'under_review'
        AND abs(extract(epoch FROM (h.changed_at - r.company_responded_at))) <= 1
    ) THEN 'For Review (Employer)'
    WHEN r.company_response::text IN ('accepted', 'rejected')
      AND EXISTS (SELECT 1 FROM public.interview i WHERE i.referral_id = r.referral_id)
      THEN 'For Interview (Employer)'
    ELSE 'Under Review (Employer)'
  END,
  CASE r.company_response::text
    WHEN 'for_interview' THEN 'For Interview (Employer)'
    WHEN 'accepted' THEN 'Offer Received (Student)'
    ELSE 'Rejected (Employer)'
  END,
  r.company_responded_at, 'referral', r.referral_id,
  'backfill:referral:company_response:' || r.referral_id || ':' || r.company_response::text
)
FROM public.referral r
JOIN public.application a ON a.application_id = r.application_id
JOIN public.student s ON s.student_id = a.student_id
JOIN public.user_account student_account ON student_account.user_account_id = s.user_account_id
JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
JOIN public.company c ON c.company_id = o.company_id
JOIN public.user_account company_account ON company_account.user_account_id = c.user_account_id
WHERE r.company_response::text <> 'pending' AND r.company_responded_at IS NOT NULL;

SELECT public.fn_append_audit_event(
  'applications_referrals',
  CASE a.student_response::text
    WHEN 'accepted' THEN 'offer_accepted_by_student'
    ELSE 'offer_declined_by_student'
  END,
  s.user_account_id, s.user_account_id,
  'Offer Received (Student)',
  CASE a.student_response::text
    WHEN 'accepted' THEN 'Offer Accepted (Student)'
    ELSE 'Offer Declined (Student)'
  END,
  a.student_responded_at, 'application', a.application_id,
  'backfill:application:student_response:' || a.application_id || ':' || a.student_response::text
)
FROM public.application a
JOIN public.student s ON s.student_id = a.student_id
WHERE a.student_response::text <> 'pending' AND a.student_responded_at IS NOT NULL;

SELECT public.fn_append_audit_event(
  'internships',
  CASE h.new_assignment_status::text
    WHEN 'pending' THEN 'internship_created'
    WHEN 'ongoing' THEN 'internship_started'
    WHEN 'complete_company' THEN 'internship_marked_complete_by_company'
    WHEN 'complete_student' THEN 'internship_completion_confirmed_by_student'
    WHEN 'withdrawn' THEN 'internship_withdrawn_by_student'
    WHEN 'cancelled' THEN 'internship_cancelled_by_company'
    ELSE 'internship_finalized_by_qc_peso'
  END,
  s.user_account_id, h.changed_by_user_account_id,
  CASE h.previous_assignment_status::text
    WHEN 'pending' THEN 'Pending'
    WHEN 'ongoing' THEN 'Ongoing'
    WHEN 'complete_company' THEN 'Complete (Company)'
    WHEN 'complete_student' THEN 'Complete (Student)'
    WHEN 'withdrawn' THEN 'Withdrawn'
    WHEN 'cancelled' THEN 'Cancelled'
    WHEN 'finalized' THEN 'Finalized'
    ELSE NULL
  END,
  CASE h.new_assignment_status::text
    WHEN 'pending' THEN 'Pending'
    WHEN 'ongoing' THEN 'Ongoing'
    WHEN 'complete_company' THEN 'Complete (Company)'
    WHEN 'complete_student' THEN 'Complete (Student)'
    WHEN 'withdrawn' THEN 'Withdrawn'
    WHEN 'cancelled' THEN 'Cancelled'
    ELSE 'Finalized'
  END,
  h.changed_at, 'internship_assignment', h.internship_assignment_id,
  'backfill:internship_assignment_status_history:' || h.internship_assignment_status_history_id
)
FROM public.internship_assignment_status_history h
JOIN public.internship_assignment ia
  ON ia.internship_assignment_id = h.internship_assignment_id
JOIN public.referral r ON r.referral_id = ia.referral_id
JOIN public.application a ON a.application_id = r.application_id
JOIN public.student s ON s.student_id = a.student_id;

CREATE FUNCTION public.fn_record_account_audit_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor_id integer := public.fn_current_status_actor();
  action_code text;
  previous_label text;
  new_label text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Student registration is self-service. Other creator-less inserts (for
    -- example the bootstrap administrator) are system operations.
    IF actor_id IS NULL AND NEW.user_role::text = 'student' THEN
      actor_id := NEW.user_account_id;
    END IF;
    PERFORM public.fn_append_audit_event(
      'accounts', 'account_created', NEW.user_account_id, actor_id, NULL,
      'Active', NEW.created_at, 'user_account', NEW.user_account_id, NULL
    );
    RETURN NULL;
  END IF;

  IF NEW.account_status IS NOT DISTINCT FROM OLD.account_status THEN
    RETURN NULL;
  END IF;
  previous_label := CASE OLD.account_status::text
    WHEN 'active' THEN 'Active' WHEN 'suspended' THEN 'Suspended'
    ELSE 'Deactivated' END;
  new_label := CASE NEW.account_status::text
    WHEN 'active' THEN 'Active' WHEN 'suspended' THEN 'Suspended'
    ELSE 'Deactivated' END;
  action_code := CASE NEW.account_status::text
    WHEN 'suspended' THEN 'account_suspended'
    WHEN 'active' THEN 'account_unsuspended'
    ELSE 'account_deactivated' END;
  PERFORM public.fn_append_audit_event(
    'accounts', action_code, NEW.user_account_id, actor_id,
    previous_label, new_label, CURRENT_TIMESTAMP,
    'user_account', NEW.user_account_id, NULL
  );
  RETURN NULL;
END;
$$;

CREATE FUNCTION public.fn_record_application_referral_audit_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor_id integer := public.fn_current_status_actor();
  entity_account_id integer;
  app_status text;
  app_student_response text;
  ref_status text;
  ref_company_response text;
  old_display text;
  new_display text;
  action_code text;
  record_id integer;
BEGIN
  IF TG_TABLE_NAME = 'application' THEN
    record_id := NEW.application_id;
    SELECT s.user_account_id INTO STRICT entity_account_id
    FROM public.student s WHERE s.student_id = NEW.student_id;
    SELECT r.referral_status::text, r.company_response::text
      INTO ref_status, ref_company_response
    FROM public.referral r WHERE r.application_id = NEW.application_id;

    IF TG_OP = 'INSERT' THEN
      old_display := NULL;
    ELSE
      old_display := public.fn_application_referral_audit_status(
        OLD.application_status::text, OLD.student_response::text,
        ref_status, ref_company_response
      );
    END IF;
    new_display := public.fn_application_referral_audit_status(
      NEW.application_status::text, NEW.student_response::text,
      ref_status, ref_company_response
    );
  ELSE
    record_id := NEW.referral_id;
    SELECT a.application_status::text, a.student_response::text,
           s.user_account_id
      INTO STRICT app_status, app_student_response, entity_account_id
    FROM public.application a
    JOIN public.student s ON s.student_id = a.student_id
    WHERE a.application_id = NEW.application_id;

    old_display := public.fn_application_referral_audit_status(
      app_status, app_student_response,
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.referral_status::text END,
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.company_response::text END
    );
    new_display := public.fn_application_referral_audit_status(
      app_status, app_student_response,
      NEW.referral_status::text, NEW.company_response::text
    );
  END IF;

  IF new_display IS NOT DISTINCT FROM old_display THEN
    RETURN NULL;
  END IF;
  action_code := CASE new_display
    WHEN 'For Review (QC PESO)' THEN 'application_submitted'
    WHEN 'Under Review (QC PESO)' THEN 'qc_peso_review_started'
    WHEN 'For Review (Employer)' THEN 'application_referred_to_employer'
    WHEN 'Rejected (QC PESO)' THEN 'application_rejected_by_qc_peso'
    WHEN 'Under Review (Employer)' THEN 'employer_review_started'
    WHEN 'For Interview (Employer)' THEN 'interview_scheduled'
    WHEN 'Offer Received (Student)' THEN 'offer_extended_by_employer'
    WHEN 'Rejected (Employer)' THEN 'referral_rejected_by_employer'
    WHEN 'Offer Accepted (Student)' THEN 'offer_accepted_by_student'
    WHEN 'Offer Declined (Student)' THEN 'offer_declined_by_student'
    WHEN 'Withdrawn (Student)' THEN 'application_withdrawn_by_student'
    WHEN 'Expired (Employer)' THEN 'application_or_referral_expired'
  END;
  IF action_code IS NULL THEN RETURN NULL; END IF;

  PERFORM public.fn_append_audit_event(
    'applications_referrals', action_code, entity_account_id, actor_id,
    old_display, new_display, CURRENT_TIMESTAMP, TG_TABLE_NAME, record_id, NULL
  );
  RETURN NULL;
END;
$$;

CREATE FUNCTION public.fn_record_internship_audit_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor_id integer := public.fn_current_status_actor();
  entity_account_id integer;
  previous_label text;
  new_label text;
  action_code text;
BEGIN
  SELECT s.user_account_id INTO STRICT entity_account_id
  FROM public.referral r
  JOIN public.application a ON a.application_id = r.application_id
  JOIN public.student s ON s.student_id = a.student_id
  WHERE r.referral_id = NEW.referral_id;

  previous_label := CASE
    WHEN TG_OP = 'INSERT' THEN NULL
    WHEN OLD.assignment_status::text = 'pending' THEN 'Pending'
    WHEN OLD.assignment_status::text = 'ongoing' THEN 'Ongoing'
    WHEN OLD.assignment_status::text = 'complete_company' THEN 'Complete (Company)'
    WHEN OLD.assignment_status::text = 'complete_student' THEN 'Complete (Student)'
    WHEN OLD.assignment_status::text = 'withdrawn' THEN 'Withdrawn'
    WHEN OLD.assignment_status::text = 'cancelled' THEN 'Cancelled'
    ELSE 'Finalized' END;
  new_label := CASE NEW.assignment_status::text
    WHEN 'pending' THEN 'Pending'
    WHEN 'ongoing' THEN 'Ongoing'
    WHEN 'complete_company' THEN 'Complete (Company)'
    WHEN 'complete_student' THEN 'Complete (Student)'
    WHEN 'withdrawn' THEN 'Withdrawn'
    WHEN 'cancelled' THEN 'Cancelled'
    ELSE 'Finalized' END;

  IF new_label IS NOT DISTINCT FROM previous_label THEN RETURN NULL; END IF;
  action_code := CASE NEW.assignment_status::text
    WHEN 'pending' THEN 'internship_created'
    WHEN 'ongoing' THEN 'internship_started'
    WHEN 'complete_company' THEN 'internship_marked_complete_by_company'
    WHEN 'complete_student' THEN 'internship_completion_confirmed_by_student'
    WHEN 'withdrawn' THEN 'internship_withdrawn_by_student'
    WHEN 'cancelled' THEN 'internship_cancelled_by_company'
    ELSE 'internship_finalized_by_qc_peso' END;
  PERFORM public.fn_append_audit_event(
    'internships', action_code, entity_account_id, actor_id,
    previous_label, new_label, CURRENT_TIMESTAMP,
    'internship_assignment', NEW.internship_assignment_id, NULL
  );
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_account_canonical_audit
AFTER INSERT OR UPDATE OF account_status ON public.user_account
FOR EACH ROW EXECUTE FUNCTION public.fn_record_account_audit_event();
CREATE TRIGGER trg_application_canonical_audit
AFTER INSERT OR UPDATE OF application_status, student_response ON public.application
FOR EACH ROW EXECUTE FUNCTION public.fn_record_application_referral_audit_event();
CREATE TRIGGER trg_referral_canonical_audit
AFTER INSERT OR UPDATE OF referral_status, company_response ON public.referral
FOR EACH ROW EXECUTE FUNCTION public.fn_record_application_referral_audit_event();
CREATE TRIGGER trg_internship_canonical_audit
AFTER INSERT OR UPDATE OF assignment_status ON public.internship_assignment
FOR EACH ROW EXECUTE FUNCTION public.fn_record_internship_audit_event();

COMMIT;
