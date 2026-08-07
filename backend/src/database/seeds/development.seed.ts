import type { DataSource, QueryRunner } from 'typeorm';
import { hashPassword, verifyPassword } from '../../auth/password-hashing';
import { setStatusActor } from '../status-actor.transaction';
import { seedReferenceData } from './reference.seed';

export const DEV_SEED_MARKER = '[DEV-SEED:v1]';
export const DEV_SEED_PATH_PREFIX = '/dev-seed/v1/placeholders';

export const DEV_SEED_ACCOUNTS = [
  { role: 'admin', email: 'dev.admin@seed.invalid' },
  { role: 'student', email: 'dev.student.one@seed.invalid' },
  { role: 'student', email: 'dev.student.two@seed.invalid' },
  { role: 'company', email: 'dev.company@seed.invalid' },
  { role: 'peso_personnel', email: 'dev.peso@seed.invalid' },
] as const;

export interface DevelopmentSeedResult {
  accounts: ReadonlyArray<{ role: string; email: string }>;
  passwordSource: 'DEV_SEED_PASSWORD';
}

interface AccountRow {
  user_account_id: number;
  email: string;
  password_hash: string | null;
  user_role: string;
  account_status: string;
  deleted_at: Date | null;
}

interface IdRow {
  id: number;
}

interface StudentRow {
  student_id: number;
  first_name: string;
  contact_email: string;
}

interface CompanyRow {
  company_id: number;
  company_name: string;
  description: string;
}

interface PersonnelRow {
  peso_personnel_id: number;
  employee_id: string;
}

interface OpportunityRow {
  opportunity_id: number;
  title: string;
  description: string;
}

interface ApplicationRow {
  application_id: number;
  application_status: string;
  student_response: string;
}

interface ReferralRow {
  referral_id: number;
  referral_status: string;
  company_response: string;
  referral_document_file_path?: string;
  remark?: string | null;
}

interface AssignmentRow {
  internship_assignment_id: number;
  assignment_status: string;
}

interface StudentFixture {
  email: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  contactNumber: string;
  addressLine: string;
  schoolName: string;
  yearLevel: string;
  strandProgram: string;
  requiredHours: number;
  preferredCompanyType: 'government' | 'private';
}

interface OpportunityFixture {
  title: string;
  department: string;
  description: string;
  qualification: string;
  hasAllowance: boolean;
  allowance: number | null;
  minimumRequiredHours: number;
  workArrangement: 'onsite' | 'remote' | 'hybrid';
  offeredSlots: number;
}

const STUDENT_FIXTURES: readonly StudentFixture[] = [
  {
    email: 'dev.student.one@seed.invalid',
    firstName: 'DevSeed',
    lastName: 'StudentOne',
    birthDate: '2001-01-15',
    contactNumber: '09000000001',
    addressLine: `${DEV_SEED_MARKER} Student One Address`,
    schoolName: `${DEV_SEED_MARKER} Polytechnic School`,
    yearLevel: 'third_year_college',
    strandProgram: 'BS Information Technology',
    requiredHours: 480,
    preferredCompanyType: 'private',
  },
  {
    email: 'dev.student.two@seed.invalid',
    firstName: 'DevSeed',
    lastName: 'StudentTwo',
    birthDate: '2003-06-20',
    contactNumber: '09000000002',
    addressLine: `${DEV_SEED_MARKER} Student Two Address`,
    schoolName: `${DEV_SEED_MARKER} Senior High School`,
    yearLevel: 'grade_12',
    strandProgram: 'Information and Communications Technology',
    requiredHours: 320,
    preferredCompanyType: 'government',
  },
];

const OPPORTUNITY_FIXTURES: readonly OpportunityFixture[] = [
  {
    title: `${DEV_SEED_MARKER} Software QA Intern`,
    department: 'Quality Engineering',
    description: `${DEV_SEED_MARKER} Synthetic interview-track opportunity.`,
    qualification: 'Fake students familiar with software testing.',
    hasAllowance: true,
    allowance: 150,
    minimumRequiredHours: 240,
    workArrangement: 'hybrid',
    offeredSlots: 3,
  },
  {
    title: `${DEV_SEED_MARKER} Office Operations Intern`,
    department: 'Administration',
    description: `${DEV_SEED_MARKER} Synthetic completed-assignment opportunity.`,
    qualification: 'Fake students interested in office operations.',
    hasAllowance: false,
    allowance: null,
    minimumRequiredHours: 240,
    workArrangement: 'onsite',
    offeredSlots: 2,
  },
  {
    title: `${DEV_SEED_MARKER} Support Engineering Intern`,
    department: 'Technical Support',
    description: `${DEV_SEED_MARKER} Synthetic resubmission-track opportunity.`,
    qualification: 'Fake students interested in technical support.',
    hasAllowance: true,
    allowance: 100,
    minimumRequiredHours: 200,
    workArrangement: 'remote',
    offeredSlots: 4,
  },
];

