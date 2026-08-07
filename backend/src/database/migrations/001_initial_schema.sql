BEGIN;

CREATE TYPE public.account_status_enum AS ENUM ('active', 'suspended', 'archived');
CREATE TYPE public.user_role_enum AS ENUM ('student', 'company', 'peso_personnel', 'admin');
CREATE TYPE public.inquiry_method_enum AS ENUM ('walk_in', 'online', 'phone_call', 'school');
CREATE TYPE public.year_level_enum AS ENUM ('grade_11', 'grade_12', 'first_year_college', 'second_year_college', 'third_year_college', 'fourth_year_college', 'fifth_year_college');
CREATE TYPE public.company_type_enum AS ENUM ('government', 'private');
CREATE TYPE public.opportunity_status_enum AS ENUM ('open', 'closed', 'archived');
CREATE TYPE public.work_schedule_enum AS ENUM ('weekdays', 'weekends', 'flexible');
CREATE TYPE public.application_status_enum AS ENUM ('submitted', 'under_review', 'approved_for_referral', 'rejected_for_referral', 'closed', 'withdrawn', 'expired');
CREATE TYPE public.referral_status_enum AS ENUM ('sent', 'under_review', 'closed', 'withdrawn', 'expired');
CREATE TYPE public.company_response_enum AS ENUM ('pending', 'for_interview', 'accepted', 'rejected');
CREATE TYPE public.student_response_enum AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE public.assignment_status_enum AS ENUM ('pending', 'ongoing', 'completed', 'withdrawn', 'cancelled');
CREATE TYPE public.time_in_status_enum AS ENUM ('on_time', 'late');
CREATE TYPE public.rendered_hours_status_enum AS ENUM ('complete', 'undertime', 'overtime', 'incomplete');
CREATE TYPE public.work_arrangement_enum AS ENUM ('onsite', 'remote', 'hybrid');
CREATE TYPE public.interview_mode_enum AS ENUM ('physical', 'online');

CREATE TABLE public.user_account (
  user_account_id integer GENERATED ALWAYS AS IDENTITY,
  email text NOT NULL,
  password_hash text NOT NULL,
  user_role public.user_role_enum NOT NULL,
  account_status public.account_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamptz,
  CONSTRAINT pk_user_account PRIMARY KEY (user_account_id),
  CONSTRAINT ck_user_account_email_not_blank CHECK (btrim(email) <> ''),
  CONSTRAINT ck_user_account_password_hash_not_blank CHECK (btrim(password_hash) <> ''),
  CONSTRAINT ck_user_account_archived_deleted_at CHECK (
    (account_status = 'archived' AND deleted_at IS NOT NULL)
    OR (account_status IN ('active', 'suspended') AND deleted_at IS NULL)
  )
);

CREATE TABLE public.student (
  student_id integer GENERATED ALWAYS AS IDENTITY,
  user_account_id integer NOT NULL,
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  extension_name text,
  sex text NOT NULL,
  birth_date date NOT NULL,
  contact_number text NOT NULL,
  contact_email text NOT NULL,
  linkedin_url text,
  address_line text NOT NULL,
  address_barangay text NOT NULL,
  address_district text NOT NULL,
  address_city text NOT NULL,
  inquiry_method public.inquiry_method_enum NOT NULL,
  photo_file_path text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_student PRIMARY KEY (student_id),
  CONSTRAINT uq_student_user_account UNIQUE (user_account_id),
  CONSTRAINT ck_student_required_personal_text CHECK (btrim(first_name) <> '' AND btrim(last_name) <> '' AND btrim(sex) <> ''),
  CONSTRAINT ck_student_middle_name_not_blank CHECK (middle_name IS NULL OR btrim(middle_name) <> ''),
  CONSTRAINT ck_student_extension_name_not_blank CHECK (extension_name IS NULL OR btrim(extension_name) <> ''),
  CONSTRAINT ck_student_birth_date_past CHECK (birth_date < CURRENT_DATE),
  CONSTRAINT ck_student_required_contact_text CHECK (btrim(contact_number) <> '' AND btrim(contact_email) <> ''),
  CONSTRAINT ck_student_linkedin_url_not_blank CHECK (linkedin_url IS NULL OR btrim(linkedin_url) <> ''),
  CONSTRAINT ck_student_required_address_text CHECK (btrim(address_line) <> '' AND btrim(address_barangay) <> '' AND btrim(address_district) <> '' AND btrim(address_city) <> ''),
  CONSTRAINT ck_student_photo_file_path_not_blank CHECK (photo_file_path IS NULL OR btrim(photo_file_path) <> '')
);

CREATE TABLE public.student_academic_information (
  student_academic_information_id integer GENERATED ALWAYS AS IDENTITY,
  student_id integer NOT NULL,
  school_name text NOT NULL,
  year_level public.year_level_enum NOT NULL,
  strand_program text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_student_academic_information PRIMARY KEY (student_academic_information_id),
  CONSTRAINT uq_student_academic_information_student UNIQUE (student_id),
  CONSTRAINT ck_student_academic_school_name_not_blank CHECK (btrim(school_name) <> ''),
  CONSTRAINT ck_student_academic_strand_program_not_blank CHECK (btrim(strand_program) <> '')
);

CREATE TABLE public.internship_preference (
  internship_preference_id integer GENERATED ALWAYS AS IDENTITY,
  student_id integer NOT NULL,
  required_hours integer NOT NULL,
  available_days public.work_schedule_enum NOT NULL,
  allows_outside_preferred_field boolean NOT NULL,
  start_date date NOT NULL,
  preferred_company_type public.company_type_enum NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_internship_preference PRIMARY KEY (internship_preference_id),
  CONSTRAINT uq_internship_preference_student UNIQUE (student_id),
  CONSTRAINT ck_internship_preference_required_hours_positive CHECK (required_hours > 0),
  CONSTRAINT ck_internship_preference_start_date_valid CHECK (start_date >= created_at::date)
);

CREATE TABLE public.industry (
  industry_id integer GENERATED ALWAYS AS IDENTITY,
  industry_name text NOT NULL,
  is_custom_text boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_industry PRIMARY KEY (industry_id),
  CONSTRAINT ck_industry_name_not_blank CHECK (btrim(industry_name) <> '')
);

CREATE TABLE public.student_preferred_industry (
  student_id integer NOT NULL,
  industry_id integer NOT NULL,
  custom_industry_name text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_student_preferred_industry PRIMARY KEY (student_id, industry_id),
  CONSTRAINT ck_student_preferred_custom_name_not_blank CHECK (custom_industry_name IS NULL OR btrim(custom_industry_name) <> '')
);

CREATE TABLE public.requirement_type (
  requirement_type_id integer GENERATED ALWAYS AS IDENTITY,
  requirement_type_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_requirement_type PRIMARY KEY (requirement_type_id),
  CONSTRAINT ck_requirement_type_name_not_blank CHECK (btrim(requirement_type_name) <> '')
);

CREATE TABLE public.student_requirement_submission (
  student_requirement_submission_id integer GENERATED ALWAYS AS IDENTITY,
  requirement_type_id integer NOT NULL,
  student_id integer NOT NULL,
  requirement_name text NOT NULL,
  requirement_file_path text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_student_requirement_submission PRIMARY KEY (student_requirement_submission_id),
  CONSTRAINT uq_student_requirement_student_type UNIQUE (student_id, requirement_type_id),
  CONSTRAINT ck_student_requirement_name_not_blank CHECK (btrim(requirement_name) <> ''),
  CONSTRAINT ck_student_requirement_file_path_not_blank CHECK (btrim(requirement_file_path) <> '')
);

