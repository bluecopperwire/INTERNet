require('dotenv').config();
require('ts-node/register/transpile-only');
const bcrypt = require('bcrypt');
const { Client } = require('pg');
const {
  DEVELOPMENT_COMPANY_FIXTURES,
  DEVELOPMENT_STUDENT_FIXTURES,
  DEVELOPMENT_WORKFLOW_TIMELINE,
} = require('../../src/database/seeds/development.seed.fixtures.ts');

const legacySeedOwnedEmails = [
  'student.dev@example.com',
  'company.dev@example.com',
  'peso.dev@example.com',
  'admin.dev@example.com',
  'admin.dev@internet.local',
  'student.manual@internet.local',
  'student.google@internet.local',
  'student.dual@internet.local',
  'company.tech@internet.local',
  'company.hospitality@internet.local',
  'peso.approved@internet.local',
  'peso.pending@internet.local',
  'peso.rejected@internet.local',
];
const newCompanyEmails = DEVELOPMENT_COMPANY_FIXTURES.map(
  (fixture) => fixture.loginEmail,
);
const newStudentEmails = DEVELOPMENT_STUDENT_FIXTURES.map(
  (fixture) => fixture.loginEmail,
);
const newLocalEmails = [...newCompanyEmails, ...newStudentEmails];
const seedOwnedEmails = [...legacySeedOwnedEmails, ...newLocalEmails];

