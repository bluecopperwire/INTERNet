BEGIN;

ALTER TABLE public.application_status_history
  DROP CONSTRAINT ck_application_status_history_status_changed;

ALTER TABLE public.application_status_history
  ALTER COLUMN previous_application_status DROP NOT NULL;

ALTER TABLE public.application_status_history
  ADD CONSTRAINT ck_application_status_history_status_changed
  CHECK (
    previous_application_status IS NULL
    OR previous_application_status <> new_application_status
  );

CREATE FUNCTION public.fn_record_application_initial_status_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor_id integer := public.fn_current_status_actor();
BEGIN
  INSERT INTO public.application_status_history (
    application_id,
    previous_application_status,
    new_application_status,
    changed_by_user_account_id
  ) VALUES (
    NEW.application_id,
    NULL,
    NEW.application_status,
    actor_id
  );
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_application_initial_status_history
AFTER INSERT ON public.application
FOR EACH ROW
EXECUTE FUNCTION public.fn_record_application_initial_status_history();

COMMIT;