CREATE TABLE public.company (
  company_id integer GENERATED ALWAYS AS IDENTITY,
  user_account_id integer NOT NULL,
  industry_id integer NOT NULL,
  company_name text NOT NULL,
  company_type public.company_type_enum NOT NULL,
  description text NOT NULL,
  website_url text,
  year_established smallint,
  company_size integer,
  contact_email text NOT NULL,
  contact_number text NOT NULL,
  contact_person_first_name text NOT NULL,
  contact_person_middle_name text,
  contact_person_last_name text NOT NULL,
  contact_person_extension_name text,
  address_line text NOT NULL,
  address_barangay text NOT NULL,
  address_district text,
  address_city text NOT NULL,
  logo_file_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_company PRIMARY KEY (company_id),
  CONSTRAINT uq_company_user_account UNIQUE (user_account_id),
  CONSTRAINT ck_company_required_company_text CHECK (btrim(company_name) <> '' AND btrim(description) <> ''),
  CONSTRAINT ck_company_website_url_not_blank CHECK (website_url IS NULL OR btrim(website_url) <> ''),
  CONSTRAINT ck_company_year_established_not_future CHECK (year_established IS NULL OR year_established <= extract(year FROM CURRENT_DATE)),
  CONSTRAINT ck_company_size_positive CHECK (company_size IS NULL OR company_size > 0),
  CONSTRAINT ck_company_required_contact_text CHECK (btrim(contact_email) <> '' AND btrim(contact_number) <> ''),
  CONSTRAINT ck_company_contact_person_required_text CHECK (btrim(contact_person_first_name) <> '' AND btrim(contact_person_last_name) <> ''),
  CONSTRAINT ck_company_contact_middle_name_not_blank CHECK (contact_person_middle_name IS NULL OR btrim(contact_person_middle_name) <> ''),
  CONSTRAINT ck_company_contact_extension_not_blank CHECK (contact_person_extension_name IS NULL OR btrim(contact_person_extension_name) <> ''),
  CONSTRAINT ck_company_required_address_text CHECK (btrim(address_line) <> '' AND btrim(address_barangay) <> '' AND btrim(address_city) <> ''),
  CONSTRAINT ck_company_address_district_not_blank CHECK (address_district IS NULL OR btrim(address_district) <> ''),
  CONSTRAINT ck_company_logo_file_path_not_blank CHECK (btrim(logo_file_path) <> '')
);

CREATE TABLE public.opportunity (
  opportunity_id integer GENERATED ALWAYS AS IDENTITY,
  company_id integer NOT NULL,
  title text NOT NULL,
  department text NOT NULL,
  description text NOT NULL,
  qualification text,
  has_allowance boolean NOT NULL,
  allowance numeric(12,2),
  minimum_required_hours integer NOT NULL,
  work_arrangement public.work_arrangement_enum NOT NULL,
  offered_slots integer NOT NULL,
  application_deadline timestamptz NOT NULL,
  opportunity_status public.opportunity_status_enum NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_opportunity PRIMARY KEY (opportunity_id),
  CONSTRAINT ck_opportunity_required_text CHECK (btrim(title) <> '' AND btrim(department) <> '' AND btrim(description) <> ''),
  CONSTRAINT ck_opportunity_qualification_not_blank CHECK (qualification IS NULL OR btrim(qualification) <> ''),
  CONSTRAINT ck_opportunity_minimum_hours_positive CHECK (minimum_required_hours > 0),
  CONSTRAINT ck_opportunity_offered_slots_positive CHECK (offered_slots > 0),
  CONSTRAINT ck_opportunity_allowance_consistency CHECK ((has_allowance AND allowance IS NOT NULL AND allowance >= 0) OR (NOT has_allowance AND allowance IS NULL)),
  CONSTRAINT ck_opportunity_deadline_after_creation CHECK (application_deadline > created_at)
);

CREATE TABLE public.application (
  application_id integer GENERATED ALWAYS AS IDENTITY,
  student_id integer NOT NULL,
  opportunity_id integer NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  application_status public.application_status_enum NOT NULL DEFAULT 'submitted',
  remark text,
  student_response public.student_response_enum NOT NULL DEFAULT 'pending',
  student_responded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_application PRIMARY KEY (application_id),
  CONSTRAINT ck_application_remark_not_blank CHECK (remark IS NULL OR btrim(remark) <> ''),
  CONSTRAINT ck_application_student_response_timestamp CHECK ((student_response = 'pending' AND student_responded_at IS NULL) OR (student_response IN ('accepted', 'declined') AND student_responded_at IS NOT NULL))
);

CREATE TABLE public.peso_personnel (
  peso_personnel_id integer GENERATED ALWAYS AS IDENTITY,
  user_account_id integer NOT NULL,
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  extension_name text,
  sex text NOT NULL,
  birth_date date NOT NULL,
  address_line text NOT NULL,
  address_barangay text NOT NULL,
  address_district text NOT NULL,
  address_city text NOT NULL,
  contact_number text NOT NULL,
  contact_email text NOT NULL,
  employee_id text NOT NULL,
  position text NOT NULL,
  department text NOT NULL,
  employee_id_file_path text NOT NULL,
  photo_file_path text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_peso_personnel PRIMARY KEY (peso_personnel_id),
  CONSTRAINT uq_peso_personnel_user_account UNIQUE (user_account_id),
  CONSTRAINT ck_peso_personnel_required_personal_text CHECK (btrim(first_name) <> '' AND btrim(last_name) <> '' AND btrim(sex) <> ''),
  CONSTRAINT ck_peso_personnel_middle_name_not_blank CHECK (middle_name IS NULL OR btrim(middle_name) <> ''),
  CONSTRAINT ck_peso_personnel_extension_name_not_blank CHECK (extension_name IS NULL OR btrim(extension_name) <> ''),
  CONSTRAINT ck_peso_personnel_birth_date_past CHECK (birth_date < CURRENT_DATE),
  CONSTRAINT ck_peso_personnel_required_address_text CHECK (btrim(address_line) <> '' AND btrim(address_barangay) <> '' AND btrim(address_district) <> '' AND btrim(address_city) <> ''),
  CONSTRAINT ck_peso_personnel_required_contact_text CHECK (btrim(contact_number) <> '' AND btrim(contact_email) <> ''),
  CONSTRAINT ck_peso_personnel_required_work_text CHECK (btrim(employee_id) <> '' AND btrim(position) <> '' AND btrim(department) <> ''),
  CONSTRAINT ck_peso_personnel_id_file_path_not_blank CHECK (btrim(employee_id_file_path) <> ''),
  CONSTRAINT ck_peso_personnel_photo_file_path_not_blank CHECK (photo_file_path IS NULL OR btrim(photo_file_path) <> '')
);

CREATE TABLE public.referral (
  referral_id integer GENERATED ALWAYS AS IDENTITY,
  application_id integer NOT NULL,
  peso_personnel_id integer NOT NULL,
  referred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  referral_document_file_path text NOT NULL,
  referral_status public.referral_status_enum NOT NULL DEFAULT 'sent',
  company_response public.company_response_enum NOT NULL DEFAULT 'pending',
  company_responded_at timestamptz,
  remark text,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_referral PRIMARY KEY (referral_id),
  CONSTRAINT uq_referral_application UNIQUE (application_id),
  CONSTRAINT ck_referral_document_path_not_blank CHECK (btrim(referral_document_file_path) <> ''),
  CONSTRAINT ck_referral_company_response_timestamp CHECK ((company_response = 'pending' AND company_responded_at IS NULL) OR (company_response IN ('for_interview', 'accepted', 'rejected') AND company_responded_at IS NOT NULL)),
  CONSTRAINT ck_referral_remark_not_blank CHECK (remark IS NULL OR btrim(remark) <> '')
);

CREATE TABLE public.interview (
  interview_id integer GENERATED ALWAYS AS IDENTITY,
  referral_id integer NOT NULL,
  scheduled_at timestamptz NOT NULL,
  interview_mode public.interview_mode_enum NOT NULL,
  physical_location text,
  online_meeting_url text,
  remark text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_interview PRIMARY KEY (interview_id),
  CONSTRAINT uq_interview_referral UNIQUE (referral_id),
  CONSTRAINT ck_interview_scheduled_after_creation CHECK (scheduled_at > created_at),
  CONSTRAINT ck_interview_mode_location_consistency CHECK ((interview_mode = 'physical' AND physical_location IS NOT NULL AND btrim(physical_location) <> '' AND online_meeting_url IS NULL) OR (interview_mode = 'online' AND online_meeting_url IS NOT NULL AND btrim(online_meeting_url) <> '' AND physical_location IS NULL)),
  CONSTRAINT ck_interview_remark_not_blank CHECK (remark IS NULL OR btrim(remark) <> '')
);

