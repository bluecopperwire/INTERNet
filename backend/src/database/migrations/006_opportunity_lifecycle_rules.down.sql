BEGIN;

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

COMMIT;
