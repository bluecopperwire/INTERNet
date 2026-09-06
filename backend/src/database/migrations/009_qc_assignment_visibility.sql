BEGIN;

ALTER TABLE public.internship_assignment_visibility
  ADD COLUMN qc_peso_hidden_at timestamptz,
  ADD COLUMN qc_peso_hidden_by_user_account_id integer,
  ADD CONSTRAINT fk_assignment_visibility_qc_actor
    FOREIGN KEY (qc_peso_hidden_by_user_account_id)
    REFERENCES public.user_account(user_account_id) ON DELETE RESTRICT,
  ADD CONSTRAINT ck_assignment_visibility_qc_pair CHECK (
    (qc_peso_hidden_at IS NULL) = (qc_peso_hidden_by_user_account_id IS NULL)
  );

CREATE INDEX ix_assignment_visibility_qc_hidden
  ON public.internship_assignment_visibility (internship_assignment_id)
  WHERE qc_peso_hidden_at IS NOT NULL;

COMMIT;