CREATE TABLE public.internship_assignment (
  internship_assignment_id integer GENERATED ALWAYS AS IDENTITY,
  referral_id integer NOT NULL,
  required_hours integer NOT NULL,
  start_date date NOT NULL,
  expected_end_date date,
  end_date date,
  working_days public.work_schedule_enum NOT NULL,
  start_shift time NOT NULL,
  end_shift time NOT NULL,
  assignment_status public.assignment_status_enum NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_internship_assignment PRIMARY KEY (internship_assignment_id),
  CONSTRAINT uq_internship_assignment_referral UNIQUE (referral_id),
  CONSTRAINT ck_internship_assignment_hours_positive CHECK (required_hours > 0),
  CONSTRAINT ck_internship_assignment_expected_end_date CHECK (expected_end_date IS NULL OR expected_end_date >= start_date),
  CONSTRAINT ck_internship_assignment_end_date CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT ck_internship_assignment_shift_order CHECK (end_shift > start_shift),
  CONSTRAINT ck_internship_assignment_status_end_date CHECK ((assignment_status = 'completed' AND end_date IS NOT NULL) OR (assignment_status IN ('pending', 'ongoing') AND end_date IS NULL) OR assignment_status IN ('withdrawn', 'cancelled'))
);

CREATE TABLE public.attendance_record (
  attendance_record_id integer GENERATED ALWAYS AS IDENTITY,
  internship_assignment_id integer NOT NULL,
  attendance_date date NOT NULL,
  time_in time NOT NULL,
  time_in_status public.time_in_status_enum NOT NULL,
  time_out time,
  hours_rendered numeric(6,2),
  rendered_hours_status public.rendered_hours_status_enum NOT NULL DEFAULT 'incomplete',
  photo_file_path text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_attendance_record PRIMARY KEY (attendance_record_id),
  CONSTRAINT uq_attendance_assignment_date UNIQUE (internship_assignment_id, attendance_date),
  CONSTRAINT ck_attendance_record_time_order CHECK (time_out IS NULL OR time_out > time_in),
  CONSTRAINT ck_attendance_record_hours_range CHECK (hours_rendered IS NULL OR (hours_rendered >= 0 AND hours_rendered <= 24)),
  CONSTRAINT ck_attendance_record_rendered_consistency CHECK ((time_out IS NULL AND hours_rendered IS NULL AND rendered_hours_status = 'incomplete') OR (time_out IS NOT NULL AND hours_rendered IS NOT NULL)),
  CONSTRAINT ck_attendance_record_photo_path_not_blank CHECK (photo_file_path IS NULL OR btrim(photo_file_path) <> '')
);

CREATE TABLE public.internship_feedback (
  internship_feedback_id integer GENERATED ALWAYS AS IDENTITY,
  internship_assignment_id integer NOT NULL,
  rating integer NOT NULL,
  feedback_text text,
  submitted_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_internship_feedback PRIMARY KEY (internship_feedback_id),
  CONSTRAINT uq_internship_feedback_assignment UNIQUE (internship_assignment_id),
  CONSTRAINT ck_internship_feedback_rating_range CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT ck_internship_feedback_text_not_blank CHECK (feedback_text IS NULL OR btrim(feedback_text) <> '')
);

CREATE TABLE public.user_account_status_history (
  user_account_status_history_id integer GENERATED ALWAYS AS IDENTITY,
  user_account_id integer NOT NULL,
  previous_account_status public.account_status_enum NOT NULL,
  new_account_status public.account_status_enum NOT NULL,
  changed_by_user_account_id integer,
  changed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_user_account_status_history PRIMARY KEY (user_account_status_history_id),
  CONSTRAINT ck_account_status_history_status_changed CHECK (previous_account_status <> new_account_status)
);

CREATE TABLE public.application_status_history (
  application_status_history_id integer GENERATED ALWAYS AS IDENTITY,
  application_id integer NOT NULL,
  previous_application_status public.application_status_enum NOT NULL,
  new_application_status public.application_status_enum NOT NULL,
  changed_by_user_account_id integer,
  changed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_application_status_history PRIMARY KEY (application_status_history_id),
  CONSTRAINT ck_application_status_history_status_changed CHECK (previous_application_status <> new_application_status)
);

CREATE TABLE public.referral_status_history (
  referral_status_history_id integer GENERATED ALWAYS AS IDENTITY,
  referral_id integer NOT NULL,
  previous_referral_status public.referral_status_enum NOT NULL,
  new_referral_status public.referral_status_enum NOT NULL,
  changed_by_user_account_id integer,
  changed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_referral_status_history PRIMARY KEY (referral_status_history_id),
  CONSTRAINT ck_referral_status_history_status_changed CHECK (previous_referral_status <> new_referral_status)
);

CREATE TABLE public.internship_assignment_status_history (
  internship_assignment_status_history_id integer GENERATED ALWAYS AS IDENTITY,
  internship_assignment_id integer NOT NULL,
  previous_assignment_status public.assignment_status_enum NOT NULL,
  new_assignment_status public.assignment_status_enum NOT NULL,
  changed_by_user_account_id integer,
  changed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_internship_assignment_status_history PRIMARY KEY (internship_assignment_status_history_id),
  CONSTRAINT ck_assignment_status_history_status_changed CHECK (previous_assignment_status <> new_assignment_status)
);

