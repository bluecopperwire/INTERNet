BEGIN;

-- Historical migration fixture. This is intentionally committed so migration tests
-- reproduce the deployed AuthAlignmentV3 schema without consulting Git at runtime.
DO $$
DECLARE
  legacy_schema_detected boolean;
  legacy_row_count bigint;
BEGIN
  legacy_schema_detected :=
    to_regclass('public.local_authentication_credential') IS NOT NULL
    OR to_regclass('public.external_authentication_identity') IS NOT NULL
    OR to_regclass('public.authentication_session') IS NOT NULL
    OR to_regclass('public.registration_onboarding') IS NOT NULL
    OR to_regclass('public.peso_personnel_verification_history') IS NOT NULL;

  IF legacy_schema_detected THEN
    IF to_regclass('public.local_authentication_credential') IS NULL
       OR to_regclass('public.external_authentication_identity') IS NULL
       OR to_regclass('public.authentication_session') IS NULL
       OR to_regclass('public.registration_onboarding') IS NULL
       OR to_regclass('public.peso_personnel_verification_history') IS NULL THEN
      RAISE EXCEPTION 'Unsupported mixed pre-V3 authentication schema; manual migration review is required';
    END IF;

    EXECUTE $count$
      SELECT
        (SELECT count(*) FROM public.user_account)
        + (SELECT count(*) FROM public.local_authentication_credential)
        + (SELECT count(*) FROM public.external_authentication_identity)
        + (SELECT count(*) FROM public.authentication_session)
        + (SELECT count(*) FROM public.registration_onboarding)
        + (SELECT count(*) FROM public.peso_personnel_verification_history)
    $count$ INTO legacy_row_count;

    IF legacy_row_count <> 0 THEN
      RAISE EXCEPTION 'Legacy authentication tables contain data; refusing destructive automatic realignment';
    END IF;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_account'
      AND column_name='password_hash'
  ) THEN
    RAISE EXCEPTION 'Unsupported pre-V3 authentication schema; manual migration review is required';
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_account_auth_method_integrity ON public.user_account;
DROP TRIGGER IF EXISTS trg_user_account_session_revocation ON public.user_account;
DROP TRIGGER IF EXISTS trg_peso_personnel_verification ON public.peso_personnel;
DROP TRIGGER IF EXISTS trg_peso_verification_history ON public.peso_personnel;

DROP TABLE IF EXISTS public.registration_onboarding CASCADE;
DROP TABLE IF EXISTS public.authentication_session CASCADE;
DROP TABLE IF EXISTS public.external_authentication_identity CASCADE;
DROP TABLE IF EXISTS public.local_authentication_credential CASCADE;
DROP TABLE IF EXISTS public.peso_personnel_verification_history CASCADE;

DROP FUNCTION IF EXISTS public.fn_check_authentication_method_integrity();
DROP FUNCTION IF EXISTS public.fn_revoke_account_sessions();
DROP FUNCTION IF EXISTS public.fn_validate_peso_verification();

ALTER TABLE public.peso_personnel
  DROP COLUMN IF EXISTS verification_status,
  DROP COLUMN IF EXISTS reviewed_at,
  DROP COLUMN IF EXISTS reviewed_by_user_account_id,
  DROP COLUMN IF EXISTS verification_remark;
DROP TYPE IF EXISTS public.personnel_verification_status_enum;

ALTER TABLE public.user_account ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE public.user_account
  DROP CONSTRAINT IF EXISTS ck_user_account_password_hash_not_blank,
  ALTER COLUMN password_hash DROP NOT NULL,
  ADD CONSTRAINT ck_user_account_password_hash_not_blank
    CHECK (password_hash IS NULL OR btrim(password_hash) <> '');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='authentication_provider_enum'
  ) THEN
    CREATE TYPE public.authentication_provider_enum AS ENUM ('google');
  END IF;
END;
$$;

CREATE TABLE public.oauth_identity (
  oauth_identity_id integer GENERATED ALWAYS AS IDENTITY,
  user_account_id integer NOT NULL,
  authentication_provider public.authentication_provider_enum NOT NULL,
  provider_subject text NOT NULL,
  provider_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_oauth_identity PRIMARY KEY (oauth_identity_id),
  CONSTRAINT ck_oauth_identity_provider_subject_not_blank CHECK (btrim(provider_subject) <> ''),
  CONSTRAINT ck_oauth_identity_provider_email_not_blank CHECK (btrim(provider_email) <> '')
);