function requireDevelopmentSeedAccess(): string {
  if (process.env.NODE_ENV?.toLowerCase() === 'production') {
    throw new Error(
      'The development seed is disabled when NODE_ENV=production.',
    );
  }
  if (process.env.ALLOW_DEV_SEED?.toLowerCase() !== 'true') {
    throw new Error('Set ALLOW_DEV_SEED=true to run the development seed.');
  }
  const password = process.env.DEV_SEED_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error(
      'DEV_SEED_PASSWORD is required and must contain at least 12 characters.',
    );
  }
  return password;
}

async function queryRows<T>(
  queryRunner: QueryRunner,
  sql: string,
  parameters: unknown[] = [],
): Promise<T[]> {
  const result: unknown = await queryRunner.query(sql, parameters);
  if (!Array.isArray(result)) {
    throw new Error('Expected a row array from PostgreSQL.');
  }
  return result as T[];
}

function assertSingleOwnedRow<T>(rows: T[], description: string): T | null {
  if (rows.length > 1) {
    throw new Error(
      `Multiple rows claim the development fixture ${description}.`,
    );
  }
  return rows[0] ?? null;
}

async function ensureAccount(
  queryRunner: QueryRunner,
  email: string,
  role: string,
  password: string,
): Promise<number> {
  if (!email.endsWith('@seed.invalid')) {
    throw new Error(`Development account email is not reserved: ${email}`);
  }

  const existing = assertSingleOwnedRow(
    await queryRows<AccountRow>(
      queryRunner,
      `SELECT user_account_id, email, password_hash, user_role, account_status, deleted_at
         FROM public.user_account
        WHERE lower(email) = lower($1)
        FOR UPDATE`,
      [email],
    ),
    email,
  );

  if (!existing) {
    const inserted = await queryRows<IdRow>(
      queryRunner,
      `INSERT INTO public.user_account (email, password_hash, user_role, account_status)
       VALUES ($1, $2, $3::public.user_role_enum, 'active')
       RETURNING user_account_id AS id`,
      [email, await hashPassword(password), role],
    );
    return inserted[0].id;
  }

  if (
    existing.user_role !== role ||
    existing.account_status !== 'active' ||
    existing.deleted_at !== null
  ) {
    throw new Error(
      `Development fixture account ${email} exists with incompatible role/status.`,
    );
  }
  if (!existing.password_hash) {
    throw new Error(
      `Development fixture account ${email} has no local password.`,
    );
  }

  if (!(await verifyPassword(password, existing.password_hash))) {
    await queryRunner.query(
      `UPDATE public.user_account SET password_hash = $1 WHERE user_account_id = $2`,
      [await hashPassword(password), existing.user_account_id],
    );
  }
  return existing.user_account_id;
}

async function ensureStudent(
  queryRunner: QueryRunner,
  userAccountId: number,
  fixture: StudentFixture,
): Promise<number> {
  const existing = assertSingleOwnedRow(
    await queryRows<StudentRow>(
      queryRunner,
      `SELECT student_id, first_name, contact_email
         FROM public.student
        WHERE user_account_id = $1
        FOR UPDATE`,
      [userAccountId],
    ),
    fixture.email,
  );
  if (existing) {
    if (
      existing.first_name !== fixture.firstName ||
      existing.contact_email !== fixture.email
    ) {
      throw new Error(
        `Development student ${fixture.email} has an incompatible profile.`,
      );
    }
    return existing.student_id;
  }

  const inserted = await queryRows<IdRow>(
    queryRunner,
    `INSERT INTO public.student (
       user_account_id, first_name, last_name, sex, birth_date,
       contact_number, contact_email, address_line, address_barangay,
       address_district, address_city, inquiry_method
     ) VALUES (
       $1, $2, $3, 'not_applicable', $4::date,
       $5, $6, $7, $8, $9, 'Quezon City', 'online'
     ) RETURNING student_id AS id`,
    [
      userAccountId,
      fixture.firstName,
      fixture.lastName,
      fixture.birthDate,
      fixture.contactNumber,
      fixture.email,
      fixture.addressLine,
      `${DEV_SEED_MARKER} Barangay`,
      'District 1',
    ],
  );
  return inserted[0].id;
}

