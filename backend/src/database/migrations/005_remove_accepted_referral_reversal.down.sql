BEGIN;

CREATE OR REPLACE FUNCTION public.fn_validate_referral()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.referral_status <> 'sent' OR NEW.company_response <> 'pending' THEN
      RAISE EXCEPTION 'A new referral must begin as sent with a pending company response';
    END IF;
    IF NOT (EXISTS (
      SELECT 1 FROM public.application
      WHERE application_id = NEW.application_id
        AND application_status = 'approved_for_referral'
    )) THEN
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

COMMIT;
