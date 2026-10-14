BEGIN;

UPDATE public.application
SET remark = NULL
WHERE application_status <> 'rejected_for_referral'
  AND remark IS NOT NULL;

ALTER TABLE public.application
  ADD CONSTRAINT ck_application_remark_rejection_only
  CHECK (
    application_status = 'rejected_for_referral'
    OR remark IS NULL
  );

COMMIT;