async function ensureCompany(
  queryRunner: QueryRunner,
  userAccountId: number,
  industryId: number,
): Promise<number> {
  const companyName = `${DEV_SEED_MARKER} Byteworks Training Company`;
  const existing = assertSingleOwnedRow(
    await queryRows<CompanyRow>(
      queryRunner,
      `SELECT company_id, company_name, description
         FROM public.company
        WHERE user_account_id = $1
        FOR UPDATE`,
      [userAccountId],
    ),
    companyName,
  );
  if (existing) {
    if (
      existing.company_name !== companyName ||
      !existing.description.startsWith(DEV_SEED_MARKER)
    ) {
      throw new Error(
        'Development company account has an incompatible profile.',
      );
    }
    return existing.company_id;
  }

  const inserted = await queryRows<IdRow>(
    queryRunner,
    `INSERT INTO public.company (
       user_account_id, industry_id, company_name, company_type, description,
       website_url, year_established, company_size, contact_email, contact_number,
       contact_person_first_name, contact_person_last_name, address_line,
       address_barangay, address_district, address_city, logo_file_path
     ) VALUES (
       $1, $2, $3, 'private', $4, $5, 2020, 25, $6, $7,
       'DevSeed', 'Contact', $8, $9, 'District 1', 'Quezon City', $10
     ) RETURNING company_id AS id`,
    [
      userAccountId,
      industryId,
      companyName,
      `${DEV_SEED_MARKER} Synthetic company for local endpoint development.`,
      'https://company.dev-seed.invalid',
      'dev.company.contact@seed.invalid',
      '09000000003',
      `${DEV_SEED_MARKER} Company Address`,
      `${DEV_SEED_MARKER} Barangay`,
      `${DEV_SEED_PATH_PREFIX}/company-logo.png`,
    ],
  );
  return inserted[0].id;
}

async function ensurePesoPersonnel(
  queryRunner: QueryRunner,
  userAccountId: number,
): Promise<number> {
  const employeeId = 'DEV-SEED-QC-PESO-0001';
  const existing = assertSingleOwnedRow(
    await queryRows<PersonnelRow>(
      queryRunner,
      `SELECT peso_personnel_id, employee_id
         FROM public.peso_personnel
        WHERE user_account_id = $1
        FOR UPDATE`,
      [userAccountId],
    ),
    employeeId,
  );
  if (existing) {
    if (existing.employee_id !== employeeId) {
      throw new Error('Development PESO account has an incompatible profile.');
    }
    return existing.peso_personnel_id;
  }

  const inserted = await queryRows<IdRow>(
    queryRunner,
    `INSERT INTO public.peso_personnel (
       user_account_id, first_name, last_name, sex, birth_date,
       address_line, address_barangay, address_district, address_city,
       contact_number, contact_email, employee_id, position, department,
       employee_id_file_path, photo_file_path
     ) VALUES (
       $1, 'DevSeed', 'PesoOfficer', 'not_applicable', DATE '1990-01-01',
       $2, $3, 'District 1', 'Quezon City', $4, $5, $6, $7, $8, $9, $10
     ) RETURNING peso_personnel_id AS id`,
    [
      userAccountId,
      `${DEV_SEED_MARKER} PESO Address`,
      `${DEV_SEED_MARKER} Barangay`,
      '09000000004',
      'dev.peso.contact@seed.invalid',
      employeeId,
      'Development Fixture Officer',
      'QC PESO Development Fixtures',
      `${DEV_SEED_PATH_PREFIX}/peso-employee-id.png`,
      `${DEV_SEED_PATH_PREFIX}/peso-photo.png`,
    ],
  );
  return inserted[0].id;
}

async function findIndustryId(
  queryRunner: QueryRunner,
  industryName: string,
): Promise<number> {
  const rows = await queryRows<IdRow>(
    queryRunner,
    `SELECT industry_id AS id FROM public.industry WHERE industry_name = $1`,
    [industryName],
  );
  if (rows.length !== 1) {
    throw new Error(`Reference industry is unavailable: ${industryName}`);
  }
  return rows[0].id;
}

async function findRequirementTypeId(
  queryRunner: QueryRunner,
  requirementTypeName: string,
): Promise<number> {
  const rows = await queryRows<IdRow>(
    queryRunner,
    `SELECT requirement_type_id AS id
       FROM public.requirement_type
      WHERE requirement_type_name = $1`,
    [requirementTypeName],
  );
  if (rows.length !== 1) {
    throw new Error(
      `Reference requirement type is unavailable: ${requirementTypeName}`,
    );
  }
  return rows[0].id;
}