ALTER TABLE public.student ADD CONSTRAINT fk_student_user_account FOREIGN KEY (user_account_id) REFERENCES public.user_account(user_account_id) ON DELETE RESTRICT;
ALTER TABLE public.student_academic_information ADD CONSTRAINT fk_student_academic_student FOREIGN KEY (student_id) REFERENCES public.student(student_id) ON DELETE CASCADE;
ALTER TABLE public.internship_preference ADD CONSTRAINT fk_internship_preference_student FOREIGN KEY (student_id) REFERENCES public.student(student_id) ON DELETE CASCADE;
ALTER TABLE public.student_preferred_industry ADD CONSTRAINT fk_student_preferred_industry_student FOREIGN KEY (student_id) REFERENCES public.student(student_id) ON DELETE CASCADE;
ALTER TABLE public.student_preferred_industry ADD CONSTRAINT fk_student_preferred_industry_industry FOREIGN KEY (industry_id) REFERENCES public.industry(industry_id) ON DELETE RESTRICT;
ALTER TABLE public.student_requirement_submission ADD CONSTRAINT fk_student_requirement_type FOREIGN KEY (requirement_type_id) REFERENCES public.requirement_type(requirement_type_id) ON DELETE RESTRICT;
ALTER TABLE public.student_requirement_submission ADD CONSTRAINT fk_student_requirement_student FOREIGN KEY (student_id) REFERENCES public.student(student_id) ON DELETE CASCADE;
ALTER TABLE public.company ADD CONSTRAINT fk_company_user_account FOREIGN KEY (user_account_id) REFERENCES public.user_account(user_account_id) ON DELETE RESTRICT;
ALTER TABLE public.company ADD CONSTRAINT fk_company_industry FOREIGN KEY (industry_id) REFERENCES public.industry(industry_id) ON DELETE RESTRICT;
ALTER TABLE public.opportunity ADD CONSTRAINT fk_opportunity_company FOREIGN KEY (company_id) REFERENCES public.company(company_id) ON DELETE RESTRICT;
ALTER TABLE public.application ADD CONSTRAINT fk_application_student FOREIGN KEY (student_id) REFERENCES public.student(student_id) ON DELETE RESTRICT;
ALTER TABLE public.application ADD CONSTRAINT fk_application_opportunity FOREIGN KEY (opportunity_id) REFERENCES public.opportunity(opportunity_id) ON DELETE RESTRICT;
ALTER TABLE public.peso_personnel ADD CONSTRAINT fk_peso_personnel_user_account FOREIGN KEY (user_account_id) REFERENCES public.user_account(user_account_id) ON DELETE RESTRICT;
ALTER TABLE public.referral ADD CONSTRAINT fk_referral_application FOREIGN KEY (application_id) REFERENCES public.application(application_id) ON DELETE RESTRICT;
ALTER TABLE public.referral ADD CONSTRAINT fk_referral_peso_personnel FOREIGN KEY (peso_personnel_id) REFERENCES public.peso_personnel(peso_personnel_id) ON DELETE RESTRICT;
ALTER TABLE public.interview ADD CONSTRAINT fk_interview_referral FOREIGN KEY (referral_id) REFERENCES public.referral(referral_id) ON DELETE CASCADE;
ALTER TABLE public.internship_assignment ADD CONSTRAINT fk_internship_assignment_referral FOREIGN KEY (referral_id) REFERENCES public.referral(referral_id) ON DELETE RESTRICT;
ALTER TABLE public.attendance_record ADD CONSTRAINT fk_attendance_assignment FOREIGN KEY (internship_assignment_id) REFERENCES public.internship_assignment(internship_assignment_id) ON DELETE CASCADE;
ALTER TABLE public.internship_feedback ADD CONSTRAINT fk_internship_feedback_assignment FOREIGN KEY (internship_assignment_id) REFERENCES public.internship_assignment(internship_assignment_id) ON DELETE CASCADE;
ALTER TABLE public.user_account_status_history ADD CONSTRAINT fk_account_status_history_account FOREIGN KEY (user_account_id) REFERENCES public.user_account(user_account_id) ON DELETE CASCADE;
ALTER TABLE public.user_account_status_history ADD CONSTRAINT fk_account_status_history_changed_by FOREIGN KEY (changed_by_user_account_id) REFERENCES public.user_account(user_account_id) ON DELETE SET NULL;
ALTER TABLE public.application_status_history ADD CONSTRAINT fk_application_status_history_application FOREIGN KEY (application_id) REFERENCES public.application(application_id) ON DELETE CASCADE;
ALTER TABLE public.application_status_history ADD CONSTRAINT fk_application_status_history_changed_by FOREIGN KEY (changed_by_user_account_id) REFERENCES public.user_account(user_account_id) ON DELETE SET NULL;
ALTER TABLE public.referral_status_history ADD CONSTRAINT fk_referral_status_history_referral FOREIGN KEY (referral_id) REFERENCES public.referral(referral_id) ON DELETE CASCADE;
ALTER TABLE public.referral_status_history ADD CONSTRAINT fk_referral_status_history_changed_by FOREIGN KEY (changed_by_user_account_id) REFERENCES public.user_account(user_account_id) ON DELETE SET NULL;
ALTER TABLE public.internship_assignment_status_history ADD CONSTRAINT fk_assignment_status_history_assignment FOREIGN KEY (internship_assignment_id) REFERENCES public.internship_assignment(internship_assignment_id) ON DELETE CASCADE;
ALTER TABLE public.internship_assignment_status_history ADD CONSTRAINT fk_assignment_status_history_changed_by FOREIGN KEY (changed_by_user_account_id) REFERENCES public.user_account(user_account_id) ON DELETE SET NULL;

CREATE UNIQUE INDEX uq_user_account_email_ci ON public.user_account (lower(email));
CREATE INDEX ix_user_account_user_role ON public.user_account (user_role);
CREATE INDEX ix_user_account_account_status ON public.user_account (account_status);
CREATE UNIQUE INDEX uq_industry_name_ci ON public.industry (lower(industry_name));
CREATE UNIQUE INDEX uq_industry_single_custom_text ON public.industry (is_custom_text) WHERE is_custom_text;
CREATE INDEX ix_student_preferred_industry_industry ON public.student_preferred_industry (industry_id);
CREATE UNIQUE INDEX uq_requirement_type_name_ci ON public.requirement_type (lower(requirement_type_name));
CREATE INDEX ix_student_requirement_requirement_type ON public.student_requirement_submission (requirement_type_id);
CREATE INDEX ix_company_industry ON public.company (industry_id);
CREATE INDEX ix_opportunity_company ON public.opportunity (company_id);
CREATE INDEX ix_opportunity_status_deadline ON public.opportunity (opportunity_status, application_deadline);
CREATE INDEX ix_application_student_opportunity ON public.application (student_id, opportunity_id);
CREATE INDEX ix_application_opportunity ON public.application (opportunity_id);
CREATE INDEX ix_application_status ON public.application (application_status);
CREATE UNIQUE INDEX uq_application_active_student_opportunity ON public.application (student_id, opportunity_id) WHERE application_status IN ('submitted', 'under_review', 'approved_for_referral');
CREATE UNIQUE INDEX uq_peso_personnel_employee_id_ci ON public.peso_personnel (lower(employee_id));
CREATE INDEX ix_referral_peso_personnel ON public.referral (peso_personnel_id);
CREATE INDEX ix_referral_status ON public.referral (referral_status);
CREATE INDEX ix_referral_company_response ON public.referral (company_response);
CREATE INDEX ix_interview_scheduled_at ON public.interview (scheduled_at);
CREATE INDEX ix_internship_assignment_status ON public.internship_assignment (assignment_status);
CREATE INDEX ix_attendance_record_date ON public.attendance_record (attendance_date);
CREATE INDEX ix_account_status_history_account_time ON public.user_account_status_history (user_account_id, changed_at);
CREATE INDEX ix_account_status_history_changed_by ON public.user_account_status_history (changed_by_user_account_id);
CREATE INDEX ix_application_status_history_application_time ON public.application_status_history (application_id, changed_at);
CREATE INDEX ix_application_status_history_changed_by ON public.application_status_history (changed_by_user_account_id);
CREATE INDEX ix_referral_status_history_referral_time ON public.referral_status_history (referral_id, changed_at);
CREATE INDEX ix_referral_status_history_changed_by ON public.referral_status_history (changed_by_user_account_id);
CREATE INDEX ix_assignment_status_history_assignment_time ON public.internship_assignment_status_history (internship_assignment_id, changed_at);
CREATE INDEX ix_assignment_status_history_changed_by ON public.internship_assignment_status_history (changed_by_user_account_id);

CREATE FUNCTION public.fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.fn_current_status_actor()
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  actor_setting text;
  actor_id integer;
BEGIN
  actor_setting := current_setting('app.current_user_account_id', true);
  IF actor_setting IS NULL OR btrim(actor_setting) = '' THEN
    RETURN NULL;
  END IF;
  actor_id := actor_setting::integer;
  IF NOT (EXISTS (
    SELECT 1 FROM public.user_account
    WHERE user_account_id = actor_id AND account_status = 'active'
  )) THEN
    RAISE EXCEPTION 'Status actor % must identify an active user account', actor_id;
  END IF;
  RETURN actor_id;
EXCEPTION
  WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'app.current_user_account_id must be an integer';
END;
$$;

