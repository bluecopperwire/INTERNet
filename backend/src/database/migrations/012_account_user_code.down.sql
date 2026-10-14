BEGIN;

DROP TRIGGER IF EXISTS trg_assign_account_user_code ON public.user_account;
DROP FUNCTION IF EXISTS public.fn_assign_account_user_code();
ALTER TABLE public.user_account DROP COLUMN IF EXISTS account_code;
DROP TABLE IF EXISTS public.account_user_code_counter;

COMMIT;
