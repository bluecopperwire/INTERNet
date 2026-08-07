BEGIN;

DROP TRIGGER trg_oauth_identity_auth_method_integrity ON public.oauth_identity;
DROP TRIGGER trg_user_account_auth_method_integrity ON public.user_account;
DROP TRIGGER trg_auth_session_active_account ON public.auth_session;
DROP TRIGGER trg_oauth_identity_student_only ON public.oauth_identity;
DROP TRIGGER trg_auth_session_updated_at ON public.auth_session;
DROP TRIGGER trg_oauth_identity_updated_at ON public.oauth_identity;

DROP FUNCTION public.fn_check_account_auth_method_integrity();
DROP FUNCTION public.fn_validate_auth_session_account();
DROP FUNCTION public.fn_validate_oauth_identity_account();

DROP TABLE public.auth_session;
DROP TABLE public.oauth_identity;
DROP TYPE public.authentication_provider_enum;

ALTER TABLE public.user_account
  DROP CONSTRAINT ck_user_account_password_hash_not_blank,
  ALTER COLUMN password_hash SET NOT NULL,
  ADD CONSTRAINT ck_user_account_password_hash_not_blank
    CHECK (btrim(password_hash) <> '');

COMMIT;
