BEGIN;

CREATE TABLE public.admin_profile (
  admin_profile_id integer GENERATED ALWAYS AS IDENTITY,
  user_account_id integer NOT NULL,
  first_name text,
  middle_name text,
  last_name text,
  extension_name text,
  sex text,
  birth_date date,
  address_line text,
  address_barangay text,
  address_district text,
  address_city text,
  contact_email text NOT NULL,
  contact_number text,
  photo_file_path text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_admin_profile PRIMARY KEY (admin_profile_id),
  CONSTRAINT uq_admin_profile_user_account UNIQUE (user_account_id),
  CONSTRAINT fk_admin_profile_user_account FOREIGN KEY (user_account_id)
    REFERENCES public.user_account(user_account_id) ON DELETE CASCADE,
  CONSTRAINT ck_admin_profile_first_name_not_blank CHECK (first_name IS NULL OR btrim(first_name) <> ''),
  CONSTRAINT ck_admin_profile_middle_name_not_blank CHECK (middle_name IS NULL OR btrim(middle_name) <> ''),
  CONSTRAINT ck_admin_profile_last_name_not_blank CHECK (last_name IS NULL OR btrim(last_name) <> ''),
  CONSTRAINT ck_admin_profile_extension_name_not_blank CHECK (extension_name IS NULL OR btrim(extension_name) <> ''),
  CONSTRAINT ck_admin_profile_sex CHECK (sex IS NULL OR sex IN ('male', 'female')),
  CONSTRAINT ck_admin_profile_address_line_not_blank CHECK (address_line IS NULL OR btrim(address_line) <> ''),
  CONSTRAINT ck_admin_profile_address_barangay_not_blank CHECK (address_barangay IS NULL OR btrim(address_barangay) <> ''),
  CONSTRAINT ck_admin_profile_address_district CHECK (
    address_district IS NULL OR address_district IN (
      'District 1', 'District 2', 'District 3',
      'District 4', 'District 5', 'District 6', 'N/A'
    )
  ),
  CONSTRAINT ck_admin_profile_address_city_not_blank CHECK (address_city IS NULL OR btrim(address_city) <> ''),
  CONSTRAINT ck_admin_profile_contact_email_not_blank CHECK (btrim(contact_email) <> ''),
  CONSTRAINT ck_admin_profile_contact_number_not_blank CHECK (contact_number IS NULL OR btrim(contact_number) <> '')
);

INSERT INTO public.admin_profile (user_account_id, first_name, contact_email)
SELECT
  user_account_id,
  COALESCE(
    NULLIF(
      initcap(regexp_replace(split_part(email, '@', 1), '[._-]+', ' ', 'g')),
      ''
    ),
    'Administrator'
  ),
  email
FROM public.user_account
WHERE user_role = 'admin';

CREATE FUNCTION public.fn_create_admin_profile()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_role = 'admin' THEN
    INSERT INTO public.admin_profile (user_account_id, first_name, contact_email)
    VALUES (
      NEW.user_account_id,
      COALESCE(
        NULLIF(
          initcap(regexp_replace(split_part(NEW.email, '@', 1), '[._-]+', ' ', 'g')),
          ''
        ),
        'Administrator'
      ),
      NEW.email
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_admin_profile
AFTER INSERT ON public.user_account
FOR EACH ROW
EXECUTE FUNCTION public.fn_create_admin_profile();

COMMIT;