CREATE FUNCTION public.fn_validate_account_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.account_status IS DISTINCT FROM OLD.account_status AND NOT (
    (OLD.account_status = 'active' AND NEW.account_status IN ('suspended', 'archived'))
    OR (OLD.account_status = 'suspended' AND NEW.account_status IN ('active', 'archived'))
    OR (OLD.account_status = 'archived' AND NEW.account_status = 'active')
  ) THEN
    RAISE EXCEPTION 'Invalid account status transition: % -> %', OLD.account_status, NEW.account_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.fn_check_account_profile_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  account_id integer;
  account_role public.user_role_enum;
  student_count integer;
  company_count integer;
  personnel_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    account_id := OLD.user_account_id;
  ELSE
    account_id := NEW.user_account_id;
  END IF;

  SELECT user_role INTO account_role
  FROM public.user_account
  WHERE user_account_id = account_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO student_count FROM public.student WHERE user_account_id = account_id;
  SELECT count(*) INTO company_count FROM public.company WHERE user_account_id = account_id;
  SELECT count(*) INTO personnel_count FROM public.peso_personnel WHERE user_account_id = account_id;

  IF (account_role = 'student' AND (student_count <> 1 OR company_count <> 0 OR personnel_count <> 0))
    OR (account_role = 'company' AND (student_count <> 0 OR company_count <> 1 OR personnel_count <> 0))
    OR (account_role = 'peso_personnel' AND (student_count <> 0 OR company_count <> 0 OR personnel_count <> 1))
    OR (account_role = 'admin' AND (student_count <> 0 OR company_count <> 0 OR personnel_count <> 0)) THEN
    RAISE EXCEPTION 'Account % does not have exactly the profile permitted by role %', account_id, account_role;
  END IF;

  RETURN NULL;
END;
$$;

CREATE FUNCTION public.fn_validate_profile_account()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_role public.user_role_enum;
  actual_role public.user_role_enum;
BEGIN
  expected_role := CASE TG_TABLE_NAME
    WHEN 'student' THEN 'student'::public.user_role_enum
    WHEN 'company' THEN 'company'::public.user_role_enum
    WHEN 'peso_personnel' THEN 'peso_personnel'::public.user_role_enum
  END;

  SELECT user_role INTO actual_role
  FROM public.user_account
  WHERE user_account_id = NEW.user_account_id
  FOR KEY SHARE;

  IF actual_role IS DISTINCT FROM expected_role THEN
    RAISE EXCEPTION 'Profile % requires account role %, found %', TG_TABLE_NAME, expected_role, actual_role;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.fn_validate_student_preferred_industry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  custom_allowed boolean;
BEGIN
  SELECT is_custom_text INTO custom_allowed FROM public.industry WHERE industry_id = NEW.industry_id;
  IF custom_allowed AND (NEW.custom_industry_name IS NULL OR btrim(NEW.custom_industry_name) = '') THEN
    RAISE EXCEPTION 'Custom industry text is required for industry %', NEW.industry_id;
  ELSIF NOT custom_allowed AND NEW.custom_industry_name IS NOT NULL THEN
    RAISE EXCEPTION 'Custom industry text is allowed only for the designated custom industry';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.fn_validate_industry_custom_flag()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_custom_text IS DISTINCT FROM OLD.is_custom_text THEN
    IF NEW.is_custom_text AND EXISTS (SELECT 1 FROM public.company WHERE industry_id = NEW.industry_id) THEN
      RAISE EXCEPTION 'An industry referenced by a company cannot become the student-only custom industry';
    END IF;
    IF NEW.is_custom_text AND EXISTS (SELECT 1 FROM public.student_preferred_industry WHERE industry_id = NEW.industry_id AND custom_industry_name IS NULL) THEN
      RAISE EXCEPTION 'Existing selections require custom industry text before this industry can become custom';
    END IF;
    IF NOT NEW.is_custom_text AND EXISTS (SELECT 1 FROM public.student_preferred_industry WHERE industry_id = NEW.industry_id AND custom_industry_name IS NOT NULL) THEN
      RAISE EXCEPTION 'Custom industry selections must be cleared before this industry becomes standard';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.fn_validate_company_industry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.industry WHERE industry_id = NEW.industry_id AND is_custom_text) THEN
    RAISE EXCEPTION 'Companies cannot reference the student-only custom industry';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.fn_validate_opportunity_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.opportunity_status IS DISTINCT FROM OLD.opportunity_status AND NOT (
    (OLD.opportunity_status = 'open' AND NEW.opportunity_status = 'closed')
    OR (OLD.opportunity_status = 'closed' AND NEW.opportunity_status IN ('open', 'archived'))
    OR (OLD.opportunity_status = 'archived' AND NEW.opportunity_status = 'closed')
  ) THEN
    RAISE EXCEPTION 'Invalid opportunity status transition: % -> %', OLD.opportunity_status, NEW.opportunity_status;
  END IF;
  IF OLD.opportunity_status = 'closed' AND NEW.opportunity_status = 'open' AND NEW.application_deadline <= CURRENT_TIMESTAMP THEN
    RAISE EXCEPTION 'A reopened opportunity requires a future application deadline';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.fn_validate_application()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  opportunity_state public.opportunity_status_enum;
  deadline timestamptz;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.application_status <> 'submitted' OR NEW.student_response <> 'pending' THEN
      RAISE EXCEPTION 'A new application must begin as submitted with a pending student response';
    END IF;
    SELECT opportunity_status, application_deadline INTO opportunity_state, deadline
    FROM public.opportunity WHERE opportunity_id = NEW.opportunity_id FOR KEY SHARE;
    IF opportunity_state <> 'open' OR NEW.submitted_at >= deadline THEN
      RAISE EXCEPTION 'Applications require an open opportunity and submission before its deadline';
    END IF;
  ELSE
    IF NEW.application_status IS DISTINCT FROM OLD.application_status AND NOT (
      (OLD.application_status = 'submitted' AND NEW.application_status IN ('under_review', 'withdrawn', 'expired'))
      OR (OLD.application_status = 'under_review' AND NEW.application_status IN ('approved_for_referral', 'rejected_for_referral', 'withdrawn', 'expired'))
      OR (OLD.application_status = 'approved_for_referral' AND NEW.application_status IN ('closed', 'withdrawn'))
    ) THEN
      RAISE EXCEPTION 'Invalid application status transition: % -> %', OLD.application_status, NEW.application_status;
    END IF;
    IF NEW.student_response IS DISTINCT FROM OLD.student_response AND NOT (
      OLD.student_response = 'pending' AND NEW.student_response IN ('accepted', 'declined')
    ) THEN
      RAISE EXCEPTION 'Invalid student response transition: % -> %', OLD.student_response, NEW.student_response;
    END IF;
    IF NEW.student_response IS DISTINCT FROM OLD.student_response AND NOT EXISTS (
      SELECT 1 FROM public.referral
      WHERE application_id = NEW.application_id AND company_response = 'accepted'
    ) THEN
      RAISE EXCEPTION 'A student may respond only after company acceptance';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.fn_validate_referral()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.referral_status <> 'sent' OR NEW.company_response <> 'pending' THEN
      RAISE EXCEPTION 'A new referral must begin as sent with a pending company response';
    END IF;
    IF NOT (EXISTS (SELECT 1 FROM public.application WHERE application_id = NEW.application_id AND application_status = 'approved_for_referral')) THEN
      RAISE EXCEPTION 'A referral requires an approved_for_referral application';
    END IF;
  ELSE
    IF NEW.referral_status IS DISTINCT FROM OLD.referral_status AND NOT (
      (OLD.referral_status = 'sent' AND NEW.referral_status IN ('under_review', 'withdrawn', 'expired'))
      OR (OLD.referral_status = 'under_review' AND NEW.referral_status IN ('closed', 'withdrawn', 'expired'))
    ) THEN
      RAISE EXCEPTION 'Invalid referral status transition: % -> %', OLD.referral_status, NEW.referral_status;
    END IF;
    IF NEW.company_response IS DISTINCT FROM OLD.company_response AND NOT (
      (OLD.company_response = 'pending' AND NEW.company_response IN ('for_interview', 'accepted', 'rejected'))
      OR (OLD.company_response = 'for_interview' AND NEW.company_response IN ('accepted', 'rejected'))
    ) THEN
      RAISE EXCEPTION 'Invalid company response transition: % -> %', OLD.company_response, NEW.company_response;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.fn_check_referral_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_application_id integer;
  target_referral_id integer;
  stored_referral_status public.referral_status_enum;
  stored_company_response public.company_response_enum;
  stored_student_response public.student_response_enum;
