const bcrypt = require('bcrypt');
const { Client } = require('pg');

const REQUIRED_INDUSTRIES = [
  'Accounting/ Finance',
  'Customer Service/ Retail',
  'Engineering',
  'Healthcare',
  'Hospitality/ Tourism',
  'Human Resources',
  'Information Technology',
  'Office Administration',
];
const REQUIRED_REQUIREMENT_TYPES = [
  'Proof of Residency',
  'Latest Credential',
  'Curriculum Vitae/ Resume',
  'Letter of Intent',
  'Recommendation Letter/ Registration Form',
];
const ACCOUNTS = [
  ['dev.admin@seed.invalid', 'admin'],
  ['dev.student.one@seed.invalid', 'student'],
  ['dev.student.two@seed.invalid', 'student'],
  ['dev.company@seed.invalid', 'company'],
  ['dev.peso@seed.invalid', 'peso_personnel'],
];
const MARKER = '[DEV-SEED:v1]';

const database = process.env.DATABASE_NAME || 'internet_db';
if (!database.toLowerCase().includes('validation')) {
  throw new Error(
    'Refusing to validate development fixtures unless DATABASE_NAME contains "validation".',
  );
}
if (!process.env.DEV_SEED_PASSWORD) {
  throw new Error('DEV_SEED_PASSWORD is required for seed validation.');
}

const client = new Client({
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT || 5433),
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD,
  database,
});

let passed = 0;
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function pass(message) {
  passed += 1;
  console.log(`PASS ${message}`);
}
async function scalar(sql, parameters = []) {
  const result = await client.query(sql, parameters);
  return Number(result.rows[0].value);
}

