BEGIN;

DROP TRIGGER IF EXISTS trg_internship_canonical_audit ON public.internship_assignment;
DROP TRIGGER IF EXISTS trg_referral_canonical_audit ON public.referral;
DROP TRIGGER IF EXISTS trg_application_canonical_audit ON public.application;
DROP TRIGGER IF EXISTS trg_account_canonical_audit ON public.user_account;
DROP FUNCTION IF EXISTS public.fn_record_internship_audit_event();
DROP FUNCTION IF EXISTS public.fn_record_application_referral_audit_event();
DROP FUNCTION IF EXISTS public.fn_record_account_audit_event();
DROP TRIGGER IF EXISTS trg_audit_event_append_only ON public.audit_event;
DROP FUNCTION IF EXISTS public.fn_block_audit_event_mutation();
DROP FUNCTION IF EXISTS public.fn_append_audit_event(text, text, integer, integer, text, text, timestamptz, text, integer, text);
DROP FUNCTION IF EXISTS public.fn_application_referral_audit_status(text, text, text, text);
DROP TABLE IF EXISTS public.audit_event;

COMMIT;