const approvedIndustries = [
  'Accounting/ Finance',
  'Customer Service/ Retail',
  'Engineering',
  'Healthcare',
  'Hospitality/ Tourism',
  'Human Resources',
  'Information Technology',
  'Office Administration',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function dateOnly(value) {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

function expectedRenderedMinutes(timeIn, timeOut) {
  if (timeIn === null || timeOut === null) return 0;
  const toMinutes = (value) => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  };
  return Math.max(0, toMinutes(timeOut) - toMinutes(timeIn) - 60);
}

async function main() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || 5433),
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'internet_db',
  });
  await client.connect();
  try {
    const industries = await client.query(
      `SELECT industry_name, is_custom_text FROM public.industry
        WHERE industry_name = ANY($1::text[])`,
      [approvedIndustries],
    );
    assert(
      industries.rowCount === 8,
      'All eight approved industries are required.',
    );
    assert(
      industries.rows.every((row) => row.is_custom_text === false),
      'Approved industries must have is_custom_text=false.',
    );

    const accounts = await client.query(
      `SELECT ua.email, ua.user_role, ua.account_status,
              lac.password_hash,
              (lac.user_account_id IS NOT NULL) AS has_local,
              (eai.external_authentication_identity_id IS NOT NULL) AS has_google,
              (s.student_id IS NOT NULL) AS has_student,
              (c.company_id IS NOT NULL) AS has_company,
              (pp.peso_personnel_id IS NOT NULL) AS has_personnel
         FROM public.user_account ua
         LEFT JOIN public.local_authentication_credential lac
           ON lac.user_account_id = ua.user_account_id
         LEFT JOIN public.external_authentication_identity eai
           ON eai.user_account_id = ua.user_account_id
         LEFT JOIN public.student s ON s.user_account_id = ua.user_account_id
         LEFT JOIN public.company c ON c.user_account_id = ua.user_account_id
         LEFT JOIN public.peso_personnel pp
           ON pp.user_account_id = ua.user_account_id
        WHERE ua.email = ANY($1::text[])`,
      [seedOwnedEmails],
    );
    assert(
      accounts.rowCount === 49,
      'Expected the 13 preserved accounts and 36 new local demo accounts.',
    );
    const byEmail = new Map(accounts.rows.map((row) => [row.email, row]));
    const expected = {
      'admin.dev@internet.local': ['admin', true, false, false, false, false],
      'student.manual@internet.local': [
        'student',
        true,
        false,
        true,
        false,
        false,
      ],
      'student.google@internet.local': [
        'student',
        false,
        true,
        true,
        false,
        false,
      ],
      'student.dual@internet.local': [
        'student',
        true,
        true,
        true,
        false,
        false,
      ],
      'company.tech@internet.local': [
        'company',
        true,
        false,
        false,
        true,
        false,
      ],
      'company.hospitality@internet.local': [
        'company',
        true,
        false,
        false,
        true,
        false,
      ],
      'peso.approved@internet.local': [
        'peso_personnel',
        true,
        false,
        false,
        false,
        true,
      ],
      'peso.pending@internet.local': [
        'peso_personnel',
        true,
        false,
        false,
        false,
        true,
      ],
      'peso.rejected@internet.local': [
        'peso_personnel',
        true,
        false,
        false,
        false,
        true,
      ],
    };
    for (const [email, values] of Object.entries(expected)) {
      const row = byEmail.get(email);
      assert(row, `Missing ${email}.`);
      const actual = [
        row.user_role,
        row.has_local,
        row.has_google,
        row.has_student,
        row.has_company,
        row.has_personnel,
      ];
      assert(
        JSON.stringify(actual) === JSON.stringify(values),
        `Provider/profile matrix mismatch for ${email}.`,
      );
      assert(row.account_status === 'active', `${email} must be active.`);
    }

    const password = process.env.DEV_SEED_PASSWORD;
    assert(
      password,
      'DEV_SEED_PASSWORD is required to validate local credentials.',
    );
    for (const fixture of DEVELOPMENT_COMPANY_FIXTURES) {
      const row = byEmail.get(fixture.loginEmail);
      assert(row, `Missing company login ${fixture.loginEmail}.`);
      assert(
        row.user_role === 'company',
        `${fixture.loginEmail} must be company.`,
      );
      assert(
        row.account_status === 'active',
        `${fixture.loginEmail} must be active.`,
      );
      assert(
        row.has_local,
        `${fixture.loginEmail} requires local authentication.`,
      );
      assert(
        row.password_hash,
        `${fixture.loginEmail} requires a local password hash.`,
      );
      assert(
        await bcrypt.compare(password, row.password_hash),
        `${fixture.loginEmail} local credential must match DEV_SEED_PASSWORD.`,
      );
      assert(
        !row.has_google,
        `${fixture.loginEmail} must not have Google auth.`,
      );
      assert(
        row.has_company && !row.has_student && !row.has_personnel,
        `${fixture.loginEmail} must have only its company profile.`,
      );
    }
    for (const fixture of DEVELOPMENT_STUDENT_FIXTURES) {
      const row = byEmail.get(fixture.loginEmail);
      assert(row, `Missing student login ${fixture.loginEmail}.`);
      assert(
        row.user_role === 'student',
        `${fixture.loginEmail} must be student.`,
      );
      assert(
        row.account_status === 'active',
        `${fixture.loginEmail} must be active.`,
      );
      assert(
        row.has_local,
        `${fixture.loginEmail} requires local authentication.`,
      );
      assert(
        row.password_hash,
        `${fixture.loginEmail} requires a local password hash.`,
      );
      assert(
        await bcrypt.compare(password, row.password_hash),
        `${fixture.loginEmail} local credential must match DEV_SEED_PASSWORD.`,
      );
      assert(
        !row.has_google,
        `${fixture.loginEmail} must not have Google auth.`,
      );
      assert(
        row.has_student && !row.has_company && !row.has_personnel,
        `${fixture.loginEmail} must have only its student profile.`,
      );
    }

    const canonicalAccounts = {
      'student.dev@example.com': 'student',
      'company.dev@example.com': 'company',
      'peso.dev@example.com': 'peso_personnel',
      'admin.dev@example.com': 'admin',
    };
    const canonicalEmails = Object.keys(canonicalAccounts);
    const canonicalCount = await client.query(
      `SELECT count(*)::integer AS count
         FROM public.user_account
        WHERE email = ANY($1::text[])`,
      [canonicalEmails],
    );
    assert(
      canonicalCount.rows[0].count === 4,
      'Expected exactly four canonical development accounts.',
    );
    const canonicalProfiles = await client.query(
      `SELECT ua.email, ua.user_role, ua.account_status, ua.deleted_at,
              ua.suspended_until, lac.password_hash,
              EXISTS (
                SELECT 1 FROM public.external_authentication_identity eai
                 WHERE eai.user_account_id = ua.user_account_id
              ) AS has_google,
              (SELECT count(*)::integer FROM public.student s
                WHERE s.user_account_id = ua.user_account_id) AS student_profiles,
              (SELECT count(*)::integer FROM public.company c
                WHERE c.user_account_id = ua.user_account_id) AS company_profiles,
              (SELECT count(*)::integer FROM public.peso_personnel pp
                WHERE pp.user_account_id = ua.user_account_id) AS personnel_profiles,
              EXISTS (
                SELECT 1
                  FROM public.student s
                  JOIN public.student_academic_information sai USING (student_id)
                  JOIN public.internship_preference ip USING (student_id)
                 WHERE s.user_account_id = ua.user_account_id
                   AND btrim(s.first_name) <> ''
                   AND btrim(s.last_name) <> ''
                   AND btrim(s.contact_number) <> ''
                   AND btrim(s.contact_email) <> ''
                   AND btrim(s.address_line) <> ''
                   AND btrim(s.address_barangay) <> ''
                   AND btrim(s.address_district) <> ''
                   AND btrim(s.address_city) <> ''
                   AND btrim(sai.school_name) <> ''
                   AND btrim(sai.strand_program) <> ''
                   AND ip.required_hours > 0
                   AND EXISTS (
                     SELECT 1 FROM public.student_preferred_industry spi
                      WHERE spi.student_id = s.student_id
                   )
              ) AS has_complete_student_profile,
              EXISTS (
                SELECT 1 FROM public.company c
                 WHERE c.user_account_id = ua.user_account_id
                   AND btrim(c.company_name) <> ''
                   AND btrim(c.description) <> ''
                   AND btrim(c.contact_email) <> ''
                   AND btrim(c.contact_number) <> ''
                   AND btrim(c.contact_person_first_name) <> ''
                   AND btrim(c.contact_person_last_name) <> ''
                   AND btrim(c.address_line) <> ''
                   AND btrim(c.address_barangay) <> ''
                   AND btrim(c.address_city) <> ''
              ) AS has_complete_company_profile,
              EXISTS (
                SELECT 1 FROM public.peso_personnel pp
                 WHERE pp.user_account_id = ua.user_account_id
                   AND btrim(pp.first_name) <> ''
                   AND btrim(pp.last_name) <> ''
                   AND btrim(pp.contact_number) <> ''
                   AND btrim(pp.contact_email) <> ''
                   AND btrim(pp.employee_id) <> ''
                   AND btrim(pp.position) <> ''
                   AND btrim(pp.department) <> ''
                   AND btrim(pp.address_line) <> ''
                   AND btrim(pp.address_barangay) <> ''
                   AND btrim(pp.address_district) <> ''
                   AND btrim(pp.address_city) <> ''
              ) AS has_complete_personnel_profile
         FROM public.user_account ua
         LEFT JOIN public.local_authentication_credential lac
           ON lac.user_account_id = ua.user_account_id
        WHERE ua.email = ANY($1::text[])`,
      [canonicalEmails],
    );
    assert(
      canonicalProfiles.rowCount === 4,
      'Each canonical development account must exist exactly once.',
    );
    assert(
      password,
      'DEV_SEED_PASSWORD is required to validate canonical local credentials.',
    );
    for (const row of canonicalProfiles.rows) {
      const expectedRole = canonicalAccounts[row.email];
      assert(expectedRole, `Unexpected canonical account ${row.email}.`);
      assert(
        row.user_role === expectedRole,
        `${row.email} must have the ${expectedRole} role.`,
      );
      assert(row.account_status === 'active', `${row.email} must be active.`);
      assert(row.deleted_at === null, `${row.email} must not be deleted.`);
      assert(
        row.suspended_until === null,
        `${row.email} must not be suspended.`,
      );
      assert(row.password_hash, `${row.email} requires a local credential.`);
      assert(!row.has_google, `${row.email} must not have a Google identity.`);
      assert(
        await bcrypt.compare(password, row.password_hash),
        `${row.email} local credential must match DEV_SEED_PASSWORD.`,
      );

      const profileCounts = [
        row.student_profiles,
        row.company_profiles,
        row.personnel_profiles,
      ];
      if (expectedRole === 'admin') {
        assert(
          profileCounts.every((count) => count === 0),
          'admin.dev@example.com must not have a domain profile.',
        );
      } else if (expectedRole === 'student') {
        assert(
          row.student_profiles === 1 &&
            row.company_profiles === 0 &&
            row.personnel_profiles === 0 &&
            row.has_complete_student_profile,
          'student.dev@example.com requires one complete student profile.',
        );
      } else if (expectedRole === 'company') {
        assert(
          row.student_profiles === 0 &&
            row.company_profiles === 1 &&
            row.personnel_profiles === 0 &&
            row.has_complete_company_profile,
          'company.dev@example.com requires one complete company profile.',
        );
      } else {
        assert(
          row.student_profiles === 0 &&
            row.company_profiles === 0 &&
            row.personnel_profiles === 1 &&
            row.has_complete_personnel_profile,
          'peso.dev@example.com requires one complete PESO personnel profile.',
        );
      }
    }

    const canonicalTransientAuth = await client.query(
      `SELECT
        (SELECT count(*)::integer FROM public.authentication_session s
          JOIN public.user_account ua USING (user_account_id)
         WHERE ua.email = ANY($1::text[])) AS sessions,
        (SELECT count(*)::integer FROM public.registration_onboarding ro
         WHERE ro.verified_email = ANY($1::text[])) AS onboarding`,
      [canonicalEmails],
    );
    assert(
      canonicalTransientAuth.rows[0].sessions === 0 &&
        canonicalTransientAuth.rows[0].onboarding === 0,
      'Canonical development accounts must not create sessions or onboarding rows.',
    );

    const completedProfiles = await client.query(
      `SELECT count(*)::integer AS count
         FROM public.student s
         JOIN public.student_academic_information sai USING (student_id)
         JOIN public.internship_preference ip USING (student_id)
        WHERE s.contact_email = ANY($1::text[])
          AND EXISTS (SELECT 1 FROM public.student_preferred_industry spi
                       WHERE spi.student_id = s.student_id)`,
      [newStudentEmails],
    );
    assert(
      completedProfiles.rows[0].count === 27,
      'All 27 new students need complete academic, preference, and industry profiles.',
    );

    const personnel = await client.query(
      `SELECT ua.email, pp.employee_id
        FROM public.peso_personnel pp
         JOIN public.user_account ua ON ua.user_account_id = pp.user_account_id
        WHERE ua.email = ANY($1::text[])`,
      [
        [
          'peso.approved@internet.local',
          'peso.pending@internet.local',
          'peso.rejected@internet.local',
        ],
      ],
    );
    assert(
      personnel.rowCount === 3 &&
        personnel.rows.every((row) => row.employee_id),
      'All three operational PESO fixtures require employee IDs.',
    );

    const noTransientAuth = await client.query(
      `SELECT
         (SELECT count(*)::integer FROM public.authentication_session s
           JOIN public.user_account ua USING (user_account_id)
          WHERE ua.email = ANY($1::text[])) AS sessions,
         (SELECT count(*)::integer FROM public.registration_onboarding
          WHERE verified_email = ANY($1::text[])) AS onboarding`,
      [seedOwnedEmails],
    );
    assert(
      noTransientAuth.rows[0].sessions === 0,
      'Development seed must not create sessions.',
    );
    assert(
      noTransientAuth.rows[0].onboarding === 0,
      'Development seed must not create onboarding rows.',
    );

    const companyProfiles = await client.query(
      `SELECT ua.email, ua.account_status, ua.created_at AS account_created_at,
              c.created_at AS company_created_at,
              (SELECT min(lac.created_at)
                 FROM public.local_authentication_credential lac
                WHERE lac.user_account_id = ua.user_account_id)
                AS credential_created_at,
              c.company_id, c.company_name,
              c.company_type, c.description, c.website_url, c.year_established,
              c.company_size, c.contact_email, c.contact_number,
              c.contact_person_first_name, c.contact_person_middle_name,
              c.contact_person_last_name, c.address_line, c.address_barangay,
              c.address_district, c.address_city, i.industry_name,
              (SELECT count(*)::integer FROM public.local_authentication_credential lac
                WHERE lac.user_account_id = ua.user_account_id) AS local_count,
              (SELECT count(*)::integer FROM public.company duplicate
                WHERE duplicate.user_account_id = ua.user_account_id) AS profile_count
         FROM public.user_account ua
         JOIN public.company c USING (user_account_id)
         JOIN public.industry i USING (industry_id)
        WHERE ua.email = ANY($1::text[])`,
      [newCompanyEmails],
    );
    assert(
      companyProfiles.rowCount === 9,
      'All nine new company profiles are required.',
    );
    for (const fixture of DEVELOPMENT_COMPANY_FIXTURES) {
      const row = companyProfiles.rows.find(
        (candidate) => candidate.email === fixture.loginEmail,
      );
      assert(row, `Missing company profile ${fixture.companyName}.`);
      for (const createdAt of [
        row.account_created_at,
        row.company_created_at,
        row.credential_created_at,
      ]) {
        assert(
          new Date(createdAt) <
            new Date(DEVELOPMENT_WORKFLOW_TIMELINE.applicationSubmittedAt),
          `${fixture.loginEmail} account/profile rows must predate applications.`,
        );
      }
      for (const [field, expectedValue] of Object.entries({
        account_status: 'active',
        company_name: fixture.companyName,
        company_type: fixture.companyType,
        description: fixture.description,
        website_url: fixture.websiteUrl,
        year_established: fixture.yearEstablished,
        company_size: fixture.companySize,
        contact_email: fixture.contactEmail,
        contact_number: fixture.contactNumber,
        contact_person_first_name: fixture.contactPersonFirstName,
        contact_person_middle_name: fixture.contactPersonMiddleName,
        contact_person_last_name: fixture.contactPersonLastName,
        address_line: fixture.addressLine,
        address_barangay: fixture.addressBarangay,
        address_district: fixture.addressDistrict,
        address_city: fixture.addressCity,
        industry_name: fixture.industryName,
        local_count: 1,
        profile_count: 1,
      })) {
        assert(
          row[field] === expectedValue,
          `${fixture.loginEmail} ${field} must match the fixture.`,
        );
      }
    }

    const demoOpportunities = await client.query(
      `SELECT c.company_name, o.opportunity_id, o.title, o.department,
              o.description, o.qualification,
              (o.allowance IS NOT NULL) AS has_allowance, o.allowance,
              o.minimum_required_hours, o.work_arrangement, o.offered_slots,
              (o.application_deadline AT TIME ZONE 'Asia/Manila')::date::text
                AS local_deadline,
              o.created_at, o.application_deadline AS deadline_timestamp
         FROM public.opportunity o
         JOIN public.company c USING (company_id)
        WHERE c.user_account_id IN (
          SELECT user_account_id FROM public.user_account
           WHERE email = ANY($1::text[])
        )`,
      [newCompanyEmails],
    );
    const expectedOpportunities = DEVELOPMENT_COMPANY_FIXTURES.flatMap(
      (company) =>
        company.opportunities.map((opportunity) => ({ company, opportunity })),
    );
    assert(
      demoOpportunities.rowCount === 27,
      'All 27 supplied opportunities are required.',
    );
    for (const { company, opportunity } of expectedOpportunities) {
      const row = demoOpportunities.rows.find(
        (candidate) =>
          candidate.company_name === company.companyName &&
          candidate.title === opportunity.title,
      );
      assert(
        row,
        `Missing opportunity ${company.companyName}: ${opportunity.title}.`,
      );
      for (const [field, expectedValue] of Object.entries({
        department: opportunity.department,
        description: opportunity.description,
        qualification: opportunity.qualification,
        has_allowance: opportunity.allowance !== null,
        allowance: opportunity.allowance,
        minimum_required_hours: opportunity.minimumRequiredHours,
        work_arrangement: opportunity.workArrangement,
        offered_slots: opportunity.offeredSlots,
        local_deadline: opportunity.applicationDeadline.slice(0, 10),
      })) {
        assert(
          row[field] === expectedValue,
          `${company.companyName}: ${opportunity.title} ${field} must match the fixture.`,
        );
      }
      assert(
        new Date(row.created_at) < new Date(row.deadline_timestamp),
        `${opportunity.title} must be created before its deadline.`,
      );
    }

    const demoStudents = await client.query(
      `SELECT ua.email, ua.account_status,
              ua.created_at AS account_created_at,
              s.created_at AS student_created_at,
              sai.created_at AS academic_created_at,
              s.student_id, s.first_name,
              s.middle_name, s.last_name, s.contact_number, s.contact_email,
              s.address_line, s.address_barangay, s.address_district, s.address_city,
              sai.strand_program, ip.required_hours,
              ip.start_date::text AS preference_start_date,
              ip.created_at AS preference_created_at, c.company_name,
              o.title AS opportunity_title, ci.industry_name AS company_industry,
              (SELECT array_agg(pi.industry_name ORDER BY pi.industry_name)
                 FROM public.student_preferred_industry spi
                 JOIN public.industry pi USING (industry_id)
                WHERE spi.student_id = s.student_id) AS preferred_industries,
              (SELECT min(spi.created_at)
                 FROM public.student_preferred_industry spi
                WHERE spi.student_id = s.student_id)
                AS preferred_industry_created_at,
              a.application_id, a.application_status, a.student_response,
              a.submitted_at, o.created_at AS opportunity_created_at,
              o.application_deadline,
              r.referral_id, r.referral_status, r.company_response,
              i.interview_id, i.interview_mode, i.created_at AS interview_created_at,
              i.scheduled_at, ia.internship_assignment_id, ia.assignment_status,
              to_char(ia.start_date, 'YYYY-MM-DD') AS start_date,
              to_char(ia.expected_end_date, 'YYYY-MM-DD') AS expected_end_date,
              count(ar.attendance_record_id)::integer AS attendance_count
         FROM public.user_account ua
         JOIN public.student s USING (user_account_id)
         JOIN public.student_academic_information sai USING (student_id)
         JOIN public.internship_preference ip USING (student_id)
         LEFT JOIN public.application a USING (student_id)
         LEFT JOIN public.opportunity o USING (opportunity_id)
         LEFT JOIN public.company c USING (company_id)
         LEFT JOIN public.industry ci ON ci.industry_id = c.industry_id
         LEFT JOIN public.referral r USING (application_id)
         LEFT JOIN public.interview i USING (referral_id)
         LEFT JOIN public.internship_assignment ia USING (referral_id)
         LEFT JOIN public.attendance_record ar USING (internship_assignment_id)
        WHERE ua.email = ANY($1::text[])
        GROUP BY ua.email, ua.account_status, ua.created_at, s.student_id,
                 s.created_at, sai.created_at, sai.strand_program,
                 ip.required_hours, ip.start_date, ip.created_at,
                 c.company_name, o.title, ci.industry_name,
                 a.application_id, a.application_status, a.student_response,
                 a.submitted_at, o.created_at, o.application_deadline,
                 r.referral_id, r.referral_status, r.company_response,
                 i.interview_id, i.interview_mode, i.created_at, i.scheduled_at,
                 ia.internship_assignment_id, ia.assignment_status,
                 ia.start_date, ia.expected_end_date`,
      [newStudentEmails],
    );
    assert(
      demoStudents.rowCount === 27,
      'All 27 student demo accounts are required.',
    );
    const demoStudentsByEmail = new Map(
      demoStudents.rows.map((row) => [row.email, row]),
    );
    const companyByKey = new Map(
      DEVELOPMENT_COMPANY_FIXTURES.map((fixture) => [fixture.key, fixture]),
    );
    for (const fixture of DEVELOPMENT_STUDENT_FIXTURES) {
      const row = demoStudentsByEmail.get(fixture.loginEmail);
      const company = companyByKey.get(fixture.companyKey);
      const opportunity = company?.opportunities.find(
        (item) => item.key === fixture.opportunityKey,
      );
      assert(row, `Missing student profile ${fixture.loginEmail}.`);
      assert(
        company && opportunity,
        `${fixture.loginEmail} must target a fixture opportunity.`,
      );
      for (const createdAt of [
        row.account_created_at,
        row.student_created_at,
        row.academic_created_at,
        row.preference_created_at,
        row.preferred_industry_created_at,
      ]) {
        assert(
          new Date(createdAt) <
            new Date(DEVELOPMENT_WORKFLOW_TIMELINE.applicationSubmittedAt),
          `${fixture.loginEmail} account/profile rows must predate applications.`,
        );
      }
      for (const [field, expectedValue] of Object.entries({
        account_status: 'active',
        first_name: fixture.firstName,
        middle_name: fixture.middleName,
        last_name: fixture.lastName,
        contact_number: fixture.contactNumber,
        contact_email: fixture.loginEmail,
        address_line: fixture.addressLine,
        address_barangay: fixture.addressBarangay,
        address_district: fixture.addressDistrict,
        address_city: fixture.addressCity,
        strand_program: fixture.program,
        required_hours: opportunity.minimumRequiredHours,
        preference_start_date:
          DEVELOPMENT_WORKFLOW_TIMELINE.preferenceStartDate,
        company_name: company.companyName,
        opportunity_title: opportunity.title,
        company_industry: company.industryName,
      })) {
        assert(
          row[field] === expectedValue,
          `${fixture.loginEmail} ${field} must match its fixture.`,
        );
      }
      assert(
        row.preferred_industries?.includes(company.industryName),
        `${fixture.loginEmail} requires its target industry preference.`,
      );
      assert(
        new Date(row.preference_created_at) <
          new Date(row.preference_start_date),
        `${fixture.loginEmail} preference dates must be deterministic and valid.`,
      );
      assert(
        row.application_id,
        `${fixture.loginEmail} requires an application.`,
      );
      assert(
        new Date(row.opportunity_created_at) <
          new Date(row.application_deadline),
        `${fixture.loginEmail} opportunity must be created before its deadline.`,
      );
      assert(
        new Date(row.submitted_at) < new Date(row.application_deadline),
        `${fixture.loginEmail} application must be submitted before its deadline.`,
      );

      if (fixture.workflowStage === 'applicant') {
        assert(
          ['submitted', 'under_review'].includes(row.application_status),
          `${fixture.loginEmail} must be an applicant.`,
        );
        assert(
          row.application_status === fixture.applicationStatus,
          `${fixture.loginEmail} application status must match its fixture.`,
        );
        assert(
          !row.referral_id &&
            !row.interview_id &&
            !row.internship_assignment_id,
          `${fixture.loginEmail} applicant must not have later workflow records.`,
        );
        assert(
          row.attendance_count === 0,
          `${fixture.loginEmail} applicant must have no attendance.`,
        );
      } else if (fixture.workflowStage === 'interview') {
        assert(
          row.application_status === 'approved_for_referral',
          `${fixture.loginEmail} must be approved for referral.`,
        );
        assert(
          row.referral_id &&
            row.referral_status === 'under_review' &&
            row.company_response === 'for_interview',
          `${fixture.loginEmail} requires an interview-stage referral.`,
        );
        assert(
          row.interview_id && row.interview_mode === fixture.interviewMode,
          `${fixture.loginEmail} requires its scheduled interview.`,
        );
        assert(
          new Date(row.interview_created_at) < new Date(row.scheduled_at),
          `${fixture.loginEmail} interview must be created before it is scheduled.`,
        );
        assert(
          !row.internship_assignment_id && row.attendance_count === 0,
          `${fixture.loginEmail} interview candidate must not have an assignment.`,
        );
      } else {
        assert(
          row.application_status === 'closed' &&
            row.student_response === 'accepted',
          `${fixture.loginEmail} requires an accepted application.`,
        );
        assert(
          row.referral_id &&
            row.referral_status === 'closed' &&
            row.company_response === 'accepted',
          `${fixture.loginEmail} requires an accepted referral.`,
        );
        assert(
          row.internship_assignment_id && row.assignment_status === 'ongoing',
          `${fixture.loginEmail} requires an ongoing assignment.`,
        );
        assert(
          String(row.start_date).slice(0, 10) === '2026-09-01',
          `${fixture.loginEmail} assignment must use the historical start date.`,
        );
        assert(
          row.attendance_count === 8,
          `${fixture.loginEmail} must have eight attendance entries.`,
        );
      }
    }
    for (const [stage, expectedCount] of [
      ['applicant', 9],
      ['interview', 9],
      ['intern', 9],
    ]) {
      assert(
        DEVELOPMENT_STUDENT_FIXTURES.filter(
          (fixture) => fixture.workflowStage === stage,
        ).length === expectedCount,
        `Expected ${expectedCount} ${stage} fixtures.`,
      );
    }

    const demoAttendance = await client.query(
      `SELECT ua.email, ar.attendance_date::text AS attendance_date,
              ar.attendance_status, ar.rendered_minutes,
              to_char(ar.time_in, 'HH24:MI') AS time_in,
              CASE WHEN ar.time_out IS NULL THEN NULL
                   ELSE to_char(ar.time_out, 'HH24:MI') END AS time_out,
              to_char(ia.start_date, 'YYYY-MM-DD') AS start_date,
              to_char(ia.expected_end_date, 'YYYY-MM-DD') AS expected_end_date
         FROM public.attendance_record ar
         JOIN public.internship_assignment ia USING (internship_assignment_id)
         JOIN public.referral r USING (referral_id)
         JOIN public.application a USING (application_id)
         JOIN public.student s USING (student_id)
         JOIN public.user_account ua USING (user_account_id)
        WHERE ua.email = ANY($1::text[])
        ORDER BY ua.email, ar.attendance_date`,
      [
        DEVELOPMENT_STUDENT_FIXTURES.filter(
          (fixture) => fixture.workflowStage === 'intern',
        ).map((fixture) => fixture.loginEmail),
      ],
    );
    assert(demoAttendance.rowCount === 72, 'Expected 72 intern DTR rows.');
    assert(
      demoAttendance.rows.every(
        (row) =>
          dateOnly(row.attendance_date) >= dateOnly(row.start_date) &&
          dateOnly(row.attendance_date) <= dateOnly(row.expected_end_date),
      ),
      'DTR dates must fall within the internship period.',
    );
    assert(
      demoAttendance.rows.every((row) => Number(row.rendered_minutes) >= 0),
      'Attendance trigger must derive nonnegative rendered minutes.',
    );
    assert(
      demoAttendance.rows.every(
        (row) =>
          Number(row.rendered_minutes) ===
          expectedRenderedMinutes(row.time_in, row.time_out),
      ),
      'Attendance trigger must derive minutes from punch times minus lunch.',
    );

    const attendanceSummaries = await client.query(
      `SELECT ua.email, v.attendance_record_count, v.total_rendered_minutes,
              v.present_count, v.incomplete_count,
              (SELECT sum(ar.rendered_minutes)::bigint
                 FROM public.attendance_record ar
                WHERE ar.internship_assignment_id = v.internship_assignment_id)
                AS raw_total
         FROM public.vw_attendance_summary v
         JOIN public.internship_assignment ia
           ON ia.internship_assignment_id = v.internship_assignment_id
         JOIN public.referral r ON r.referral_id = ia.referral_id
         JOIN public.application a ON a.application_id = r.application_id
         JOIN public.student s ON s.student_id = a.student_id
         JOIN public.user_account ua ON ua.user_account_id = s.user_account_id
        WHERE ua.email = ANY($1::text[])`,
      [
        DEVELOPMENT_STUDENT_FIXTURES.filter(
          (fixture) => fixture.workflowStage === 'intern',
        ).map((fixture) => fixture.loginEmail),
      ],
    );
    assert(
      attendanceSummaries.rowCount === 9,
      'Every seeded intern must appear in vw_attendance_summary.',
    );
    assert(
      attendanceSummaries.rows.every(
        (row) =>
          Number(row.attendance_record_count) === 8 &&
          Number(row.present_count) === 7 &&
          Number(row.incomplete_count) === 1 &&
          Number(row.total_rendered_minutes) === Number(row.raw_total),
      ),
      'Attendance summary counts and rendered minutes must reflect trigger-derived DTR rows.',
    );

    const opportunities = await client.query(
      `SELECT opportunity_status, work_arrangement, allowance,
              minimum_required_hours, offered_slots
         FROM public.opportunity WHERE title LIKE 'DEV %'`,
    );
    assert(
      opportunities.rowCount === 5,
      'Expected five deterministic opportunities.',
    );
    assert(
      ['open', 'closed', 'archived'].every((status) =>
        opportunities.rows.some((row) => row.opportunity_status === status),
      ),
      'Opportunity status coverage is incomplete.',
    );
    assert(
      ['onsite', 'remote', 'hybrid'].every((mode) =>
        opportunities.rows.some((row) => row.work_arrangement === mode),
      ),
      'Work arrangement coverage is incomplete.',
    );
    assert(
      opportunities.rows.some((row) => row.allowance !== null),
      'Allowance fixture is missing.',
    );
    assert(
      opportunities.rows.some((row) => row.allowance === null),
      'No-allowance fixture is missing.',
    );
    assert(
      new Set(opportunities.rows.map((row) => row.minimum_required_hours))
        .size > 1,
      'Opportunity minimum-hour values must vary.',
    );
    assert(
      new Set(opportunities.rows.map((row) => row.offered_slots)).size > 1,
      'Opportunity offered-slot values must vary.',
    );

    const applicationStatuses = await client.query(
      `SELECT DISTINCT a.application_status
         FROM public.application a JOIN public.opportunity o USING (opportunity_id)
        WHERE o.title LIKE 'DEV %'`,
    );
    const applicationSet = new Set(
      applicationStatuses.rows.map((row) => row.application_status),
    );
    for (const status of [
      'submitted',
      'under_review',
      'approved_for_referral',
      'rejected_for_referral',
      'withdrawn',
      'expired',
    ]) {
      assert(
        applicationSet.has(status),
        `Application status ${status} is missing.`,
      );
    }
    const resubmission = await client.query(
      `SELECT count(*)::integer AS count
         FROM public.application a
         JOIN public.student s USING (student_id)
         JOIN public.user_account ua USING (user_account_id)
         JOIN public.opportunity o USING (opportunity_id)
        WHERE ua.email = 'student.manual@internet.local'
          AND o.title = 'DEV Closed Customer Service Internship'
          AND a.application_status IN ('rejected_for_referral', 'submitted')`,
    );
    assert(
      resubmission.rows[0].count === 2,
      'Terminal-application resubmission fixture is missing.',
    );
    const duplicateActiveApplications = await client.query(
      `SELECT student_id, opportunity_id
         FROM public.application
        WHERE application_status IN
          ('submitted', 'under_review', 'approved_for_referral')
        GROUP BY student_id, opportunity_id
       HAVING count(*) > 1`,
    );
    assert(
      duplicateActiveApplications.rowCount === 0,
      'A student/opportunity pair has more than one active application.',
    );

    const referralResponses = await client.query(
      `SELECT DISTINCT r.company_response
         FROM public.referral r
         JOIN public.application a USING (application_id)
         JOIN public.opportunity o USING (opportunity_id)
        WHERE o.title LIKE 'DEV %'`,
    );
    const responseSet = new Set(
      referralResponses.rows.map((row) => row.company_response),
    );
    for (const response of [
      'pending',
      'for_interview',
      'accepted',
      'rejected',
    ]) {
      assert(
        responseSet.has(response),
        `Referral response ${response} is missing.`,
      );
    }

    const interviewModes = await client.query(
      `SELECT DISTINCT i.interview_mode FROM public.interview i
         JOIN public.referral r USING (referral_id)
         JOIN public.application a USING (application_id)
         JOIN public.opportunity o USING (opportunity_id)
        WHERE o.title LIKE 'DEV %'`,
    );
    assert(
      interviewModes.rowCount === 2,
      'Physical and online interviews are required.',
    );

    const assignmentStatuses = await client.query(
      `SELECT DISTINCT ia.assignment_status
         FROM public.internship_assignment ia
         JOIN public.referral r USING (referral_id)
         JOIN public.application a USING (application_id)
         JOIN public.opportunity o USING (opportunity_id)
        WHERE o.title LIKE 'DEV %'`,
    );
    const assignmentSet = new Set(
      assignmentStatuses.rows.map((row) => row.assignment_status),
    );
    for (const status of ['pending', 'ongoing', 'complete_student']) {
      assert(
        assignmentSet.has(status),
        `Assignment status ${status} is missing.`,
      );
    }

    const attendance = await client.query(
      `SELECT attendance_status, time_in, time_out, rendered_minutes
         FROM public.attendance_record ar
         JOIN public.internship_assignment ia USING (internship_assignment_id)
         JOIN public.referral r USING (referral_id)
         JOIN public.application a USING (application_id)
         JOIN public.opportunity o USING (opportunity_id)
        WHERE o.title = 'DEV Remote Healthcare Internship'
          AND ia.assignment_status = 'ongoing'
          AND ar.attendance_date BETWEEN DATE '2026-09-01' AND DATE '2026-09-04'`,
    );
    assert(
      attendance.rowCount === 4,
      'Expected four attendance derivation fixtures.',
    );
    assert(
      attendance.rows.some(
        (row) =>
          row.attendance_status === 'present' &&
          Number(row.rendered_minutes) === 420,
      ),
      'Present attendance with 420 rendered minutes is missing.',
    );
    assert(
      attendance.rows.some(
        (row) =>
          row.attendance_status === 'present' &&
          Number(row.rendered_minutes) === 330,
      ),
      'Present attendance with 330 rendered minutes is missing.',
    );
    assert(
      attendance.rows.some(
        (row) =>
          row.attendance_status === 'present' &&
          Number(row.rendered_minutes) === 495,
      ),
      'Late Clock Out rendered minutes are missing.',
    );
    assert(
      attendance.rows.some(
        (row) =>
          row.attendance_status === 'incomplete' &&
          row.time_out === null &&
          Number(row.rendered_minutes) === 0,
      ),
      'Incomplete attendance is missing.',
    );

    const histories = await client.query(
      `SELECT
        (SELECT count(*)::integer FROM public.application_status_history) AS applications,
        (SELECT count(*)::integer FROM public.referral_status_history) AS referrals,
        (SELECT count(*)::integer FROM public.internship_assignment_status_history) AS assignments`,
    );
    assert(
      Object.values(histories.rows[0]).every((count) => count > 0),
      'Workflow histories were not populated through triggers.',
    );

    const counts = await client.query(
      `SELECT json_build_object(
        'industries', (SELECT count(*) FROM public.industry),
        'accounts', (SELECT count(*) FROM public.user_account),
        'opportunities', (SELECT count(*) FROM public.opportunity),
        'applications', (SELECT count(*) FROM public.application),
        'referrals', (SELECT count(*) FROM public.referral),
        'interviews', (SELECT count(*) FROM public.interview),
        'assignments', (SELECT count(*) FROM public.internship_assignment),
        'attendance', (SELECT count(*) FROM public.attendance_record),
        'feedback', (SELECT count(*) FROM public.internship_feedback),
        'application_history', (SELECT count(*) FROM public.application_status_history),
        'referral_history', (SELECT count(*) FROM public.referral_status_history),
        'assignment_history', (SELECT count(*) FROM public.internship_assignment_status_history)
      ) AS counts`,
    );
    console.log(JSON.stringify(counts.rows[0].counts));
    console.log('Development seed validation passed.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