async function ensureStudentExtensions(
  queryRunner: QueryRunner,
  studentId: number,
  fixture: StudentFixture,
): Promise<void> {
  await queryRunner.query(
    `INSERT INTO public.student_academic_information
       (student_id, school_name, year_level, strand_program)
     SELECT $1, $2, $3::public.year_level_enum, $4
      WHERE NOT EXISTS (
        SELECT 1 FROM public.student_academic_information WHERE student_id = $1
      )`,
    [studentId, fixture.schoolName, fixture.yearLevel, fixture.strandProgram],
  );
  await queryRunner.query(
    `INSERT INTO public.internship_preference (
       student_id, required_hours, available_days,
       allows_outside_preferred_field, start_date, preferred_company_type
     )
     SELECT $1, $2, 'weekdays', true, CURRENT_DATE + 30,
            $3::public.company_type_enum
      WHERE NOT EXISTS (
        SELECT 1 FROM public.internship_preference WHERE student_id = $1
      )`,
    [studentId, fixture.requiredHours, fixture.preferredCompanyType],
  );
}

async function ensurePreferredIndustry(
  queryRunner: QueryRunner,
  studentId: number,
  industryId: number,
): Promise<void> {
  await queryRunner.query(
    `INSERT INTO public.student_preferred_industry (student_id, industry_id)
     VALUES ($1, $2)
     ON CONFLICT (student_id, industry_id) DO NOTHING`,
    [studentId, industryId],
  );
}

async function ensureRequirementSubmission(
  queryRunner: QueryRunner,
  studentId: number,
  requirementTypeId: number,
  requirementName: string,
  fileName: string,
): Promise<void> {
  const rows = await queryRows<{ requirement_file_path: string }>(
    queryRunner,
    `SELECT requirement_file_path
       FROM public.student_requirement_submission
      WHERE student_id = $1 AND requirement_type_id = $2`,
    [studentId, requirementTypeId],
  );
  if (rows[0]) {
    if (!rows[0].requirement_file_path.startsWith(DEV_SEED_PATH_PREFIX)) {
      throw new Error(
        'A development student requirement slot contains a non-seed record.',
      );
    }
    return;
  }
  await queryRunner.query(
    `INSERT INTO public.student_requirement_submission (
       requirement_type_id, student_id, requirement_name, requirement_file_path
     ) VALUES ($1, $2, $3, $4)`,
    [
      requirementTypeId,
      studentId,
      `${DEV_SEED_MARKER} ${requirementName}`,
      `${DEV_SEED_PATH_PREFIX}/${fileName}`,
    ],
  );
}

async function ensureOpportunity(
  queryRunner: QueryRunner,
  companyId: number,
  fixture: OpportunityFixture,
): Promise<number> {
  const existing = assertSingleOwnedRow(
    await queryRows<OpportunityRow>(
      queryRunner,
      `SELECT opportunity_id, title, description
         FROM public.opportunity
        WHERE company_id = $1 AND title = $2
        FOR UPDATE`,
      [companyId, fixture.title],
    ),
    fixture.title,
  );
  if (existing) {
    if (!existing.description.startsWith(DEV_SEED_MARKER)) {
      throw new Error(`Opportunity ${fixture.title} is not seed-owned.`);
    }
    await queryRunner.query(
      `UPDATE public.opportunity
          SET application_deadline = CURRENT_TIMESTAMP + INTERVAL '180 days'
        WHERE opportunity_id = $1
          AND application_deadline <= CURRENT_TIMESTAMP + INTERVAL '30 days'`,
      [existing.opportunity_id],
    );
    return existing.opportunity_id;
  }

  const inserted = await queryRows<IdRow>(
    queryRunner,
    `INSERT INTO public.opportunity (
       company_id, title, department, description, qualification,
       has_allowance, allowance, minimum_required_hours, work_arrangement,
       offered_slots, application_deadline, opportunity_status
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8,
       $9::public.work_arrangement_enum, $10,
       CURRENT_TIMESTAMP + INTERVAL '180 days', 'open'
     ) RETURNING opportunity_id AS id`,
    [
      companyId,
      fixture.title,
      fixture.department,
      fixture.description,
      fixture.qualification,
      fixture.hasAllowance,
      fixture.allowance,
      fixture.minimumRequiredHours,
      fixture.workArrangement,
      fixture.offeredSlots,
    ],
  );
  return inserted[0].id;
}

async function ensureApplication(
  queryRunner: QueryRunner,
  studentId: number,
  opportunityId: number,
  marker: string,
): Promise<ApplicationRow> {
  const existing = assertSingleOwnedRow(
    await queryRows<ApplicationRow>(
      queryRunner,
      `SELECT application_id, application_status, student_response
         FROM public.application
        WHERE student_id = $1 AND opportunity_id = $2 AND remark = $3
        FOR UPDATE`,
      [studentId, opportunityId, marker],
    ),
    marker,
  );
  if (existing) return existing;

  const inserted = await queryRows<ApplicationRow>(
    queryRunner,
    `INSERT INTO public.application (student_id, opportunity_id, remark)
     VALUES ($1, $2, $3)
     RETURNING application_id, application_status, student_response`,
    [studentId, opportunityId, marker],
  );
  return inserted[0];
}

