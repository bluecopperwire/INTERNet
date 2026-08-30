import type { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { seedReferenceData } from './reference.seed';
import {
  DEV_PREFIX,
  hashDevelopmentPassword,
  setActor,
  validateDevelopmentSeedEnvironment,
} from './seed.utils';

type AccountRole = 'student' | 'company' | 'peso_personnel' | 'admin';
type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'approved_for_referral'
  | 'rejected_for_referral'
  | 'withdrawn'
  | 'expired';

type SeedIds = {
  adminAccountId: number;
  students: Record<'manual' | 'google' | 'dual', number>;
  companies: Record<'technology' | 'hospitality', number>;
  personnel: Record<'approved' | 'pending' | 'rejected', number>;
};

const canonicalAccounts = {
  student: 'student.dev@example.com',
  company: 'company.dev@example.com',
  personnel: 'peso.dev@example.com',
  admin: 'admin.dev@example.com',
} as const;

async function oneId(
  manager: EntityManager,
  sql: string,
  parameters: unknown[],
  column: string,
): Promise<number> {
  const rows = await manager.query(sql, parameters);
  if (rows.length !== 1) throw new Error(`Expected one ${column} row.`);
  return Number(rows[0][column]);
}

async function ensureAccount(
  manager: EntityManager,
  email: string,
  role: AccountRole,
): Promise<number> {
  const rows = await manager.query(
    `SELECT user_account_id, user_role, account_status, deleted_at
       FROM public.user_account
      WHERE lower(email) = lower($1)
      FOR UPDATE`,
    [email],
  );
  if (rows.length > 1) throw new Error(`Duplicate seed email: ${email}`);
  if (rows.length === 1) {
    const account = rows[0];
    if (account.user_role !== role) {
      throw new Error(
        `Seed account ${email} has role ${account.user_role}, expected ${role}.`,
      );
    }
    if (account.account_status !== 'active' || account.deleted_at !== null) {
      throw new Error(
        `Seed account ${email} is not active; refusing to bypass account workflow.`,
      );
    }
    return account.user_account_id;
  }
  return oneId(
    manager,
    `INSERT INTO public.user_account (email, user_role)
     VALUES (lower($1), $2)
     RETURNING user_account_id`,
    [email, role],
    'user_account_id',
  );
}

async function ensureLocalCredential(
  manager: EntityManager,
  accountId: number,
  passwordHash: string,
): Promise<void> {
  await manager.query(
    `INSERT INTO public.local_authentication_credential
       (user_account_id, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (user_account_id) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           password_changed_at = CURRENT_TIMESTAMP`,
    [accountId, passwordHash],
  );
}

async function removeLocalCredential(
  manager: EntityManager,
  accountId: number,
): Promise<void> {
  await manager.query(
    `DELETE FROM public.local_authentication_credential
      WHERE user_account_id = $1`,
    [accountId],
  );
}

async function ensureGoogleIdentity(
  manager: EntityManager,
  accountId: number,
  email: string,
  subject: string,
): Promise<void> {
  const conflicting = await manager.query(
    `SELECT user_account_id
       FROM public.external_authentication_identity
      WHERE authentication_provider = 'google'
        AND provider_subject = $1`,
    [subject],
  );
  if (conflicting.length && conflicting[0].user_account_id !== accountId) {
    throw new Error(`Synthetic Google subject ${subject} is already in use.`);
  }
  await manager.query(
    `INSERT INTO public.external_authentication_identity
       (user_account_id, authentication_provider, provider_subject, provider_email)
     VALUES ($1, 'google', $2, lower($3))
     ON CONFLICT (user_account_id, authentication_provider) DO UPDATE
       SET provider_subject = EXCLUDED.provider_subject,
           provider_email = EXCLUDED.provider_email`,
    [accountId, subject, email],
  );
}

async function removeGoogleIdentity(
  manager: EntityManager,
  accountId: number,
): Promise<void> {
  await manager.query(
    `DELETE FROM public.external_authentication_identity
      WHERE user_account_id = $1 AND authentication_provider = 'google'`,
    [accountId],
  );
}

async function assertAccountProfileShape(
  manager: EntityManager,
  accountId: number,
  expectedRole: AccountRole,
): Promise<void> {
  const rows: Array<Record<'student' | 'company' | 'peso_personnel', boolean>> =
    await manager.query(
      `SELECT
       EXISTS (SELECT 1 FROM public.student WHERE user_account_id = $1) AS student,
       EXISTS (SELECT 1 FROM public.company WHERE user_account_id = $1) AS company,
       EXISTS (SELECT 1 FROM public.peso_personnel WHERE user_account_id = $1) AS peso_personnel`,
      [accountId],
    );
  const profiles = rows[0];
  const expectedProfile = expectedRole === 'admin' ? null : expectedRole;
  const actualProfiles = (
    ['student', 'company', 'peso_personnel'] as const
  ).filter((profile) => profiles[profile]);
  if (
    actualProfiles.length > (expectedProfile ? 1 : 0) ||
    (actualProfiles.length === 1 && actualProfiles[0] !== expectedProfile)
  ) {
    throw new Error(
      `Seed account ${accountId} has profile collision (${actualProfiles.join(', ') || 'none'}), expected ${expectedProfile || 'no profile'}.`,
    );
  }
}

async function industryId(
  manager: EntityManager,
  name: string,
): Promise<number> {
  return oneId(
    manager,
    `SELECT industry_id FROM public.industry WHERE industry_name = $1`,
    [name],
    'industry_id',
  );
}

async function ensureStudent(
  manager: EntityManager,
  accountId: number,
  key: 'manual' | 'google' | 'dual',
  industryName: string,
): Promise<number> {
  const names = {
    manual: ['Manuel', 'Local'],
    google: ['Gina', 'Google'],
    dual: ['Dina', 'Dual'],
  } as const;
  const [firstName, lastName] = names[key];
  const email = `student.${key}@internet.local`;
  const studentId = await oneId(
    manager,
    `INSERT INTO public.student
       (user_account_id, first_name, last_name, sex, birth_date,
        contact_number, contact_email, address_line, address_barangay,
        address_district, address_city, inquiry_method, photo_file_path)
     VALUES ($1, $2, $3, 'Prefer not to say', DATE '2002-01-15',
             $4, $5, '100 Development Street', 'Central', 'District 1',
             'Quezon City', 'online', $6)
     ON CONFLICT (user_account_id) DO UPDATE SET
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       contact_number = EXCLUDED.contact_number,
       contact_email = EXCLUDED.contact_email,
       photo_file_path = EXCLUDED.photo_file_path
     RETURNING student_id`,
    [
      accountId,
      firstName,
      lastName,
      `0917000000${key === 'manual' ? '1' : key === 'google' ? '2' : '3'}`,
      email,
      `${DEV_PREFIX}students/${key}/photo.jpg`,
    ],
    'student_id',
  );
  await manager.query(
    `INSERT INTO public.student_academic_information
       (student_id, school_name, year_level, strand_program)
     VALUES ($1, 'Development State University', 'fourth_year_college',
             'Bachelor of Science in Information Systems')
     ON CONFLICT (student_id) DO UPDATE SET
       school_name = EXCLUDED.school_name,
       year_level = EXCLUDED.year_level,
       strand_program = EXCLUDED.strand_program`,
    [studentId],
  );
  await manager.query(
    `INSERT INTO public.internship_preference
       (student_id, required_hours, available_days,
        allows_outside_preferred_field, start_date, preferred_company_type)
     VALUES ($1, 400, 'weekdays', true, CURRENT_DATE + 14, 'private')
     ON CONFLICT (student_id) DO UPDATE SET
       required_hours = EXCLUDED.required_hours,
       available_days = EXCLUDED.available_days,
       allows_outside_preferred_field = EXCLUDED.allows_outside_preferred_field,
       start_date = EXCLUDED.start_date,
       preferred_company_type = EXCLUDED.preferred_company_type`,
    [studentId],
  );
  await manager.query(
    `INSERT INTO public.student_preferred_industry (student_id, industry_id)
     VALUES ($1, $2)
     ON CONFLICT (student_id, industry_id) DO NOTHING`,
    [studentId, await industryId(manager, industryName)],
  );
  return studentId;
}

async function ensureCompany(
  manager: EntityManager,
  accountId: number,
  key: 'technology' | 'hospitality',
): Promise<number> {
  const technology = key === 'technology';
  const email = `company.${key}@internet.local`;
  return oneId(
    manager,
    `INSERT INTO public.company
       (user_account_id, industry_id, company_name, company_type, description,
        website_url, year_established, company_size, contact_email,
        contact_number, contact_person_first_name, contact_person_last_name,
        address_line, address_barangay, address_district, address_city,
        logo_file_path)
     VALUES ($1, $2, $3, 'private', $4, $5, 2018, $6, $7, $8,
             $9, $10, '200 Development Avenue', 'Central', 'District 1',
             'Quezon City', $11)
     ON CONFLICT (user_account_id) DO UPDATE SET
       industry_id = EXCLUDED.industry_id,
       company_name = EXCLUDED.company_name,
       description = EXCLUDED.description,
       contact_email = EXCLUDED.contact_email,
       logo_file_path = EXCLUDED.logo_file_path
     RETURNING company_id`,
    [
      accountId,
      await industryId(
        manager,
        technology ? 'Information Technology' : 'Hospitality/ Tourism',
      ),
      technology ? 'DevSeed Technology Corp.' : 'DevSeed Hospitality Inc.',
      technology
        ? 'Synthetic technology employer for local development.'
        : 'Synthetic hospitality employer for local development.',
      technology ? 'https://tech.dev-seed.invalid' : null,
      technology ? 120 : 80,
      email,
      technology ? '0210000001' : '0210000002',
      technology ? 'Terry' : 'Holly',
      technology ? 'Technologist' : 'Host',
      `${DEV_PREFIX}companies/${key}/logo.png`,
    ],
    'company_id',
  );
}

async function ensurePersonnel(
  manager: EntityManager,
  accountId: number,
  key: 'approved' | 'pending' | 'rejected',
): Promise<number> {
  const firstNames = { approved: 'April', pending: 'Penny', rejected: 'Rex' };
  return oneId(
    manager,
    `INSERT INTO public.peso_personnel
       (user_account_id, first_name, last_name, sex, birth_date, address_line,
        address_barangay, address_district, address_city, contact_number,
        contact_email, employee_id, position, department, photo_file_path)
     VALUES ($1, $2, 'Personnel', 'Prefer not to say', DATE '1990-06-15',
             '300 Development Road', 'Central', 'District 1', 'Quezon City',
             $3, $4, $5, 'Employment Officer', 'QC PESO', $6)
     ON CONFLICT (user_account_id) DO UPDATE SET
       first_name = EXCLUDED.first_name,
       contact_number = EXCLUDED.contact_number,
       contact_email = EXCLUDED.contact_email,
       photo_file_path = EXCLUDED.photo_file_path
     RETURNING peso_personnel_id`,
    [
      accountId,
      firstNames[key],
      `0918000000${key === 'approved' ? '1' : key === 'pending' ? '2' : '3'}`,
      `peso.${key}@internet.local`,
      `DEV-PESO-${key.toUpperCase()}`,
      `${DEV_PREFIX}peso/${key}/photo.jpg`,
    ],
    'peso_personnel_id',
  );
}

async function ensureCanonicalStudent(
  manager: EntityManager,
  accountId: number,
): Promise<void> {
  await assertAccountProfileShape(manager, accountId, 'student');
  const studentId = await oneId(
    manager,
    `INSERT INTO public.student
       (user_account_id, first_name, middle_name, last_name, extension_name, sex,
        birth_date, contact_number, contact_email, linkedin_url, address_line,
        address_barangay, address_district, address_city, inquiry_method, photo_file_path)
     VALUES ($1, 'Dev', NULL, 'Student', NULL, 'Prefer not to say', DATE '2002-01-15',
             '09170000100', $2, NULL, '100 Development Street', 'Central',
             'District 1', 'Quezon City', 'online', $3)
     ON CONFLICT (user_account_id) DO UPDATE SET
       first_name = EXCLUDED.first_name, middle_name = EXCLUDED.middle_name,
       last_name = EXCLUDED.last_name, extension_name = EXCLUDED.extension_name,
       sex = EXCLUDED.sex, birth_date = EXCLUDED.birth_date,
       contact_number = EXCLUDED.contact_number, contact_email = EXCLUDED.contact_email,
       linkedin_url = EXCLUDED.linkedin_url, address_line = EXCLUDED.address_line,
       address_barangay = EXCLUDED.address_barangay,
       address_district = EXCLUDED.address_district, address_city = EXCLUDED.address_city,
       inquiry_method = EXCLUDED.inquiry_method, photo_file_path = EXCLUDED.photo_file_path
     RETURNING student_id`,
    [
      accountId,
      canonicalAccounts.student,
      `${DEV_PREFIX}students/canonical/photo.jpg`,
    ],
    'student_id',
  );
  await manager.query(
    `INSERT INTO public.student_academic_information
       (student_id, school_name, year_level, strand_program)
     VALUES ($1, 'Development State University', 'fourth_year_college',
             'Bachelor of Science in Information Systems')
     ON CONFLICT (student_id) DO UPDATE SET school_name = EXCLUDED.school_name,
       year_level = EXCLUDED.year_level, strand_program = EXCLUDED.strand_program`,
    [studentId],
  );
  await manager.query(
    `INSERT INTO public.internship_preference
       (student_id, required_hours, available_days, allows_outside_preferred_field,
        start_date, preferred_company_type)
     VALUES ($1, 400, 'weekdays', true, CURRENT_DATE + 14, 'private')
     ON CONFLICT (student_id) DO UPDATE SET required_hours = EXCLUDED.required_hours,
       available_days = EXCLUDED.available_days,
       allows_outside_preferred_field = EXCLUDED.allows_outside_preferred_field,
       start_date = EXCLUDED.start_date,
       preferred_company_type = EXCLUDED.preferred_company_type`,
    [studentId],
  );
  const informationTechnologyId = await industryId(
    manager,
    'Information Technology',
  );
  await manager.query(
    `INSERT INTO public.student_preferred_industry (student_id, industry_id)
     VALUES ($1, $2) ON CONFLICT (student_id, industry_id) DO NOTHING`,
    [studentId, informationTechnologyId],
  );
}

async function ensureCanonicalCompany(
  manager: EntityManager,
  accountId: number,
): Promise<void> {
  await assertAccountProfileShape(manager, accountId, 'company');
  await manager.query(
    `INSERT INTO public.company
       (user_account_id, industry_id, company_name, company_type, description,
        website_url, year_established, company_size, contact_email, contact_number,
        contact_person_first_name, contact_person_middle_name, contact_person_last_name,
        contact_person_extension_name, address_line, address_barangay, address_district,
        address_city, logo_file_path)
     VALUES ($1, $2, 'DevSeed Canonical Company', 'private',
             'Canonical local-login development company.', 'https://company.dev-seed.invalid',
             2018, 100, $3, '0210000100', 'Casey', NULL, 'Company', NULL,
             '200 Development Avenue', 'Central', 'District 1', 'Quezon City', $4)
     ON CONFLICT (user_account_id) DO UPDATE SET industry_id = EXCLUDED.industry_id,
       company_name = EXCLUDED.company_name, company_type = EXCLUDED.company_type,
       description = EXCLUDED.description, website_url = EXCLUDED.website_url,
       year_established = EXCLUDED.year_established, company_size = EXCLUDED.company_size,
       contact_email = EXCLUDED.contact_email, contact_number = EXCLUDED.contact_number,
       contact_person_first_name = EXCLUDED.contact_person_first_name,
       contact_person_middle_name = EXCLUDED.contact_person_middle_name,
       contact_person_last_name = EXCLUDED.contact_person_last_name,
       contact_person_extension_name = EXCLUDED.contact_person_extension_name,
       address_line = EXCLUDED.address_line, address_barangay = EXCLUDED.address_barangay,
       address_district = EXCLUDED.address_district, address_city = EXCLUDED.address_city,
       logo_file_path = EXCLUDED.logo_file_path`,
    [
      accountId,
      await industryId(manager, 'Information Technology'),
      canonicalAccounts.company,
      `${DEV_PREFIX}companies/canonical/logo.png`,
    ],
  );
}

async function ensureCanonicalPersonnel(
  manager: EntityManager,
  accountId: number,
): Promise<void> {
  await assertAccountProfileShape(manager, accountId, 'peso_personnel');
  await manager.query(
    `INSERT INTO public.peso_personnel
       (user_account_id, first_name, middle_name, last_name, extension_name, sex,
        birth_date, address_line, address_barangay, address_district, address_city,
        contact_number, contact_email, employee_id, position, department,
        photo_file_path)
     VALUES ($1, 'Dev', NULL, 'Personnel', NULL, 'Prefer not to say', DATE '1990-06-15',
             '300 Development Road', 'Central', 'District 1', 'Quezon City',
             '09180000100', $2, 'DEV-PESO-CANONICAL', 'Employment Officer', 'QC PESO',
             $3)
     ON CONFLICT (user_account_id) DO UPDATE SET first_name = EXCLUDED.first_name,
       middle_name = EXCLUDED.middle_name, last_name = EXCLUDED.last_name,
       extension_name = EXCLUDED.extension_name, sex = EXCLUDED.sex,
       birth_date = EXCLUDED.birth_date, address_line = EXCLUDED.address_line,
       address_barangay = EXCLUDED.address_barangay,
       address_district = EXCLUDED.address_district, address_city = EXCLUDED.address_city,
       contact_number = EXCLUDED.contact_number, contact_email = EXCLUDED.contact_email,
       employee_id = EXCLUDED.employee_id, position = EXCLUDED.position,
       department = EXCLUDED.department, photo_file_path = EXCLUDED.photo_file_path`,
    [
      accountId,
      canonicalAccounts.personnel,
      `${DEV_PREFIX}peso/canonical/photo.jpg`,
    ],
  );
}

async function seedAccounts(
  dataSource: DataSource,
  passwordHash: string,
): Promise<SeedIds> {
  return dataSource.transaction(async (manager) => {
    const seedOwnedAccountIds: number[] = [];
    for (const [role, email] of Object.entries(canonicalAccounts) as Array<
      [keyof typeof canonicalAccounts, string]
    >) {
      const accountRole: AccountRole =
        role === 'personnel' ? 'peso_personnel' : role;
      const accountId = await ensureAccount(manager, email, accountRole);
      await ensureLocalCredential(manager, accountId, passwordHash);
      await removeGoogleIdentity(manager, accountId);
      if (role === 'student') await ensureCanonicalStudent(manager, accountId);
      else if (role === 'company')
        await ensureCanonicalCompany(manager, accountId);
      else if (role === 'personnel')
        await ensureCanonicalPersonnel(manager, accountId);
      else await assertAccountProfileShape(manager, accountId, 'admin');
      seedOwnedAccountIds.push(accountId);
    }

    const adminAccountId = await ensureAccount(
      manager,
      'admin.dev@internet.local',
      'admin',
    );
    seedOwnedAccountIds.push(adminAccountId);
    await ensureLocalCredential(manager, adminAccountId, passwordHash);
    await removeGoogleIdentity(manager, adminAccountId);

    const students = {} as SeedIds['students'];
    for (const key of ['manual', 'google', 'dual'] as const) {
      const email = `student.${key}@internet.local`;
      const accountId = await ensureAccount(manager, email, 'student');
      if (key === 'google') await removeLocalCredential(manager, accountId);
      else await ensureLocalCredential(manager, accountId, passwordHash);
      if (key === 'manual') await removeGoogleIdentity(manager, accountId);
      else
        await ensureGoogleIdentity(
          manager,
          accountId,
          email,
          `dev-seed-google-${key}-v1`,
        );
      seedOwnedAccountIds.push(accountId);
      students[key] = await ensureStudent(
        manager,
        accountId,
        key,
        key === 'google' ? 'Hospitality/ Tourism' : 'Information Technology',
      );
    }

    const companies = {} as SeedIds['companies'];
    for (const key of ['technology', 'hospitality'] as const) {
      const email = `company.${key === 'technology' ? 'tech' : key}@internet.local`;
      const accountId = await ensureAccount(manager, email, 'company');
      await ensureLocalCredential(manager, accountId, passwordHash);
      await removeGoogleIdentity(manager, accountId);
      seedOwnedAccountIds.push(accountId);
      companies[key] = await ensureCompany(manager, accountId, key);
    }

    const personnel = {} as SeedIds['personnel'];
    for (const key of ['approved', 'pending', 'rejected'] as const) {
      const email = `peso.${key}@internet.local`;
      const accountId = await ensureAccount(manager, email, 'peso_personnel');
      await ensureLocalCredential(manager, accountId, passwordHash);
      await removeGoogleIdentity(manager, accountId);
      seedOwnedAccountIds.push(accountId);
      personnel[key] = await ensurePersonnel(manager, accountId, key);
    }

    await manager.query(
      `DELETE FROM public.authentication_session
        WHERE user_account_id = ANY($1::integer[])`,
      [seedOwnedAccountIds],
    );
    await manager.query(
      `DELETE FROM public.registration_onboarding
        WHERE verified_email = ANY($1::text[])`,
      [Object.values(canonicalAccounts)],
    );

    return { adminAccountId, students, companies, personnel };
  });
}

async function ensureOpportunity(
  manager: EntityManager,
  companyId: number,
  title: string,
  arrangement: 'onsite' | 'remote' | 'hybrid',
  hasAllowance: boolean,
  minimumRequiredHours: number,
  offeredSlots: number,
): Promise<number> {
  const existing = await manager.query(
    `SELECT opportunity_id FROM public.opportunity
      WHERE company_id = $1 AND title = $2 FOR UPDATE`,
    [companyId, title],
  );
  if (existing.length > 1)
    throw new Error(`Duplicate seed opportunity: ${title}`);
  if (existing.length === 1) {
    await manager.query(
      `UPDATE public.opportunity
          SET work_arrangement = $2,
              allowance = $3,
              minimum_required_hours = $4,
              offered_slots = $5
        WHERE opportunity_id = $1`,
      [
        existing[0].opportunity_id,
        arrangement,
        hasAllowance ? 'PHP 5,000 monthly' : null,
        minimumRequiredHours,
        offeredSlots,
      ],
    );
    return existing[0].opportunity_id;
  }
  return oneId(
    manager,
    `INSERT INTO public.opportunity
       (company_id, title, department, description, qualification,
        allowance, minimum_required_hours, work_arrangement,
        offered_slots, application_deadline)
     VALUES ($1, $2, 'Development Department', $3,
             'Synthetic development applicants only.', $4, $5, $6, $7,
             CURRENT_TIMESTAMP + INTERVAL '365 days')
     RETURNING opportunity_id`,
    [
      companyId,
      title,
      `Synthetic ${title} used only for development and tests.`,
      hasAllowance ? 'PHP 5,000 monthly' : null,
      minimumRequiredHours,
      arrangement,
      offeredSlots,
    ],
    'opportunity_id',
  );
}

async function transitionApplication(
  runner: QueryRunner,
  applicationId: number,
  desired: ApplicationStatus,
): Promise<void> {
  const paths: Record<ApplicationStatus, ApplicationStatus[]> = {
    submitted: [],
    under_review: ['under_review'],
    approved_for_referral: ['under_review', 'approved_for_referral'],
    rejected_for_referral: ['under_review', 'rejected_for_referral'],
    withdrawn: ['withdrawn'],
    expired: ['expired'],
  };
  for (const status of paths[desired]) {
    await runner.query(
      `UPDATE public.application SET application_status = $2
        WHERE application_id = $1`,
      [applicationId, status],
    );
  }
}

async function ensureApplication(
  runner: QueryRunner,
  studentId: number,
  opportunityId: number,
  desired: ApplicationStatus,
  adminAccountId: number,
): Promise<number> {
  const exact = (await runner.query(
    `SELECT application_id FROM public.application
      WHERE student_id = $1 AND opportunity_id = $2
        AND application_status = $3
      ORDER BY application_id LIMIT 1`,
    [studentId, opportunityId, desired],
  )) as Array<{ application_id: number }>;
  if (exact.length) return exact[0].application_id;

  const active = (await runner.query(
    `SELECT application_id, application_status FROM public.application
      WHERE student_id = $1 AND opportunity_id = $2
        AND application_status IN ('submitted', 'under_review', 'approved_for_referral')
      ORDER BY application_id LIMIT 1`,
    [studentId, opportunityId],
  )) as Array<{
    application_id: number;
    application_status: ApplicationStatus;
  }>;

  if (active.length) {
    const app = active[0];
    const canTransition: Record<string, string[]> = {
      submitted: ['under_review', 'withdrawn', 'expired'],
      under_review: [
        'approved_for_referral',
        'rejected_for_referral',
        'withdrawn',
        'expired',
      ],
    };
    if (canTransition[app.application_status]?.includes(desired)) {
      await setActor(runner, adminAccountId);
      await transitionApplication(runner, app.application_id, desired);
    }
    return app.application_id;
  }

  await setActor(runner, adminAccountId);
  const applicationId = await oneId(
    runner.manager,
    `INSERT INTO public.application (student_id, opportunity_id, remark)
     VALUES ($1, $2, $3) RETURNING application_id`,
    [studentId, opportunityId, `${DEV_PREFIX}${desired}`],
    'application_id',
  );
  await transitionApplication(runner, applicationId, desired);
  return applicationId;
}

async function ensureReferral(
  manager: EntityManager,
  applicationId: number,
  personnelId: number,
): Promise<number> {
  return oneId(
    manager,
    `INSERT INTO public.referral
       (application_id, peso_personnel_id, referral_document_file_path)
     VALUES ($1, $2, $3)
     ON CONFLICT (application_id) DO UPDATE SET
       referral_document_file_path = EXCLUDED.referral_document_file_path
     RETURNING referral_id`,
    [applicationId, personnelId, `${DEV_PREFIX}referrals/${applicationId}.pdf`],
    'referral_id',
  );
}

async function setReferralResponse(
  runner: QueryRunner,
  referralId: number,
  response: 'pending' | 'for_interview' | 'accepted' | 'rejected',
  adminAccountId: number,
): Promise<void> {
  const rows = (await runner.query(
    `SELECT referral_status, company_response FROM public.referral
      WHERE referral_id = $1 FOR UPDATE`,
    [referralId],
  )) as Array<{ referral_status: string; company_response: string }>;
  const current = rows[0];
  if (!current || current.company_response === response) return;
  if (current.company_response !== 'pending') {
    throw new Error(`Referral ${referralId} has unexpected response state.`);
  }
  await setActor(runner, adminAccountId);
  if (response === 'for_interview') {
    await runner.query(
      `UPDATE public.referral
          SET referral_status = 'under_review', company_response = $2,
              company_responded_at = CURRENT_TIMESTAMP
        WHERE referral_id = $1`,
      [referralId, response],
    );
  } else if (response === 'accepted') {
    await runner.query(
      `UPDATE public.referral
          SET referral_status = 'under_review', company_response = $2,
              company_responded_at = CURRENT_TIMESTAMP
        WHERE referral_id = $1`,
      [referralId, response],
    );
    await runner.query(
      `UPDATE public.application a
          SET student_response = 'accepted', student_responded_at = CURRENT_TIMESTAMP
         FROM public.referral r
        WHERE r.referral_id = $1 AND a.application_id = r.application_id`,
      [referralId],
    );
  } else if (response === 'rejected') {
    await runner.query(
      `UPDATE public.referral
          SET referral_status = 'under_review', company_response = $2,
              company_responded_at = CURRENT_TIMESTAMP
        WHERE referral_id = $1`,
      [referralId, response],
    );
    await runner.query(
      `UPDATE public.referral SET referral_status = 'closed'
        WHERE referral_id = $1`,
      [referralId],
    );
  }
}

async function ensureInterview(
  manager: EntityManager,
  referralId: number,
  mode: 'physical' | 'online',
): Promise<void> {
  await manager.query(
    `INSERT INTO public.interview
       (referral_id, scheduled_at, interview_mode, physical_location,
        online_meeting_url, remark)
     VALUES ($1, CURRENT_TIMESTAMP + INTERVAL '30 days', $2, $3, $4,
             'Synthetic upcoming interview.')
     ON CONFLICT (referral_id) DO UPDATE SET
       interview_mode = EXCLUDED.interview_mode,
       physical_location = EXCLUDED.physical_location,
       online_meeting_url = EXCLUDED.online_meeting_url`,
    [
      referralId,
      mode,
      mode === 'physical' ? 'DevSeed Office, Quezon City' : null,
      mode === 'online' ? 'https://meet.dev-seed.invalid/interview' : null,
    ],
  );
}

async function ensureAssignment(
  runner: QueryRunner,
  referralId: number,
  desired: 'pending' | 'ongoing' | 'completed',
  adminAccountId: number,
): Promise<number> {
  const existing = (await runner.query(
    `SELECT internship_assignment_id, assignment_status
       FROM public.internship_assignment WHERE referral_id = $1 FOR UPDATE`,
    [referralId],
  )) as Array<{
    internship_assignment_id: number;
    assignment_status: string;
  }>;
  let assignmentId: number;
  let status: string;
  if (existing.length) {
    assignmentId = existing[0].internship_assignment_id;
    status = existing[0].assignment_status;
  } else {
    const startDateSql =
      desired === 'pending' ? 'CURRENT_DATE + 14' : 'CURRENT_DATE - 30';
    assignmentId = await oneId(
      runner.manager,
      `INSERT INTO public.internship_assignment
         (referral_id, required_hours, start_date, expected_end_date,
          working_days, start_shift, end_shift)
       VALUES ($1, 400, ${startDateSql}, CURRENT_DATE + 90,
               'weekdays', TIME '09:00', TIME '17:00')
       RETURNING internship_assignment_id`,
      [referralId],
      'internship_assignment_id',
    );
    status = 'pending';
  }
  await setActor(runner, adminAccountId);
  if (
    (desired === 'ongoing' || desired === 'completed') &&
    status === 'pending'
  ) {
    await runner.query(
      `UPDATE public.internship_assignment SET assignment_status = 'ongoing'
        WHERE internship_assignment_id = $1`,
      [assignmentId],
    );
    status = 'ongoing';
  }
  if (desired === 'completed' && status === 'ongoing') {
    await runner.query(
      `UPDATE public.internship_assignment
          SET assignment_status = 'completed', end_date = CURRENT_DATE
        WHERE internship_assignment_id = $1`,
      [assignmentId],
    );
  }
  return assignmentId;
}

async function seedDomain(dataSource: DataSource, ids: SeedIds): Promise<void> {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    const openTechnology = await ensureOpportunity(
      runner.manager,
      ids.companies.technology,
      'DEV Open Technology Internship',
      'hybrid',
      true,
      400,
      5,
    );
    const closedService = await ensureOpportunity(
      runner.manager,
      ids.companies.technology,
      'DEV Closed Customer Service Internship',
      'onsite',
      false,
      240,
      3,
    );
    const archivedHospitality = await ensureOpportunity(
      runner.manager,
      ids.companies.hospitality,
      'DEV Archived Hospitality Internship',
      'onsite',
      true,
      300,
      4,
    );
    const remoteHealthcare = await ensureOpportunity(
      runner.manager,
      ids.companies.hospitality,
      'DEV Remote Healthcare Internship',
      'remote',
      false,
      200,
      2,
    );
    const engineering = await ensureOpportunity(
      runner.manager,
      ids.companies.technology,
      'DEV Engineering Internship',
      'onsite',
      true,
      500,
      6,
    );

    await ensureApplication(
      runner,
      ids.students.manual,
      openTechnology,
      'submitted',
      ids.adminAccountId,
    );
    await ensureApplication(
      runner,
      ids.students.google,
      openTechnology,
      'under_review',
      ids.adminAccountId,
    );
    const pendingReferralApplication = await ensureApplication(
      runner,
      ids.students.dual,
      openTechnology,
      'approved_for_referral',
      ids.adminAccountId,
    );
    await ensureApplication(
      runner,
      ids.students.manual,
      closedService,
      'rejected_for_referral',
      ids.adminAccountId,
    );
    await ensureApplication(
      runner,
      ids.students.manual,
      closedService,
      'submitted',
      ids.adminAccountId,
    );
    await ensureApplication(
      runner,
      ids.students.google,
      closedService,
      'withdrawn',
      ids.adminAccountId,
    );
    await ensureApplication(
      runner,
      ids.students.dual,
      closedService,
      'expired',
      ids.adminAccountId,
    );

    const physicalApplication = await ensureApplication(
      runner,
      ids.students.manual,
      archivedHospitality,
      'approved_for_referral',
      ids.adminAccountId,
    );
    const onlineApplication = await ensureApplication(
      runner,
      ids.students.google,
      archivedHospitality,
      'approved_for_referral',
      ids.adminAccountId,
    );
    const rejectedReferralApplication = await ensureApplication(
      runner,
      ids.students.dual,
      remoteHealthcare,
      'approved_for_referral',
      ids.adminAccountId,
    );
    const pendingAssignmentApplication = await ensureApplication(
      runner,
      ids.students.manual,
      remoteHealthcare,
      'approved_for_referral',
      ids.adminAccountId,
    );
    const ongoingAssignmentApplication = await ensureApplication(
      runner,
      ids.students.google,
      remoteHealthcare,
      'approved_for_referral',
      ids.adminAccountId,
    );
    const completedAssignmentApplication = await ensureApplication(
      runner,
      ids.students.dual,
      engineering,
      'approved_for_referral',
      ids.adminAccountId,
    );

    const pendingReferral = await ensureReferral(
      runner.manager,
      pendingReferralApplication,
      ids.personnel.approved,
    );
    const physicalReferral = await ensureReferral(
      runner.manager,
      physicalApplication,
      ids.personnel.approved,
    );
    const onlineReferral = await ensureReferral(
      runner.manager,
      onlineApplication,
      ids.personnel.approved,
    );
    const rejectedReferral = await ensureReferral(
      runner.manager,
      rejectedReferralApplication,
      ids.personnel.approved,
    );
    const pendingAssignmentReferral = await ensureReferral(
      runner.manager,
      pendingAssignmentApplication,
      ids.personnel.approved,
    );
    const ongoingAssignmentReferral = await ensureReferral(
      runner.manager,
      ongoingAssignmentApplication,
      ids.personnel.approved,
    );
    const completedAssignmentReferral = await ensureReferral(
      runner.manager,
      completedAssignmentApplication,
      ids.personnel.approved,
    );

    await setReferralResponse(
      runner,
      pendingReferral,
      'pending',
      ids.adminAccountId,
    );
    await setReferralResponse(
      runner,
      physicalReferral,
      'for_interview',
      ids.adminAccountId,
    );
    await setReferralResponse(
      runner,
      onlineReferral,
      'for_interview',
      ids.adminAccountId,
    );
    await setReferralResponse(
      runner,
      rejectedReferral,
      'rejected',
      ids.adminAccountId,
    );
    for (const referralId of [
      pendingAssignmentReferral,
      ongoingAssignmentReferral,
      completedAssignmentReferral,
    ]) {
      await setReferralResponse(
        runner,
        referralId,
        'accepted',
        ids.adminAccountId,
      );
    }
    await ensureInterview(runner.manager, physicalReferral, 'physical');
    await ensureInterview(runner.manager, onlineReferral, 'online');

    await ensureAssignment(
      runner,
      pendingAssignmentReferral,
      'pending',
      ids.adminAccountId,
    );
    const ongoingAssignment = await ensureAssignment(
      runner,
      ongoingAssignmentReferral,
      'ongoing',
      ids.adminAccountId,
    );
    const completedAssignment = await ensureAssignment(
      runner,
      completedAssignmentReferral,
      'completed',
      ids.adminAccountId,
    );

    const attendance = [
      [-4, '09:00', '17:00', `${DEV_PREFIX}attendance/on-time.jpg`],
      [-3, '09:30', '16:00', `${DEV_PREFIX}attendance/late.jpg`],
      [-2, '08:45', '18:00', `${DEV_PREFIX}attendance/overtime.jpg`],
      [-1, '09:15', null, `${DEV_PREFIX}attendance/incomplete.jpg`],
    ] as const;
    await runner.query(
      `DELETE FROM public.attendance_record
        WHERE internship_assignment_id = $1
          AND photo_file_path LIKE 'dev-seed/%'`,
      [ongoingAssignment],
    );
    for (const [dayOffset, timeIn, timeOut, photoPath] of attendance) {
      await runner.query(
        `INSERT INTO public.attendance_record
           (internship_assignment_id, attendance_date, time_in,
            time_in_status, time_out, rendered_hours_status, photo_file_path)
         VALUES ($1, CURRENT_DATE + $2::integer, $3, 'on_time', $4, 'incomplete', $5)
         ON CONFLICT (internship_assignment_id, attendance_date) DO UPDATE SET
           time_in = EXCLUDED.time_in,
           time_out = EXCLUDED.time_out,
           photo_file_path = EXCLUDED.photo_file_path`,
        [ongoingAssignment, dayOffset, timeIn, timeOut, photoPath],
      );
    }
    await runner.query(
      `INSERT INTO public.internship_feedback
         (internship_assignment_id, rating, feedback_text)
       VALUES ($1, 5, 'Synthetic positive completion feedback.')
       ON CONFLICT (internship_assignment_id) DO UPDATE SET
         rating = EXCLUDED.rating, feedback_text = EXCLUDED.feedback_text`,
      [completedAssignment],
    );

    const opportunityRows = (await runner.query(
      `SELECT opportunity_id, opportunity_status FROM public.opportunity
        WHERE opportunity_id = ANY($1::integer[]) FOR UPDATE`,
      [[closedService, archivedHospitality]],
    )) as Array<{ opportunity_id: number; opportunity_status: string }>;
    await setActor(runner, ids.adminAccountId);
    for (const opportunity of opportunityRows) {
      if (
        opportunity.opportunity_id === closedService &&
        opportunity.opportunity_status === 'open'
      ) {
        await runner.query(
          `UPDATE public.opportunity SET opportunity_status = 'closed'
            WHERE opportunity_id = $1`,
          [closedService],
        );
      }
      if (opportunity.opportunity_id === archivedHospitality) {
        if (opportunity.opportunity_status === 'open') {
          await runner.query(
            `UPDATE public.opportunity SET opportunity_status = 'closed'
              WHERE opportunity_id = $1`,
            [archivedHospitality],
          );
          opportunity.opportunity_status = 'closed';
        }
        if (opportunity.opportunity_status === 'closed') {
          await runner.query(
            `UPDATE public.opportunity SET opportunity_status = 'archived'
              WHERE opportunity_id = $1`,
            [archivedHospitality],
          );
        }
      }
    }
    await runner.commitTransaction();
  } catch (error) {
    await runner.rollbackTransaction();
    throw error;
  } finally {
    await runner.release();
  }
}

