require('dotenv').config();
const { Client } = require('pg');

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
        WHERE ua.email LIKE '%@internet.local'
          AND (ua.email LIKE 'student.%' OR ua.email LIKE 'company.%'
            OR ua.email LIKE 'peso.%' OR ua.email = 'admin.dev@internet.local')`,
    );
    assert(
      accounts.rowCount === 9,
      'Expected exactly nine seed-owned accounts.',
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

    const completedProfiles = await client.query(
      `SELECT count(*)::integer AS count
         FROM public.student s
         JOIN public.student_academic_information sai USING (student_id)
         JOIN public.internship_preference ip USING (student_id)
        WHERE s.contact_email LIKE 'student.%@internet.local'
          AND EXISTS (SELECT 1 FROM public.student_preferred_industry spi
                       WHERE spi.student_id = s.student_id)`,
    );
    assert(
      completedProfiles.rows[0].count === 3,
      'All three students need complete profiles.',
    );

    const personnel = await client.query(
      `SELECT ua.email, pp.employee_id
         FROM public.peso_personnel pp
         JOIN public.user_account ua ON ua.user_account_id = pp.user_account_id
        WHERE ua.email LIKE 'peso.%@internet.local'`,
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
          WHERE ua.email LIKE '%@internet.local') AS sessions,
         (SELECT count(*)::integer FROM public.registration_onboarding
          WHERE provider_subject LIKE 'dev-seed-%') AS onboarding`,
    );
    assert(
      noTransientAuth.rows[0].sessions === 0,
      'Development seed must not create sessions.',
    );
    assert(
      noTransientAuth.rows[0].onboarding === 0,
      'Development seed must not create onboarding rows.',
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
      opportunities.rows.some(
        (row) => row.allowance !== null,
      ),
      'Allowance fixture is missing.',
    );
    assert(
      opportunities.rows.some(
        (row) => row.allowance === null,
      ),
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
    for (const status of ['pending', 'ongoing', 'completed']) {
      assert(
        assignmentSet.has(status),
        `Assignment status ${status} is missing.`,
      );
    }

    const attendance = await client.query(
      `SELECT time_in_status, rendered_hours_status, hours_rendered
         FROM public.attendance_record
        WHERE photo_file_path LIKE 'dev-seed/%'`,
    );
    assert(
      attendance.rowCount === 4,
      'Expected four attendance derivation fixtures.',
    );
    assert(
      attendance.rows.some(
        (row) =>
          row.time_in_status === 'on_time' &&
          row.rendered_hours_status === 'complete',
      ),
      'On-time complete attendance is missing.',
    );
    assert(
      attendance.rows.some(
        (row) =>
          row.time_in_status === 'late' &&
          row.rendered_hours_status === 'undertime',
      ),
      'Late undertime attendance is missing.',
    );
    assert(
      attendance.rows.some((row) => row.rendered_hours_status === 'overtime'),
      'Overtime attendance is missing.',
    );
    assert(
      attendance.rows.some(
        (row) =>
          row.rendered_hours_status === 'incomplete' &&
          row.hours_rendered === null,
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