async function transitionApplication(
  queryRunner: QueryRunner,
  applicationId: number,
  target: 'approved_for_referral' | 'rejected_for_referral',
): Promise<void> {
  let rows = await queryRows<ApplicationRow>(
    queryRunner,
    `SELECT application_id, application_status, student_response
       FROM public.application WHERE application_id = $1 FOR UPDATE`,
    [applicationId],
  );
  if (rows[0].application_status === 'submitted') {
    await queryRunner.query(
      `UPDATE public.application
          SET application_status = 'under_review'
        WHERE application_id = $1`,
      [applicationId],
    );
    rows = await queryRows<ApplicationRow>(
      queryRunner,
      `SELECT application_id, application_status, student_response
         FROM public.application WHERE application_id = $1`,
      [applicationId],
    );
  }
  if (rows[0].application_status === 'under_review') {
    await queryRunner.query(
      `UPDATE public.application
          SET application_status = $2::public.application_status_enum
        WHERE application_id = $1`,
      [applicationId, target],
    );
    return;
  }
  if (rows[0].application_status !== target) {
    throw new Error(
      `Application ${applicationId} is in incompatible state ${rows[0].application_status}.`,
    );
  }
}

async function ensureReferral(
  queryRunner: QueryRunner,
  applicationId: number,
  pesoPersonnelId: number,
  fileName: string,
): Promise<ReferralRow> {
  const existing = assertSingleOwnedRow(
    await queryRows<ReferralRow>(
      queryRunner,
      `SELECT referral_id, referral_status, company_response,
              referral_document_file_path, remark
         FROM public.referral WHERE application_id = $1 FOR UPDATE`,
      [applicationId],
    ),
    `referral application ${applicationId}`,
  );
  if (existing) {
    if (
      !existing.referral_document_file_path?.startsWith(DEV_SEED_PATH_PREFIX) ||
      existing.remark !== `${DEV_SEED_MARKER} Synthetic referral`
    ) {
      throw new Error(
        `Referral for seed application ${applicationId} is not seed-owned.`,
      );
    }
    return existing;
  }

  const inserted = await queryRows<ReferralRow>(
    queryRunner,
    `INSERT INTO public.referral (
       application_id, peso_personnel_id, referral_document_file_path, remark
     ) VALUES ($1, $2, $3, $4)
     RETURNING referral_id, referral_status, company_response,
               referral_document_file_path, remark`,
    [
      applicationId,
      pesoPersonnelId,
      `${DEV_SEED_PATH_PREFIX}/${fileName}`,
      `${DEV_SEED_MARKER} Synthetic referral`,
    ],
  );
  return inserted[0];
}

async function advanceReferralToInterview(
  queryRunner: QueryRunner,
  referralId: number,
): Promise<void> {
  const rows = await queryRows<ReferralRow>(
    queryRunner,
    `SELECT referral_id, referral_status, company_response
       FROM public.referral WHERE referral_id = $1 FOR UPDATE`,
    [referralId],
  );
  const referral = rows[0];
  if (
    referral.referral_status === 'sent' &&
    referral.company_response === 'pending'
  ) {
    await queryRunner.query(
      `UPDATE public.referral
          SET referral_status = 'under_review',
              company_response = 'for_interview',
              company_responded_at = CURRENT_TIMESTAMP
        WHERE referral_id = $1`,
      [referralId],
    );
    return;
  }
  if (
    referral.referral_status !== 'under_review' ||
    referral.company_response !== 'for_interview'
  ) {
    throw new Error(
      `Referral ${referralId} is not in the interview fixture state.`,
    );
  }
}

async function ensureInterview(
  queryRunner: QueryRunner,
  referralId: number,
): Promise<void> {
  const rows = await queryRows<{ interview_id: number; remark: string }>(
    queryRunner,
    `SELECT interview_id, remark
       FROM public.interview WHERE referral_id = $1 FOR UPDATE`,
    [referralId],
  );
  if (rows[0]) {
    if (rows[0].remark !== `${DEV_SEED_MARKER} Synthetic online interview`) {
      throw new Error(
        `Interview for referral ${referralId} is not seed-owned.`,
      );
    }
    await queryRunner.query(
      `UPDATE public.interview
          SET scheduled_at = CURRENT_TIMESTAMP + INTERVAL '14 days'
        WHERE interview_id = $1 AND scheduled_at <= CURRENT_TIMESTAMP`,
      [rows[0].interview_id],
    );
    return;
  }
  await queryRunner.query(
    `INSERT INTO public.interview (
       referral_id, scheduled_at, interview_mode, online_meeting_url, remark
     ) VALUES (
       $1, CURRENT_TIMESTAMP + INTERVAL '14 days', 'online', $2, $3
     )`,
    [
      referralId,
      'https://meet.dev-seed.invalid/interview-v1',
      `${DEV_SEED_MARKER} Synthetic online interview`,
    ],
  );
}