export async function seedDevelopmentData(
  dataSource: DataSource,
): Promise<void> {
  const password = validateDevelopmentSeedEnvironment();
  await seedReferenceData(dataSource);
  const passwordHash = await hashDevelopmentPassword(password);
  const ids = await seedAccounts(dataSource, passwordHash);
  await seedDomain(dataSource, ids);
  console.log(
    'Development seed completed (13 accounts; no sessions/onboarding).',
  );
  console.log('Usable development accounts (password: DEV_SEED_PASSWORD):');
  console.log('- student.dev@example.com | student | active | local');
  console.log('- company.dev@example.com | company | active | local');
  console.log('- peso.dev@example.com | peso_personnel | active | local');
  console.log('- admin.dev@example.com | admin | active | local');
  console.log('- admin.dev@internet.local | admin | active | local');
  console.log('- student.manual@internet.local | student | active | local');
  console.log(
    '- student.google@internet.local | student | active | Google only',
  );
  console.log(
    '- student.dual@internet.local | student | active | local + Google',
  );
  console.log('- company.tech@internet.local | company | active | local');
  console.log(
    '- company.hospitality@internet.local | company | active | local',
  );
  console.log(
    '- peso.approved@internet.local | peso_personnel | active | local',
  );
  console.log(
    '- peso.pending@internet.local | peso_personnel | active | local',
  );
  console.log(
    '- peso.rejected@internet.local | peso_personnel | active | local',
  );
}