CREATE TABLE public.auth_session (
  auth_session_id integer GENERATED ALWAYS AS IDENTITY,
  user_account_id integer NOT NULL,
  refresh_token_hash text NOT NULL,
  token_family_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_auth_session PRIMARY KEY (auth_session_id),
  CONSTRAINT uq_auth_session_token_family_id UNIQUE (token_family_id),
  CONSTRAINT ck_auth_session_refresh_token_hash_not_blank CHECK (btrim(refresh_token_hash) <> ''),
  CONSTRAINT ck_auth_session_expires_after_creation CHECK (expires_at > created_at),
  CONSTRAINT ck_auth_session_revoked_after_creation CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

ALTER TABLE public.oauth_identity ADD CONSTRAINT fk_oauth_identity_user_account FOREIGN KEY (user_account_id) REFERENCES public.user_account(user_account_id) ON DELETE CASCADE;
ALTER TABLE public.auth_session ADD CONSTRAINT fk_auth_session_user_account FOREIGN KEY (user_account_id) REFERENCES public.user_account(user_account_id) ON DELETE CASCADE;
CREATE UNIQUE INDEX uq_oauth_identity_provider_subject ON public.oauth_identity (authentication_provider, provider_subject);
CREATE UNIQUE INDEX uq_oauth_identity_account_provider ON public.oauth_identity (user_account_id, authentication_provider);
CREATE INDEX ix_auth_session_user_account ON public.auth_session (user_account_id);
CREATE INDEX ix_auth_session_expires_at ON public.auth_session (expires_at);
CREATE UNIQUE INDEX uq_auth_session_one_active_per_account ON public.auth_session (user_account_id) WHERE revoked_at IS NULL;

CREATE FUNCTION public.fn_validate_oauth_identity_account() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE account_role public.user_role_enum;
BEGIN
  SELECT user_role INTO account_role FROM public.user_account WHERE user_account_id = NEW.user_account_id FOR KEY SHARE;
  IF account_role IS DISTINCT FROM 'student'::public.user_role_enum THEN RAISE EXCEPTION 'OAuth identities are permitted only for student accounts'; END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.fn_validate_auth_session_account() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE status public.account_status_enum;
BEGIN
  SELECT account_status INTO status FROM public.user_account WHERE user_account_id = NEW.user_account_id FOR KEY SHARE;
  IF NEW.revoked_at IS NULL AND status IS DISTINCT FROM 'active'::public.account_status_enum THEN RAISE EXCEPTION 'Active authentication sessions require an active account'; END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.fn_check_account_auth_method_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE account_id integer; account_role public.user_role_enum; stored_password_hash text;
BEGIN
  account_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.user_account_id ELSE NEW.user_account_id END;
  SELECT user_role, password_hash INTO account_role, stored_password_hash FROM public.user_account WHERE user_account_id = account_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF account_role IN ('company', 'peso_personnel', 'admin') AND stored_password_hash IS NULL THEN RAISE EXCEPTION 'Account role % requires a password hash', account_role; END IF;
  IF account_role = 'student' AND stored_password_hash IS NULL AND NOT EXISTS (SELECT 1 FROM public.oauth_identity WHERE user_account_id = account_id) THEN RAISE EXCEPTION 'Student account % requires a password hash or OAuth identity', account_id; END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_oauth_identity_updated_at BEFORE UPDATE ON public.oauth_identity FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_auth_session_updated_at BEFORE UPDATE ON public.auth_session FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_oauth_identity_student_only BEFORE INSERT OR UPDATE OF user_account_id ON public.oauth_identity FOR EACH ROW EXECUTE FUNCTION public.fn_validate_oauth_identity_account();
CREATE TRIGGER trg_auth_session_active_account BEFORE INSERT OR UPDATE OF user_account_id, revoked_at ON public.auth_session FOR EACH ROW EXECUTE FUNCTION public.fn_validate_auth_session_account();
CREATE CONSTRAINT TRIGGER trg_user_account_auth_method_integrity AFTER INSERT OR UPDATE OF password_hash, user_role ON public.user_account DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_check_account_auth_method_integrity();
CREATE CONSTRAINT TRIGGER trg_oauth_identity_auth_method_integrity AFTER INSERT OR UPDATE OF user_account_id OR DELETE ON public.oauth_identity DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_check_account_auth_method_integrity();

COMMIT;