async function advanceAcceptedReferral(
  queryRunner: QueryRunner,
  referralId: number,
  applicationId: number,
): Promise<void> {
  let rows = await queryRows<ReferralRow>(
    queryRunner,
    `SELECT referral_id, referral_status, company_response
       FROM public.referral WHERE referral_id = $1 FOR UPDATE`,
    [referralId],
  );
  if (rows[0].referral_status === 'sent') {
    await queryRunner.query(
      `UPDATE public.referral SET referral_status = 'under_review'
        WHERE referral_id = $1`,
      [referralId],
    );
    rows = await queryRows<ReferralRow>(
      queryRunner,
      `SELECT referral_id, referral_status, company_response
         FROM public.referral WHERE referral_id = $1`,
      [referralId],
    );
  }
  if (rows[0].company_response === 'pending') {
    await queryRunner.query(
      `UPDATE public.referral
          SET company_response = 'accepted',
              company_responded_at = CURRENT_TIMESTAMP
        WHERE referral_id = $1`,
      [referralId],
    );
  }

  const application = (
    await queryRows<ApplicationRow>(
      queryRunner,
      `SELECT application_id, application_status, student_response
         FROM public.application WHERE application_id = $1 FOR UPDATE`,
      [applicationId],
    )
  )[0];
  if (application.student_response === 'pending') {
    await queryRunner.query(
      `UPDATE public.application
          SET student_response = 'accepted',
              student_responded_at = CURRENT_TIMESTAMP
        WHERE application_id = $1`,
      [applicationId],
    );
  } else if (application.student_response !== 'accepted') {
    throw new Error(
      `Application ${applicationId} has an incompatible response.`,
    );
  }

  rows = await queryRows<ReferralRow>(
    queryRunner,
    `SELECT referral_id, referral_status, company_response
       FROM public.referral WHERE referral_id = $1 FOR UPDATE`,
    [referralId],
  );
  if (rows[0].referral_status === 'under_review') {
    await queryRunner.query(
      `UPDATE public.referral SET referral_status = 'closed'
        WHERE referral_id = $1`,
      [referralId],
    );
  } else if (rows[0].referral_status !== 'closed') {
    throw new Error(`Referral ${referralId} has an incompatible final state.`);
  }
}

async function ensureAssignment(
  queryRunner: QueryRunner,
  referralId: number,
): Promise<AssignmentRow> {
  const existing = assertSingleOwnedRow(
    await queryRows<AssignmentRow>(
      queryRunner,
      `SELECT internship_assignment_id, assignment_status
         FROM public.internship_assignment
        WHERE referral_id = $1 FOR UPDATE`,
      [referralId],
    ),
    `assignment referral ${referralId}`,
  );
  if (existing) return existing;

  const inserted = await queryRows<AssignmentRow>(
    queryRunner,
    `INSERT INTO public.internship_assignment (
       referral_id, required_hours, start_date, expected_end_date,
       working_days, start_shift, end_shift
     ) VALUES (
       $1, 360, CURRENT_DATE - 14, CURRENT_DATE,
       'weekdays', TIME '09:00', TIME '17:00'
     ) RETURNING internship_assignment_id, assignment_status`,
    [referralId],
  );
  return inserted[0];
}

