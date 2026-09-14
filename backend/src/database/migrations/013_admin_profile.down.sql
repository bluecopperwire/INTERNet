BEGIN;

DROP TRIGGER IF EXISTS trg_create_admin_profile ON public.user_account;
DROP FUNCTION IF EXISTS public.fn_create_admin_profile();
DROP TABLE IF EXISTS public.admin_profile;

COMMIT;