BEGIN
  IF TG_TABLE_NAME = 'referral' THEN
    IF TG_OP = 'DELETE' THEN
      target_referral_id := OLD.referral_id;
    ELSE
      target_referral_id := NEW.referral_id;
    END IF;
  ELSE
    SELECT referral_id INTO target_referral_id FROM public.referral WHERE application_id = NEW.application_id;
  END IF;
  IF target_referral_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT r.application_id, r.referral_status, r.company_response, a.student_response
  INTO target_application_id, stored_referral_status, stored_company_response, stored_student_response
  FROM public.referral r
  JOIN public.application a ON a.application_id = r.application_id
  WHERE r.referral_id = target_referral_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF stored_referral_status = 'sent' AND stored_company_response <> 'pending' THEN
    RAISE EXCEPTION 'A sent referral must have a pending company response';
  END IF;
  IF stored_company_response = 'for_interview' AND stored_referral_status <> 'under_review' THEN
    RAISE EXCEPTION 'The interview stage requires an under_review referral';
  END IF;
  IF stored_company_response = 'accepted' AND stored_referral_status NOT IN ('under_review', 'closed') THEN
    RAISE EXCEPTION 'An accepted company response requires an under_review or closed referral';
  END IF;
  IF stored_company_response = 'rejected' AND stored_referral_status <> 'closed' THEN
    RAISE EXCEPTION 'A rejected company response requires a closed referral';
  END IF;
  IF stored_student_response <> 'pending' AND stored_company_response <> 'accepted' THEN
    RAISE EXCEPTION 'A non-pending student response requires company acceptance';
  END IF;
  IF stored_referral_status = 'closed' AND stored_company_response = 'accepted' AND stored_student_response = 'pending' THEN
    RAISE EXCEPTION 'An accepted referral cannot close before the student responds';
  END IF;
  RETURN NULL;
END;
$$;