async function ensureAttendance(
  queryRunner: QueryRunner,
  assignmentId: number,
): Promise<void> {
  await queryRunner.query(
    `INSERT INTO public.attendance_record (
       internship_assignment_id, attendance_date, time_in, time_in_status,
       time_out, photo_file_path
     )
     SELECT internship_assignment_id, start_date + 1, TIME '09:00', 'on_time',
            TIME '17:00', $2
       FROM public.internship_assignment
      WHERE internship_assignment_id = $1
     ON CONFLICT (internship_assignment_id, attendance_date) DO NOTHING`,
    [assignmentId, `${DEV_SEED_PATH_PREFIX}/attendance-day-1.png`],
  );
  await queryRunner.query(
    `INSERT INTO public.attendance_record (
       internship_assignment_id, attendance_date, time_in, time_in_status,
       time_out
     )
     SELECT internship_assignment_id, start_date + 2, TIME '09:15', 'on_time',
            TIME '17:00'
       FROM public.internship_assignment
      WHERE internship_assignment_id = $1
     ON CONFLICT (internship_assignment_id, attendance_date) DO NOTHING`,
    [assignmentId],
  );
  await queryRunner.query(
    `INSERT INTO public.attendance_record (
       internship_assignment_id, attendance_date, time_in, time_in_status
     )
     SELECT internship_assignment_id, start_date + 3, TIME '08:55', 'on_time'
       FROM public.internship_assignment
      WHERE internship_assignment_id = $1
     ON CONFLICT (internship_assignment_id, attendance_date) DO NOTHING`,
    [assignmentId],
  );
}

async function completeAssignment(
  queryRunner: QueryRunner,
  assignment: AssignmentRow,
): Promise<void> {
  let status = assignment.assignment_status;
  if (status === 'pending') {
    await queryRunner.query(
      `UPDATE public.internship_assignment SET assignment_status = 'ongoing'
        WHERE internship_assignment_id = $1`,
      [assignment.internship_assignment_id],
    );
    status = 'ongoing';
  }
  await ensureAttendance(queryRunner, assignment.internship_assignment_id);
  if (status === 'ongoing') {
    await queryRunner.query(
      `UPDATE public.internship_assignment
          SET assignment_status = 'completed', end_date = CURRENT_DATE
        WHERE internship_assignment_id = $1`,
      [assignment.internship_assignment_id],
    );
  } else if (status !== 'completed') {
    throw new Error(
      `Assignment ${assignment.internship_assignment_id} has incompatible status ${status}.`,
    );
  }
  await queryRunner.query(
    `INSERT INTO public.internship_feedback (
       internship_assignment_id, rating, feedback_text
     )
     SELECT $1, 5, $2
      WHERE NOT EXISTS (
        SELECT 1 FROM public.internship_feedback
         WHERE internship_assignment_id = $1
      )`,
    [
      assignment.internship_assignment_id,
      `${DEV_SEED_MARKER} Synthetic completed-assignment feedback.`,
    ],
  );
}

async function ensureSyntheticOAuthIdentity(
  queryRunner: QueryRunner,
  userAccountId: number,
  email: string,
): Promise<void> {
  const providerSubject = 'dev-seed-google-subject-student-two-v1';
  const rows = await queryRows<{
    user_account_id: number;
    provider_subject: string;
  }>(
    queryRunner,
    `SELECT user_account_id, provider_subject
       FROM public.oauth_identity
      WHERE authentication_provider = 'google'
        AND (user_account_id = $1 OR provider_subject = $2)`,
    [userAccountId, providerSubject],
  );
  if (rows[0]) {
    if (
      rows.length !== 1 ||
      rows[0].user_account_id !== userAccountId ||
      rows[0].provider_subject !== providerSubject
    ) {
      throw new Error(
        'Synthetic Google identity conflicts with an existing row.',
      );
    }
    return;
  }
  await queryRunner.query(
    `INSERT INTO public.oauth_identity (
       user_account_id, authentication_provider, provider_subject, provider_email
     ) VALUES ($1, 'google', $2, $3)`,
    [userAccountId, providerSubject, email],
  );
}

