BEGIN;

DROP INDEX IF EXISTS public.ix_assignment_visibility_qc_hidden;
ALTER TABLE public.internship_assignment_visibility
  DROP CONSTRAINT IF EXISTS ck_assignment_visibility_qc_pair,
  DROP CONSTRAINT IF EXISTS fk_assignment_visibility_qc_actor,
  DROP COLUMN IF EXISTS qc_peso_hidden_by_user_account_id,
  DROP COLUMN IF EXISTS qc_peso_hidden_at;

COMMIT;
