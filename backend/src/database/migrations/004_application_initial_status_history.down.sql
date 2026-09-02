BEGIN;

DROP TRIGGER IF EXISTS trg_application_initial_status_history
  ON public.application;
DROP FUNCTION IF EXISTS public.fn_record_application_initial_status_history();

DROP TRIGGER IF EXISTS trg_application_history_append_only
  ON public.application_status_history;

DELETE FROM public.application_status_history
WHERE previous_application_status IS NULL;

ALTER TABLE public.application_status_history
  DROP CONSTRAINT ck_application_status_history_status_changed;

ALTER TABLE public.application_status_history
  ALTER COLUMN previous_application_status SET NOT NULL;

ALTER TABLE public.application_status_history
  ADD CONSTRAINT ck_application_status_history_status_changed
  CHECK (previous_application_status <> new_application_status);

CREATE TRIGGER trg_application_history_append_only
BEFORE UPDATE OR DELETE ON public.application_status_history
FOR EACH ROW
EXECUTE FUNCTION public.fn_block_status_history_mutation();

COMMIT;