export async function seedDevelopmentData(
  dataSource: DataSource,
): Promise<DevelopmentSeedResult> {
  const password = requireDevelopmentSeedAccess();
  await seedReferenceData(dataSource);

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    await queryRunner.query(
      `SELECT pg_advisory_xact_lock(hashtext('internet.development-seed.v1'))`,
    );

    const adminId = await ensureAccount(
      queryRunner,
      'dev.admin@seed.invalid',
      'admin',
      password,
    );
    await setStatusActor(queryRunner, adminId);

    const studentAccountIds: number[] = [];
    const studentIds: number[] = [];
    for (const fixture of STUDENT_FIXTURES) {
      const accountId = await ensureAccount(
        queryRunner,
        fixture.email,
        'student',
        password,
      );
      studentAccountIds.push(accountId);
      const studentId = await ensureStudent(queryRunner, accountId, fixture);
      studentIds.push(studentId);
      await ensureStudentExtensions(queryRunner, studentId, fixture);
    }

    const companyAccountId = await ensureAccount(
      queryRunner,
      'dev.company@seed.invalid',
      'company',
      password,
    );
    const pesoAccountId = await ensureAccount(
      queryRunner,
      'dev.peso@seed.invalid',
      'peso_personnel',
      password,
    );

    const informationTechnologyId = await findIndustryId(
      queryRunner,
      'Information Technology',
    );
    const engineeringId = await findIndustryId(queryRunner, 'Engineering');
    const officeAdministrationId = await findIndustryId(
      queryRunner,
      'Office Administration',
    );
    const humanResourcesId = await findIndustryId(
      queryRunner,
      'Human Resources',
    );

    const companyId = await ensureCompany(
      queryRunner,
      companyAccountId,
      informationTechnologyId,
    );
    const pesoPersonnelId = await ensurePesoPersonnel(
      queryRunner,
      pesoAccountId,
    );

    await ensurePreferredIndustry(
      queryRunner,
      studentIds[0],
      informationTechnologyId,
    );
    await ensurePreferredIndustry(queryRunner, studentIds[0], engineeringId);
    await ensurePreferredIndustry(
      queryRunner,
      studentIds[1],
      officeAdministrationId,
    );
    await ensurePreferredIndustry(queryRunner, studentIds[1], humanResourcesId);

    const proofOfResidencyId = await findRequirementTypeId(
      queryRunner,
      'Proof of Residency',
    );
    const curriculumVitaeId = await findRequirementTypeId(
      queryRunner,
      'Curriculum Vitae/ Resume',
    );
    const letterOfIntentId = await findRequirementTypeId(
      queryRunner,
      'Letter of Intent',
    );
    const recommendationId = await findRequirementTypeId(
      queryRunner,
      'Recommendation Letter/ Registration Form',
    );
    await ensureRequirementSubmission(
      queryRunner,
      studentIds[0],
      proofOfResidencyId,
      'Proof of Residency',
      'student-one-proof-of-residency.pdf',
    );
    await ensureRequirementSubmission(
      queryRunner,
      studentIds[0],
      curriculumVitaeId,
      'Curriculum Vitae/ Resume',
      'student-one-cv.pdf',
    );
    await ensureRequirementSubmission(
      queryRunner,
      studentIds[1],
      letterOfIntentId,
      'Letter of Intent',
      'student-two-letter-of-intent.pdf',
    );
    await ensureRequirementSubmission(
      queryRunner,
      studentIds[1],
      recommendationId,
      'Recommendation Letter/ Registration Form',
      'student-two-recommendation.pdf',
    );

    await ensureSyntheticOAuthIdentity(
      queryRunner,
      studentAccountIds[1],
      STUDENT_FIXTURES[1].email,
    );

    const opportunityIds: number[] = [];
    for (const fixture of OPPORTUNITY_FIXTURES) {
      opportunityIds.push(
        await ensureOpportunity(queryRunner, companyId, fixture),
      );
    }

    const interviewApplication = await ensureApplication(
      queryRunner,
      studentIds[0],
      opportunityIds[0],
      `${DEV_SEED_MARKER} interview-track application`,
    );
    await transitionApplication(
      queryRunner,
      interviewApplication.application_id,
      'approved_for_referral',
    );
    const interviewReferral = await ensureReferral(
      queryRunner,
      interviewApplication.application_id,
      pesoPersonnelId,
      'interview-referral.pdf',
    );
    await advanceReferralToInterview(
      queryRunner,
      interviewReferral.referral_id,
    );
    await ensureInterview(queryRunner, interviewReferral.referral_id);

    const assignmentApplication = await ensureApplication(
      queryRunner,
      studentIds[1],
      opportunityIds[1],
      `${DEV_SEED_MARKER} assignment-track application`,
    );
    await transitionApplication(
      queryRunner,
      assignmentApplication.application_id,
      'approved_for_referral',
    );
    const assignmentReferral = await ensureReferral(
      queryRunner,
      assignmentApplication.application_id,
      pesoPersonnelId,
      'assignment-referral.pdf',
    );
    await advanceAcceptedReferral(
      queryRunner,
      assignmentReferral.referral_id,
      assignmentApplication.application_id,
    );
    const assignment = await ensureAssignment(
      queryRunner,
      assignmentReferral.referral_id,
    );
    await completeAssignment(queryRunner, assignment);

    const rejectedApplication = await ensureApplication(
      queryRunner,
      studentIds[0],
      opportunityIds[2],
      `${DEV_SEED_MARKER} rejected original application`,
    );
    await transitionApplication(
      queryRunner,
      rejectedApplication.application_id,
      'rejected_for_referral',
    );
    await ensureApplication(
      queryRunner,
      studentIds[0],
      opportunityIds[2],
      `${DEV_SEED_MARKER} valid resubmission application`,
    );

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }

  return {
    accounts: DEV_SEED_ACCOUNTS,
    passwordSource: 'DEV_SEED_PASSWORD',
  };
}