CREATE FUNCTION public.fn_validate_interview()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT (EXISTS (SELECT 1 FROM public.referral WHERE referral_id = NEW.referral_id AND referral_status = 'under_review' AND company_response = 'for_interview')) THEN
    RAISE EXCEPTION 'Interview changes require an under_review referral with company_response for_interview';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.fn_validate_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  assigned_student_id integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.assignment_status <> 'pending' THEN
      RAISE EXCEPTION 'A new assignment must begin as pending';
    END IF;
    IF NOT (EXISTS (
      SELECT 1 FROM public.referral r
      JOIN public.application a ON a.application_id = r.application_id
      WHERE r.referral_id = NEW.referral_id
        AND r.company_response = 'accepted'
        AND a.student_response = 'accepted'
    )) THEN
      RAISE EXCEPTION 'Assignment creation requires company and student acceptance';
    END IF;
  ELSIF NEW.assignment_status IS DISTINCT FROM OLD.assignment_status AND NOT (
    (OLD.assignment_status = 'pending' AND NEW.assignment_status IN ('ongoing', 'withdrawn', 'cancelled'))
    OR (OLD.assignment_status = 'ongoing' AND NEW.assignment_status IN ('completed', 'withdrawn', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'Invalid assignment status transition: % -> %', OLD.assignment_status, NEW.assignment_status;
  END IF;

  IF NEW.assignment_status = 'ongoing' AND (TG_OP = 'INSERT' OR OLD.assignment_status IS DISTINCT FROM NEW.assignment_status OR OLD.referral_id IS DISTINCT FROM NEW.referral_id) THEN
    SELECT a.student_id INTO assigned_student_id
    FROM public.referral r JOIN public.application a ON a.application_id = r.application_id
    WHERE r.referral_id = NEW.referral_id;
    PERFORM 1 FROM public.student WHERE student_id = assigned_student_id FOR UPDATE;
    IF EXISTS (
      SELECT 1
      FROM public.internship_assignment ia
      JOIN public.referral r ON r.referral_id = ia.referral_id
      JOIN public.application a ON a.application_id = r.application_id
      WHERE a.student_id = assigned_student_id
        AND ia.assignment_status = 'ongoing'
        AND ia.internship_assignment_id <> NEW.internship_assignment_id
    ) THEN
      RAISE EXCEPTION 'Student % already has an ongoing assignment', assigned_student_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.fn_derive_attendance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  assignment_start date;
  assignment_limit date;
  shift_start time;
  shift_end time;
  actual_interval interval;
  shift_interval interval;
BEGIN
  SELECT start_date, COALESCE(end_date, expected_end_date), start_shift, end_shift
  INTO assignment_start, assignment_limit, shift_start, shift_end
  FROM public.internship_assignment
  WHERE internship_assignment_id = NEW.internship_assignment_id
  FOR KEY SHARE;

  IF NEW.attendance_date < assignment_start OR (assignment_limit IS NOT NULL AND NEW.attendance_date > assignment_limit) THEN
    RAISE EXCEPTION 'Attendance date % is outside the assignment period', NEW.attendance_date;
  END IF;

  NEW.time_in_status := CASE WHEN NEW.time_in > shift_start THEN 'late'::public.time_in_status_enum ELSE 'on_time'::public.time_in_status_enum END;
  IF NEW.time_out IS NULL THEN
    NEW.hours_rendered := NULL;
    NEW.rendered_hours_status := 'incomplete';
    RETURN NEW;
  END IF;
  IF NEW.time_out <= NEW.time_in THEN
    RAISE EXCEPTION 'Attendance time_out must be later than time_in';
  END IF;

  actual_interval := NEW.time_out - NEW.time_in;
  shift_interval := shift_end - shift_start;
  NEW.hours_rendered := round((extract(epoch FROM actual_interval) / 3600)::numeric, 2);
  NEW.rendered_hours_status := CASE
    WHEN actual_interval < shift_interval THEN 'undertime'::public.rendered_hours_status_enum
    WHEN actual_interval > shift_interval THEN 'overtime'::public.rendered_hours_status_enum
    ELSE 'complete'::public.rendered_hours_status_enum
  END;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.fn_validate_feedback()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT (EXISTS (
    SELECT 1 FROM public.internship_assignment
    WHERE internship_assignment_id = NEW.internship_assignment_id
      AND assignment_status IN ('completed', 'withdrawn', 'cancelled')
  )) THEN
    RAISE EXCEPTION 'Feedback requires a completed, withdrawn, or cancelled assignment';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.fn_record_status_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor_id integer := public.fn_current_status_actor();
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'user_account' THEN
      IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
        INSERT INTO public.user_account_status_history (user_account_id, previous_account_status, new_account_status, changed_by_user_account_id)
        VALUES (NEW.user_account_id, OLD.account_status, NEW.account_status, actor_id);
      END IF;
    WHEN 'application' THEN
      IF NEW.application_status IS DISTINCT FROM OLD.application_status THEN
        INSERT INTO public.application_status_history (application_id, previous_application_status, new_application_status, changed_by_user_account_id)
        VALUES (NEW.application_id, OLD.application_status, NEW.application_status, actor_id);
      END IF;
    WHEN 'referral' THEN
      IF NEW.referral_status IS DISTINCT FROM OLD.referral_status THEN
        INSERT INTO public.referral_status_history (referral_id, previous_referral_status, new_referral_status, changed_by_user_account_id)
        VALUES (NEW.referral_id, OLD.referral_status, NEW.referral_status, actor_id);
      END IF;
    WHEN 'internship_assignment' THEN
      IF NEW.assignment_status IS DISTINCT FROM OLD.assignment_status THEN
        INSERT INTO public.internship_assignment_status_history (internship_assignment_id, previous_assignment_status, new_assignment_status, changed_by_user_account_id)
        VALUES (NEW.internship_assignment_id, OLD.assignment_status, NEW.assignment_status, actor_id);
      END IF;
  END CASE;
  RETURN NULL;
END;
$$;

CREATE FUNCTION public.fn_block_status_history_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; updates and deletes are prohibited', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER trg_user_account_updated_at BEFORE UPDATE ON public.user_account FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_student_updated_at BEFORE UPDATE ON public.student FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_student_academic_information_updated_at BEFORE UPDATE ON public.student_academic_information FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_internship_preference_updated_at BEFORE UPDATE ON public.internship_preference FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_industry_updated_at BEFORE UPDATE ON public.industry FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_requirement_type_updated_at BEFORE UPDATE ON public.requirement_type FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_student_requirement_submission_updated_at BEFORE UPDATE ON public.student_requirement_submission FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_company_updated_at BEFORE UPDATE ON public.company FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_opportunity_updated_at BEFORE UPDATE ON public.opportunity FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_application_updated_at BEFORE UPDATE ON public.application FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_peso_personnel_updated_at BEFORE UPDATE ON public.peso_personnel FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_referral_updated_at BEFORE UPDATE ON public.referral FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_interview_updated_at BEFORE UPDATE ON public.interview FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_internship_assignment_updated_at BEFORE UPDATE ON public.internship_assignment FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_attendance_record_updated_at BEFORE UPDATE ON public.attendance_record FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_internship_feedback_updated_at BEFORE UPDATE ON public.internship_feedback FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_user_account_status_transition BEFORE UPDATE OF account_status ON public.user_account FOR EACH ROW EXECUTE FUNCTION public.fn_validate_account_status_transition();
CREATE TRIGGER trg_student_profile_account BEFORE INSERT OR UPDATE OF user_account_id ON public.student FOR EACH ROW EXECUTE FUNCTION public.fn_validate_profile_account();
CREATE TRIGGER trg_company_profile_account BEFORE INSERT OR UPDATE OF user_account_id ON public.company FOR EACH ROW EXECUTE FUNCTION public.fn_validate_profile_account();
CREATE TRIGGER trg_peso_personnel_profile_account BEFORE INSERT OR UPDATE OF user_account_id ON public.peso_personnel FOR EACH ROW EXECUTE FUNCTION public.fn_validate_profile_account();
CREATE CONSTRAINT TRIGGER trg_user_account_profile_integrity AFTER INSERT OR UPDATE OF user_role ON public.user_account DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_check_account_profile_integrity();
CREATE CONSTRAINT TRIGGER trg_student_account_profile_integrity AFTER INSERT OR UPDATE OF user_account_id OR DELETE ON public.student DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_check_account_profile_integrity();
CREATE CONSTRAINT TRIGGER trg_company_account_profile_integrity AFTER INSERT OR UPDATE OF user_account_id OR DELETE ON public.company DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_check_account_profile_integrity();
CREATE CONSTRAINT TRIGGER trg_peso_account_profile_integrity AFTER INSERT OR UPDATE OF user_account_id OR DELETE ON public.peso_personnel DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_check_account_profile_integrity();

CREATE TRIGGER trg_student_preferred_industry_valid BEFORE INSERT OR UPDATE ON public.student_preferred_industry FOR EACH ROW EXECUTE FUNCTION public.fn_validate_student_preferred_industry();
CREATE TRIGGER trg_industry_custom_flag_valid BEFORE UPDATE OF is_custom_text ON public.industry FOR EACH ROW EXECUTE FUNCTION public.fn_validate_industry_custom_flag();
CREATE TRIGGER trg_company_industry_valid BEFORE INSERT OR UPDATE OF industry_id ON public.company FOR EACH ROW EXECUTE FUNCTION public.fn_validate_company_industry();
CREATE TRIGGER trg_opportunity_status_transition BEFORE UPDATE OF opportunity_status ON public.opportunity FOR EACH ROW EXECUTE FUNCTION public.fn_validate_opportunity_transition();
CREATE TRIGGER trg_application_workflow BEFORE INSERT OR UPDATE ON public.application FOR EACH ROW EXECUTE FUNCTION public.fn_validate_application();
CREATE TRIGGER trg_referral_workflow BEFORE INSERT OR UPDATE ON public.referral FOR EACH ROW EXECUTE FUNCTION public.fn_validate_referral();
CREATE CONSTRAINT TRIGGER trg_referral_consistency AFTER INSERT OR UPDATE ON public.referral DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_check_referral_consistency();
CREATE CONSTRAINT TRIGGER trg_application_referral_consistency AFTER UPDATE OF student_response ON public.application DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_check_referral_consistency();
CREATE TRIGGER trg_interview_workflow BEFORE INSERT OR UPDATE ON public.interview FOR EACH ROW EXECUTE FUNCTION public.fn_validate_interview();
CREATE TRIGGER trg_internship_assignment_workflow BEFORE INSERT OR UPDATE ON public.internship_assignment FOR EACH ROW EXECUTE FUNCTION public.fn_validate_assignment();
CREATE TRIGGER trg_attendance_record_derive BEFORE INSERT OR UPDATE ON public.attendance_record FOR EACH ROW EXECUTE FUNCTION public.fn_derive_attendance();
CREATE TRIGGER trg_internship_feedback_workflow BEFORE INSERT OR UPDATE ON public.internship_feedback FOR EACH ROW EXECUTE FUNCTION public.fn_validate_feedback();

CREATE TRIGGER trg_user_account_status_history AFTER UPDATE OF account_status ON public.user_account FOR EACH ROW EXECUTE FUNCTION public.fn_record_status_history();
CREATE TRIGGER trg_application_status_history AFTER UPDATE OF application_status ON public.application FOR EACH ROW EXECUTE FUNCTION public.fn_record_status_history();
CREATE TRIGGER trg_referral_status_history AFTER UPDATE OF referral_status ON public.referral FOR EACH ROW EXECUTE FUNCTION public.fn_record_status_history();
CREATE TRIGGER trg_assignment_status_history AFTER UPDATE OF assignment_status ON public.internship_assignment FOR EACH ROW EXECUTE FUNCTION public.fn_record_status_history();
CREATE TRIGGER trg_account_history_append_only BEFORE UPDATE OR DELETE ON public.user_account_status_history FOR EACH ROW EXECUTE FUNCTION public.fn_block_status_history_mutation();
CREATE TRIGGER trg_application_history_append_only BEFORE UPDATE OR DELETE ON public.application_status_history FOR EACH ROW EXECUTE FUNCTION public.fn_block_status_history_mutation();
CREATE TRIGGER trg_referral_history_append_only BEFORE UPDATE OR DELETE ON public.referral_status_history FOR EACH ROW EXECUTE FUNCTION public.fn_block_status_history_mutation();
CREATE TRIGGER trg_assignment_history_append_only BEFORE UPDATE OR DELETE ON public.internship_assignment_status_history FOR EACH ROW EXECUTE FUNCTION public.fn_block_status_history_mutation();

CREATE VIEW public.vw_student_profile_details AS
WITH preferred_industry AS (
  SELECT spi.student_id,
    jsonb_agg(jsonb_build_object('industry_id', i.industry_id, 'industry_name', i.industry_name, 'custom_industry_name', spi.custom_industry_name) ORDER BY i.industry_name, i.industry_id) AS preferred_industries
  FROM public.student_preferred_industry spi
  JOIN public.industry i ON i.industry_id = spi.industry_id
  GROUP BY spi.student_id
)
SELECT s.student_id, s.user_account_id, ua.account_status, ua.deleted_at,
  s.first_name, s.middle_name, s.last_name, s.extension_name,
  concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS full_name,
  s.contact_number, s.contact_email, s.linkedin_url,
  s.address_line, s.address_barangay, s.address_district, s.address_city,
  s.inquiry_method, s.photo_file_path,
  sai.school_name, sai.year_level, sai.strand_program,
  ip.required_hours AS preferred_required_hours,
  ip.available_days AS preferred_available_days,
  ip.start_date AS preferred_start_date,
  ip.preferred_company_type,
  ip.allows_outside_preferred_field,
  COALESCE(pi.preferred_industries, '[]'::jsonb) AS preferred_industries
FROM public.student s
JOIN public.user_account ua ON ua.user_account_id = s.user_account_id
LEFT JOIN public.student_academic_information sai ON sai.student_id = s.student_id
LEFT JOIN public.internship_preference ip ON ip.student_id = s.student_id
LEFT JOIN preferred_industry pi ON pi.student_id = s.student_id;

CREATE VIEW public.vw_opportunity_summary AS
WITH application_counts AS (
  SELECT a.opportunity_id,
    count(a.application_id) AS total_application_count,
    count(a.application_id) FILTER (WHERE a.application_status IN ('submitted', 'under_review', 'approved_for_referral')) AS active_application_count,
    count(a.application_id) FILTER (WHERE a.application_status = 'approved_for_referral') AS approved_for_referral_count
  FROM public.application a
  GROUP BY a.opportunity_id
)
SELECT o.opportunity_id, c.company_id, c.company_name, c.company_type,
  i.industry_id, i.industry_name, c.logo_file_path AS company_logo_file_path,
  c.address_city AS company_address_city,
  o.title, o.department, o.description, o.qualification,
  o.minimum_required_hours, o.work_arrangement, o.offered_slots,
  o.has_allowance, o.allowance, o.application_deadline, o.opportunity_status,
  o.created_at, o.updated_at,
  COALESCE(ac.total_application_count, 0::bigint) AS total_application_count,
  COALESCE(ac.active_application_count, 0::bigint) AS active_application_count,
  COALESCE(ac.approved_for_referral_count, 0::bigint) AS approved_for_referral_count
FROM public.opportunity o
JOIN public.company c ON c.company_id = o.company_id
JOIN public.industry i ON i.industry_id = c.industry_id
LEFT JOIN application_counts ac ON ac.opportunity_id = o.opportunity_id;

CREATE VIEW public.vw_application_details AS
SELECT a.application_id, a.submitted_at, a.application_status, a.remark AS application_remark,
  a.student_response, a.student_responded_at,
  s.student_id, concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
  s.contact_email AS student_contact_email, s.contact_number AS student_contact_number,
  sai.school_name, sai.year_level, sai.strand_program,
  o.opportunity_id, o.title AS opportunity_title, o.opportunity_status,
  o.application_deadline, o.work_arrangement, o.minimum_required_hours,
  c.company_id, c.company_name, i.industry_name,
  r.referral_id, r.referral_status, r.company_response,
  ia.internship_assignment_id, ia.assignment_status
FROM public.application a
JOIN public.student s ON s.student_id = a.student_id
LEFT JOIN public.student_academic_information sai ON sai.student_id = s.student_id
JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
JOIN public.company c ON c.company_id = o.company_id
JOIN public.industry i ON i.industry_id = c.industry_id
LEFT JOIN public.referral r ON r.application_id = a.application_id
LEFT JOIN public.internship_assignment ia ON ia.referral_id = r.referral_id;

CREATE VIEW public.vw_referral_details AS
SELECT r.referral_id, r.referred_at, r.referral_status, r.referral_document_file_path,
  r.company_response, r.company_responded_at, r.remark AS referral_remark,
  a.application_id, a.application_status, a.student_response, a.student_responded_at,
  s.student_id, concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
  s.contact_email AS student_contact_email, s.contact_number AS student_contact_number,
  o.opportunity_id, o.title AS opportunity_title,
  c.company_id, c.company_name, i.industry_name,
  pp.peso_personnel_id, pp.employee_id AS peso_employee_id,
  concat_ws(' ', pp.first_name, pp.middle_name, pp.last_name, pp.extension_name) AS peso_personnel_full_name,
  iv.interview_id, iv.scheduled_at, iv.interview_mode, iv.physical_location,
  iv.online_meeting_url, iv.remark AS interview_remark,
  ia.internship_assignment_id, ia.assignment_status
FROM public.referral r
JOIN public.application a ON a.application_id = r.application_id
JOIN public.student s ON s.student_id = a.student_id
JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
JOIN public.company c ON c.company_id = o.company_id
JOIN public.industry i ON i.industry_id = c.industry_id
JOIN public.peso_personnel pp ON pp.peso_personnel_id = r.peso_personnel_id
LEFT JOIN public.interview iv ON iv.referral_id = r.referral_id
LEFT JOIN public.internship_assignment ia ON ia.referral_id = r.referral_id;

CREATE VIEW public.vw_upcoming_interviews AS
SELECT iv.interview_id, r.referral_id, iv.scheduled_at, iv.interview_mode,
  iv.physical_location, iv.online_meeting_url, iv.remark AS interview_remark,
  s.student_id, concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
  s.contact_email AS student_contact_email, s.contact_number AS student_contact_number,
  o.opportunity_id, o.title AS opportunity_title,
  c.company_id, c.company_name, r.referral_status, r.company_response
FROM public.interview iv
JOIN public.referral r ON r.referral_id = iv.referral_id
JOIN public.application a ON a.application_id = r.application_id
JOIN public.student s ON s.student_id = a.student_id
JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
JOIN public.company c ON c.company_id = o.company_id
WHERE iv.scheduled_at >= CURRENT_TIMESTAMP
  AND r.referral_status = 'under_review'
  AND r.company_response = 'for_interview';

CREATE VIEW public.vw_internship_assignment_details AS
SELECT ia.internship_assignment_id, r.referral_id, a.application_id,
  s.student_id, concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
  s.contact_email AS student_contact_email, s.contact_number AS student_contact_number,
  o.opportunity_id, o.title AS opportunity_title,
  c.company_id, c.company_name,
  ia.required_hours, ia.start_date, ia.expected_end_date, ia.end_date,
  ia.working_days, ia.start_shift, ia.end_shift, ia.assignment_status,
  a.application_status, r.referral_status, r.company_response, a.student_response,
  f.internship_feedback_id, f.rating AS feedback_rating, f.submitted_at AS feedback_submitted_at
FROM public.internship_assignment ia
JOIN public.referral r ON r.referral_id = ia.referral_id
JOIN public.application a ON a.application_id = r.application_id
JOIN public.student s ON s.student_id = a.student_id
JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
JOIN public.company c ON c.company_id = o.company_id
LEFT JOIN public.internship_feedback f ON f.internship_assignment_id = ia.internship_assignment_id;

CREATE VIEW public.vw_attendance_summary AS
SELECT ia.internship_assignment_id, ia.assignment_status,
  s.student_id, concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
  o.opportunity_id, o.title AS opportunity_title,
  c.company_id, c.company_name, ia.required_hours,
  COALESCE(sum(ar.hours_rendered), 0::numeric) AS total_rendered_hours,
  count(ar.attendance_record_id) AS attendance_record_count,
  count(ar.attendance_record_id) FILTER (WHERE ar.rendered_hours_status = 'complete') AS complete_count,
  count(ar.attendance_record_id) FILTER (WHERE ar.rendered_hours_status = 'incomplete') AS incomplete_count,
  count(ar.attendance_record_id) FILTER (WHERE ar.time_in_status = 'late') AS late_count,
  count(ar.attendance_record_id) FILTER (WHERE ar.rendered_hours_status = 'undertime') AS undertime_count,
  count(ar.attendance_record_id) FILTER (WHERE ar.rendered_hours_status = 'overtime') AS overtime_count,
  min(ar.attendance_date) AS first_attendance_date,
  max(ar.attendance_date) AS latest_attendance_date,
  CASE WHEN ia.required_hours > 0 THEN round(COALESCE(sum(ar.hours_rendered), 0::numeric) / ia.required_hours * 100, 2) ELSE 0::numeric END AS completion_percentage
FROM public.internship_assignment ia
JOIN public.referral r ON r.referral_id = ia.referral_id
JOIN public.application a ON a.application_id = r.application_id
JOIN public.student s ON s.student_id = a.student_id
JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
JOIN public.company c ON c.company_id = o.company_id
LEFT JOIN public.attendance_record ar ON ar.internship_assignment_id = ia.internship_assignment_id
GROUP BY ia.internship_assignment_id, ia.assignment_status, s.student_id, s.first_name, s.middle_name, s.last_name, s.extension_name, o.opportunity_id, o.title, c.company_id, c.company_name, ia.required_hours;

COMMIT;
