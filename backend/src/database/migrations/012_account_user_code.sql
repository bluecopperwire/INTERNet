BEGIN;

CREATE TABLE public.account_user_code_counter (
  account_year smallint NOT NULL,
  user_role public.user_role_enum NOT NULL,
  last_value integer NOT NULL,
  CONSTRAINT pk_account_user_code_counter PRIMARY KEY (account_year, user_role),
  CONSTRAINT ck_account_user_code_counter_year CHECK (account_year BETWEEN 2000 AND 9999),
  CONSTRAINT ck_account_user_code_counter_value CHECK (last_value BETWEEN 1 AND 99999)
);

ALTER TABLE public.user_account
  ADD COLUMN account_code text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.user_account
    GROUP BY
      EXTRACT(YEAR FROM created_at AT TIME ZONE 'Asia/Manila'),
      user_role
    HAVING count(*) > 99999
  ) THEN
    RAISE EXCEPTION 'Account code capacity exceeded for an existing year and role';
  END IF;
END;
$$;

WITH ranked_accounts AS (
  SELECT
    user_account_id,
    EXTRACT(YEAR FROM created_at AT TIME ZONE 'Asia/Manila')::integer AS account_year,
    CASE user_role
      WHEN 'student' THEN 'STU'
      WHEN 'company' THEN 'COM'
      WHEN 'peso_personnel' THEN 'PES'
      WHEN 'admin' THEN 'ADM'
    END AS role_code,
    row_number() OVER (
      PARTITION BY EXTRACT(YEAR FROM created_at AT TIME ZONE 'Asia/Manila'), user_role
      ORDER BY created_at, user_account_id
    ) AS role_sequence
  FROM public.user_account
)
UPDATE public.user_account AS account
SET account_code = concat(
  ranked.account_year,
  '-',
  ranked.role_code,
  '-',
  lpad(ranked.role_sequence::text, 5, '0')
)
FROM ranked_accounts AS ranked
WHERE ranked.user_account_id = account.user_account_id;

INSERT INTO public.account_user_code_counter (account_year, user_role, last_value)
SELECT
  EXTRACT(YEAR FROM created_at AT TIME ZONE 'Asia/Manila')::integer,
  user_role,
  count(*)::integer
FROM public.user_account
GROUP BY EXTRACT(YEAR FROM created_at AT TIME ZONE 'Asia/Manila'), user_role;

ALTER TABLE public.user_account
  ALTER COLUMN account_code SET NOT NULL,
  ADD CONSTRAINT uq_user_account_account_code UNIQUE (account_code),
  ADD CONSTRAINT ck_user_account_account_code_format CHECK (
    account_code ~ '^[0-9]{4}-(STU|COM|PES|ADM)-[0-9]{5}$'
  );

CREATE FUNCTION public.fn_assign_account_user_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  code_year integer;
  role_code text;
  next_value integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.account_code IS DISTINCT FROM OLD.account_code
      OR NEW.user_role IS DISTINCT FROM OLD.user_role
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Account code, role, and creation date are immutable';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.account_code IS NOT NULL THEN
    RAISE EXCEPTION 'Account code is assigned automatically';
  END IF;

  code_year := EXTRACT(
    YEAR FROM COALESCE(NEW.created_at, CURRENT_TIMESTAMP) AT TIME ZONE 'Asia/Manila'
  )::integer;
  role_code := CASE NEW.user_role
    WHEN 'student' THEN 'STU'
    WHEN 'company' THEN 'COM'
    WHEN 'peso_personnel' THEN 'PES'
    WHEN 'admin' THEN 'ADM'
  END;

  INSERT INTO public.account_user_code_counter AS counter (
    account_year,
    user_role,
    last_value
  )
  VALUES (code_year, NEW.user_role, 1)
  ON CONFLICT (account_year, user_role)
  DO UPDATE SET last_value = counter.last_value + 1
    WHERE counter.last_value < 99999
  RETURNING last_value INTO next_value;

  IF next_value IS NULL THEN
    RAISE EXCEPTION 'Account code capacity exceeded for year % and role %',
      code_year,
      NEW.user_role;
  END IF;

  NEW.account_code := concat(
    code_year,
    '-',
    role_code,
    '-',
    lpad(next_value::text, 5, '0')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_account_user_code
BEFORE INSERT OR UPDATE OF account_code, user_role, created_at
ON public.user_account
FOR EACH ROW
EXECUTE FUNCTION public.fn_assign_account_user_code();

COMMIT;