async function main() {
  await client.connect();
  try {
    const industries = await client.query(
      `SELECT industry_name, is_custom_text
         FROM public.industry
        WHERE lower(industry_name) = ANY($1::text[])
        ORDER BY industry_name`,
      [REQUIRED_INDUSTRIES.map((value) => value.toLowerCase())],
    );
    assert(industries.rows.length === 8, 'Expected eight required industries.');
    for (const name of REQUIRED_INDUSTRIES) {
      const matches = industries.rows.filter(
        (row) => row.industry_name === name,
      );
      assert(matches.length === 1, `Industry ${name} must exist exactly once.`);
      assert(matches[0].is_custom_text === false, `${name} must be standard.`);
    }
    pass('all eight exact standard industries exist once');

    const industryDuplicates = await scalar(
      `SELECT count(*) AS value FROM (
         SELECT lower(industry_name)
           FROM public.industry
          WHERE lower(industry_name) = ANY($1::text[])
          GROUP BY lower(industry_name)
         HAVING count(*) <> 1
       ) duplicates`,
      [REQUIRED_INDUSTRIES.map((value) => value.toLowerCase())],
    );
    assert(
      industryDuplicates === 0,
      'Reference industries contain duplicates.',
    );
    assert(
      (await scalar(
        `SELECT count(*) AS value FROM public.industry
          WHERE lower(industry_name) = 'other'`,
      )) === 0,
      'The clean seed must not invent an Other industry.',
    );
    pass('reference industries are case-insensitively unique and omit Other');

    const requirementTypes = await client.query(
      `SELECT requirement_type_name
         FROM public.requirement_type
        WHERE lower(requirement_type_name) = ANY($1::text[])`,
      [REQUIRED_REQUIREMENT_TYPES.map((value) => value.toLowerCase())],
    );
    assert(
      requirementTypes.rows.length === 5,
      'Expected five required requirement types.',
    );
    for (const name of REQUIRED_REQUIREMENT_TYPES) {
      assert(
        requirementTypes.rows.filter(
          (row) => row.requirement_type_name === name,
        ).length === 1,
        `Requirement type ${name} must exist exactly once.`,
      );
    }
    pass('all five exact requirement types exist once');

    const accountRows = await client.query(
      `SELECT ua.email, ua.password_hash, ua.user_role, ua.account_status,
              ua.deleted_at,
              count(DISTINCT s.student_id)::integer AS student_profiles,
              count(DISTINCT c.company_id)::integer AS company_profiles,
              count(DISTINCT pp.peso_personnel_id)::integer AS peso_profiles
         FROM public.user_account ua
         LEFT JOIN public.student s ON s.user_account_id = ua.user_account_id
         LEFT JOIN public.company c ON c.user_account_id = ua.user_account_id
         LEFT JOIN public.peso_personnel pp
           ON pp.user_account_id = ua.user_account_id
        WHERE ua.email = ANY($1::text[])
        GROUP BY ua.user_account_id
        ORDER BY ua.email`,
      [ACCOUNTS.map(([email]) => email)],
    );
    assert(accountRows.rows.length === 5, 'Expected five fake accounts.');
    for (const [email, role] of ACCOUNTS) {
      const row = accountRows.rows.find(
        (candidate) => candidate.email === email,
      );
      assert(row, `Missing fake account ${email}.`);
      assert(row.user_role === role, `${email} has the wrong role.`);
      assert(row.account_status === 'active', `${email} is not active.`);
      assert(row.deleted_at === null, `${email} is soft-deleted.`);
      assert(
        row.password_hash,
        `${email} does not have a local password hash.`,
      );
      assert(
        await bcrypt.compare(process.env.DEV_SEED_PASSWORD, row.password_hash),
        `${email} does not use DEV_SEED_PASSWORD.`,
      );
      const expectedProfiles = {
        student: [1, 0, 0],
        company: [0, 1, 0],
        peso_personnel: [0, 0, 1],
        admin: [0, 0, 0],
      }[role];
      assert(
        row.student_profiles === expectedProfiles[0] &&
          row.company_profiles === expectedProfiles[1] &&
          row.peso_profiles === expectedProfiles[2],
        `${email} has invalid role-specific profiles.`,
      );
    }
    pass('five local-password accounts have valid roles and profiles');

    const fixtureCounts = await client.query(
      `SELECT
         (SELECT count(*) FROM public.student s JOIN public.user_account ua USING (user_account_id)
           WHERE ua.email LIKE 'dev.student.%@seed.invalid')::integer AS students,
         (SELECT count(*) FROM public.student_academic_information sai
           JOIN public.student s USING (student_id) JOIN public.user_account ua USING (user_account_id)
           WHERE ua.email LIKE 'dev.student.%@seed.invalid')::integer AS academics,
         (SELECT count(*) FROM public.internship_preference ip
           JOIN public.student s USING (student_id) JOIN public.user_account ua USING (user_account_id)
           WHERE ua.email LIKE 'dev.student.%@seed.invalid')::integer AS preferences,
         (SELECT count(*) FROM public.student_preferred_industry spi
           JOIN public.student s USING (student_id) JOIN public.user_account ua USING (user_account_id)
           WHERE ua.email LIKE 'dev.student.%@seed.invalid')::integer AS preferred_industries,
         (SELECT count(*) FROM public.student_requirement_submission srs
           WHERE requirement_file_path LIKE '/dev-seed/v1/placeholders/%')::integer AS submissions,
         (SELECT count(*) FROM public.opportunity WHERE title LIKE $1)::integer AS opportunities,
         (SELECT count(*) FROM public.application WHERE remark LIKE $1)::integer AS applications,
         (SELECT count(*) FROM public.referral WHERE remark LIKE $1)::integer AS referrals,
         (SELECT count(*) FROM public.interview WHERE remark LIKE $1)::integer AS interviews,
         (SELECT count(*) FROM public.oauth_identity
           WHERE provider_subject = 'dev-seed-google-subject-student-two-v1')::integer AS oauth_identities`,
      [`${MARKER}%`],
    );
    assert(
      JSON.stringify(fixtureCounts.rows[0]) ===
        JSON.stringify({
          students: 2,
          academics: 2,
          preferences: 2,
          preferred_industries: 4,
          submissions: 4,
          opportunities: 3,
          applications: 4,
          referrals: 2,
          interviews: 1,
          oauth_identities: 1,
        }),
      `Unexpected deterministic fixture counts: ${JSON.stringify(fixtureCounts.rows[0])}`,
    );
    pass('deterministic profile and workflow fixture counts are exact');

    const resubmission = await client.query(
      `SELECT array_agg(a.application_status::text ORDER BY a.application_id) AS statuses
         FROM public.application a
         JOIN public.opportunity o USING (opportunity_id)
         JOIN public.student s USING (student_id)
         JOIN public.user_account ua USING (user_account_id)
        WHERE ua.email = 'dev.student.one@seed.invalid'
          AND o.title = $1`,
      [`${MARKER} Support Engineering Intern`],
    );
    assert(
      JSON.stringify(resubmission.rows[0].statuses) ===
        JSON.stringify(['rejected_for_referral', 'submitted']),
      'Rejected application plus active resubmission is invalid.',
    );
    pass('rejected application is followed by a valid submitted resubmission');

    const interview = await client.query(
      `SELECT r.referral_status, r.company_response,
              i.scheduled_at > CURRENT_TIMESTAMP AS is_future
         FROM public.referral r
         JOIN public.interview i USING (referral_id)
        WHERE i.remark = $1`,
      [`${MARKER} Synthetic online interview`],
    );
    assert(
      interview.rows.length === 1 &&
        interview.rows[0].referral_status === 'under_review' &&
        interview.rows[0].company_response === 'for_interview' &&
        interview.rows[0].is_future === true,
      'Interview-stage fixture violates workflow rules.',
    );
    pass('interview fixture has an actionable future workflow state');

    const assignment = await client.query(
      `SELECT ia.internship_assignment_id, ia.assignment_status,
              ia.required_hours, o.minimum_required_hours,
              r.referral_status, r.company_response, a.student_response,
              count(ar.attendance_record_id)::integer AS attendance_count,
              count(DISTINCT f.internship_feedback_id)::integer AS feedback_count
         FROM public.internship_assignment ia
         JOIN public.referral r USING (referral_id)
         JOIN public.application a USING (application_id)
         JOIN public.opportunity o USING (opportunity_id)
         LEFT JOIN public.attendance_record ar USING (internship_assignment_id)
         LEFT JOIN public.internship_feedback f USING (internship_assignment_id)
        WHERE r.remark = $1
        GROUP BY ia.internship_assignment_id, o.minimum_required_hours,
                 r.referral_status, r.company_response, a.student_response`,
      [`${MARKER} Synthetic referral`],
    );
    const completed = assignment.rows.find(
      (row) => row.assignment_status === 'completed',
    );
    assert(completed, 'Missing completed assignment fixture.');
    assert(
      completed.required_hours === 360 &&
        completed.minimum_required_hours === 240,
      'Assignment hours are not independent from opportunity minimum hours.',
    );
    assert(
      completed.referral_status === 'closed' &&
        completed.company_response === 'accepted' &&
        completed.student_response === 'accepted' &&
        completed.attendance_count === 3 &&
        completed.feedback_count === 1,
      'Completed assignment relationship state is invalid.',
    );
    pass(
      'accepted path produces a completed assignment, attendance, and feedback',
    );

    const attendance = await client.query(
      `SELECT array_agg(time_in_status::text ORDER BY attendance_date) AS time_statuses,
              array_agg(rendered_hours_status::text ORDER BY attendance_date) AS hour_statuses,
              array_agg(hours_rendered ORDER BY attendance_date) AS hours
         FROM public.attendance_record ar
         JOIN public.internship_assignment ia USING (internship_assignment_id)
         JOIN public.referral r USING (referral_id)
        WHERE r.remark = $1`,
      [`${MARKER} Synthetic referral`],
    );
    assert(
      JSON.stringify(attendance.rows[0].time_statuses) ===
        JSON.stringify(['on_time', 'late', 'on_time']) &&
        JSON.stringify(attendance.rows[0].hour_statuses) ===
          JSON.stringify(['complete', 'undertime', 'incomplete']),
      'Attendance derivation did not produce the expected statuses.',
    );
    pass('attendance values were derived by database triggers');

    const history = await client.query(
      `SELECT
         (SELECT count(*) FROM public.application_status_history h
           JOIN public.application a USING (application_id)
           WHERE a.remark LIKE $1)::integer AS application_history,
         (SELECT count(*) FROM public.referral_status_history h
           JOIN public.referral r USING (referral_id)
           WHERE r.remark LIKE $1)::integer AS referral_history,
         (SELECT count(*) FROM public.internship_assignment_status_history h
           JOIN public.internship_assignment ia USING (internship_assignment_id)
           JOIN public.referral r USING (referral_id)
           WHERE r.remark LIKE $1)::integer AS assignment_history,
         (SELECT count(*) FROM public.application_status_history h
           JOIN public.application a USING (application_id)
           WHERE a.remark LIKE $1 AND h.changed_by_user_account_id IS NULL)::integer
           AS null_application_actors`,
      [`${MARKER}%`],
    );
    assert(
      history.rows[0].application_history === 6 &&
        history.rows[0].referral_history === 3 &&
        history.rows[0].assignment_history === 2 &&
        history.rows[0].null_application_actors === 0,
      `Unexpected trigger history: ${JSON.stringify(history.rows[0])}`,
    );
    pass('valid transitions produced actor-attributed append-only history');

    const foreignKeys = await client.query(
      `SELECT count(*)::integer AS count, bool_and(convalidated) AS validated
         FROM pg_constraint c
         JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'public' AND c.contype = 'f'`,
    );
    assert(
      foreignKeys.rows[0].count === 29 &&
        foreignKeys.rows[0].validated === true,
      'Foreign-key constraints are not fully present and validated.',
    );
    assert(
      (await scalar(
        `SELECT count(*) AS value
           FROM pg_trigger t
           JOIN pg_class c ON c.oid = t.tgrelid
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND NOT t.tgisinternal AND t.tgenabled = 'D'`,
      )) === 0,
      'A public-schema trigger is disabled.',
    );
    pass(
      'all 29 foreign keys are valid and no application trigger is disabled',
    );

    const views = [
      'vw_student_profile_details',
      'vw_opportunity_summary',
      'vw_application_details',
      'vw_referral_details',
      'vw_upcoming_interviews',
      'vw_internship_assignment_details',
      'vw_attendance_summary',
    ];
    for (const view of views) {
      await client.query(`SELECT count(*) FROM public.${view}`);
    }
    pass('all seven ordinary views execute after seeding');

    console.log(`PASS SUMMARY ${passed} seed checks`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
