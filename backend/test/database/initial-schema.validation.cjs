const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Client } = require('pg');

const databaseName = process.env.DATABASE_NAME || '';
if (!databaseName.toLowerCase().includes('validation')) {
  throw new Error(
    'Refusing to run destructive fixture validation unless DATABASE_NAME contains "validation".',
  );
}

const connection = {
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: databaseName,
};

let savepointCounter = 0;
const passed = [];

function pass(name) {
  passed.push(name);
  console.log(`PASS ${name}`);
}

async function expectReject(client, sql, params, pattern, name) {
  const savepoint = `validation_sp_${++savepointCounter}`;
  await client.query(`SAVEPOINT ${savepoint}`);
  let error;
  try {
    await client.query(sql, params);
  } catch (caught) {
    error = caught;
  }
  await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
  await client.query(`RELEASE SAVEPOINT ${savepoint}`);
  assert.ok(error, `${name}: expected the statement to be rejected`);
  if (pattern) {
    assert.match(
      error.message,
      pattern,
      `${name}: unexpected rejection message`,
    );
  }
  pass(name);
}

async function expectTransactionReject(work, pattern, name) {
  const client = new Client(connection);
  await client.connect();
  let error;
  try {
    await client.query('BEGIN');
    await work(client);
    await client.query('COMMIT');
  } catch (caught) {
    error = caught;
    await client.query('ROLLBACK').catch(() => undefined);
  } finally {
    await client.end();
  }
  assert.ok(error, `${name}: expected the transaction to be rejected`);
  assert.match(error.message, pattern, `${name}: unexpected rejection message`);
  pass(name);
}

async function insertAccount(client, email, role) {
  const result = await client.query(
    `INSERT INTO public.user_account (email, password_hash, user_role)
     VALUES ($1, 'validation-hash', $2)
     RETURNING user_account_id`,
    [email, role],
  );
  return result.rows[0].user_account_id;
}

async function insertStudent(client, accountId, firstName) {
  const result = await client.query(
    `INSERT INTO public.student (
       user_account_id, first_name, last_name, sex, birth_date,
       contact_number, contact_email, address_line, address_barangay,
       address_district, address_city, inquiry_method
     ) VALUES ($1, $2, 'Student', 'unspecified', DATE '2000-01-01',
       '09170000000', $3, '1 Test Street', 'Test Barangay',
       'Test District', 'Quezon City', 'online')
     RETURNING student_id`,
    [accountId, firstName, `${firstName.toLowerCase()}@example.test`],
  );
  return result.rows[0].student_id;
}

async function main() {
  const client = new Client(connection);
  await client.connect();

  try {
    const version = await client.query(
      "SELECT current_setting('server_version_num')::integer AS version",
    );
    assert.ok(
      version.rows[0].version >= 160000 && version.rows[0].version < 170000,
    );
    pass('PostgreSQL major version is 16');

    const enumCount = await client.query(
      `SELECT count(DISTINCT t.oid)::integer AS count
       FROM pg_type t
       JOIN pg_namespace n ON n.oid=t.typnamespace
       JOIN pg_enum e ON e.enumtypid=t.oid
       WHERE n.nspname='public'`,
    );
    assert.equal(enumCount.rows[0].count, 17);
    pass('schema has 17 enum types');

    const tableCount = await client.query(
      `SELECT count(*)::integer AS count
       FROM information_schema.tables
       WHERE table_schema='public' AND table_type='BASE TABLE'
         AND table_name <> 'migrations'`,
    );
    assert.equal(tableCount.rows[0].count, 23);
    pass('schema has 23 domain tables');

    const columnCount = await client.query(
      `SELECT count(*)::integer AS count
       FROM information_schema.columns c
       JOIN information_schema.tables t
         ON t.table_schema=c.table_schema AND t.table_name=c.table_name
       WHERE c.table_schema='public' AND t.table_type='BASE TABLE'
         AND c.table_name <> 'migrations'`,
    );
    assert.equal(columnCount.rows[0].count, 217);
    pass('schema has 217 domain columns');

    const foreignKeyCount = await client.query(
      `SELECT count(*)::integer AS count
       FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace
       WHERE n.nspname='public' AND c.contype='f'`,
    );
    assert.equal(foreignKeyCount.rows[0].count, 29);
    pass('schema has 29 foreign keys');

    const views = await client.query(
      `SELECT table_name FROM information_schema.views
       WHERE table_schema='public' ORDER BY table_name`,
    );
    assert.deepEqual(
      views.rows.map((row) => row.table_name),
      [
        'vw_application_details',
        'vw_attendance_summary',
        'vw_internship_assignment_details',
        'vw_opportunity_summary',
        'vw_referral_details',
        'vw_student_profile_details',
        'vw_upcoming_interviews',
      ],
    );
    for (const { table_name: viewName } of views.rows) {
      await client.query(`SELECT * FROM public.${viewName} LIMIT 0`);
    }
    pass('seven ordinary views exist and execute');

    const passwordColumn = await client.query(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_schema='public' AND table_name='user_account'
         AND column_name='password_hash'`,
    );
    assert.equal(passwordColumn.rows[0].is_nullable, 'YES');
    pass('user_account.password_hash is nullable');

    const authObjects = await client.query(
      `SELECT object_name FROM (
         SELECT typname AS object_name FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
          WHERE n.nspname='public' AND typname='authentication_provider_enum'
         UNION ALL
         SELECT conname FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace
          WHERE n.nspname='public' AND conname IN (
            'pk_oauth_identity','ck_oauth_identity_provider_subject_not_blank',
            'ck_oauth_identity_provider_email_not_blank','fk_oauth_identity_user_account',
            'pk_auth_session','uq_auth_session_token_family_id',
            'ck_auth_session_refresh_token_hash_not_blank',
            'ck_auth_session_expires_after_creation',
            'ck_auth_session_revoked_after_creation','fk_auth_session_user_account')
         UNION ALL
         SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN (
           'uq_oauth_identity_provider_subject','uq_oauth_identity_account_provider',
           'uq_auth_session_one_active_per_account','ix_auth_session_user_account',
           'ix_auth_session_expires_at')
       ) objects`,
    );
    assert.equal(authObjects.rowCount, 16);
    pass('all authentication-specific named schema objects exist');

    const activeSessionIndex = await client.query(
      `SELECT indexdef FROM pg_indexes
       WHERE schemaname='public' AND indexname='uq_auth_session_one_active_per_account'`,
    );
    assert.match(
      activeSessionIndex.rows[0].indexdef,
      /UNIQUE.*user_account_id.*WHERE \(revoked_at IS NULL\)/i,
    );
    pass('one-active-session index has the approved partial predicate');

    const longestIdentifier = await client.query(
      `SELECT max(octet_length(name))::integer AS bytes FROM (
         SELECT relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
         UNION ALL SELECT conname FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public'
         UNION ALL SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
         UNION ALL SELECT tgname FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal
       ) names`,
    );
    assert.ok(longestIdentifier.rows[0].bytes <= 63);
    pass('all public-schema identifiers are at most 63 bytes');

    for (const configPath of [
      join(__dirname, '../../src/config/database.config.ts'),
      join(__dirname, '../../src/config/data-source.ts'),
    ]) {
      assert.match(readFileSync(configPath, 'utf8'), /synchronize:\s*false/);
    }
    pass('runtime and CLI TypeORM synchronization remain disabled');

    await client.query('BEGIN');

    const standardIndustry = (
      await client.query(
        "INSERT INTO public.industry (industry_name) VALUES ('Information Technology') RETURNING industry_id",
      )
    ).rows[0].industry_id;
    const customIndustry = (
      await client.query(
        "INSERT INTO public.industry (industry_name, is_custom_text) VALUES ('Other', true) RETURNING industry_id",
      )
    ).rows[0].industry_id;

    await expectReject(
      client,
      "INSERT INTO public.industry (industry_name, is_custom_text) VALUES ('Another Other', true)",
      [],
      /uq_industry_single_custom_text/,
      'single custom-industry partial unique index',
    );

    const actorAccount = await insertAccount(
      client,
      'actor@example.test',
      'admin',
    );
    const studentAccount1 = await insertAccount(
      client,
      'student1@example.test',
      'student',
    );
    const studentAccount2 = await insertAccount(
      client,
      'student2@example.test',
      'student',
    );
    const companyAccount = await insertAccount(
      client,
      'company@example.test',
      'company',
    );
    const personnelAccount = await insertAccount(
      client,
      'personnel@example.test',
      'peso_personnel',
    );

    const student1 = await insertStudent(client, studentAccount1, 'Alpha');
    const student2 = await insertStudent(client, studentAccount2, 'Beta');

    await client.query(
      `INSERT INTO public.oauth_identity (
         user_account_id, authentication_provider, provider_subject, provider_email
       ) VALUES ($1, 'google', 'google-alpha', 'student1@example.test')`,
      [studentAccount1],
    );
    await expectReject(
      client,
      `INSERT INTO public.oauth_identity (
         user_account_id, authentication_provider, provider_subject, provider_email
       ) VALUES ($1, 'google', 'google-alpha', 'student2@example.test')`,
      [studentAccount2],
      /uq_oauth_identity_provider_subject/,
      'Google provider subjects are globally unique',
    );

    await client.query(
      `INSERT INTO public.auth_session (
         user_account_id, refresh_token_hash, token_family_id, expires_at
       ) VALUES ($1, 'hash-one', '00000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP + INTERVAL '1 day')`,
      [studentAccount1],
    );
    await expectReject(
      client,
      `INSERT INTO public.auth_session (
         user_account_id, refresh_token_hash, token_family_id, expires_at
       ) VALUES ($1, 'hash-two', '00000000-0000-4000-8000-000000000002', CURRENT_TIMESTAMP + INTERVAL '1 day')`,
      [studentAccount1],
      /uq_auth_session_one_active_per_account/,
      'one active authentication session per account',
    );
    await client.query(
      'UPDATE public.auth_session SET revoked_at=CURRENT_TIMESTAMP WHERE user_account_id=$1',
      [studentAccount1],
    );
    await client.query(
      `INSERT INTO public.auth_session (
         user_account_id, refresh_token_hash, token_family_id, expires_at
       ) VALUES ($1, 'hash-two', '00000000-0000-4000-8000-000000000002', CURRENT_TIMESTAMP + INTERVAL '1 day')`,
      [studentAccount1],
    );
    pass('revoked authentication-session history permits a replacement session');

    await client.query(
      `INSERT INTO public.student_academic_information (student_id, school_name, year_level, strand_program)
       VALUES ($1, 'Validation University', 'fourth_year_college', 'Computer Science')`,
      [student1],
    );
    await client.query(
      `INSERT INTO public.internship_preference (
         student_id, required_hours, available_days, allows_outside_preferred_field,
         start_date, preferred_company_type
       ) VALUES ($1, 240, 'weekdays', true, CURRENT_DATE, 'private')`,
      [student1],
    );
    await client.query(
      `INSERT INTO public.student_preferred_industry (student_id, industry_id)
       VALUES ($1, $2)`,
      [student1, standardIndustry],
    );
    await client.query(
      `INSERT INTO public.student_preferred_industry (student_id, industry_id, custom_industry_name)
       VALUES ($1, $2, 'Robotics')`,
      [student1, customIndustry],
    );

    await expectReject(
      client,
      `INSERT INTO public.student_preferred_industry (student_id, industry_id, custom_industry_name)
       VALUES ($1, $2, 'Not allowed')`,
      [student2, standardIndustry],
      /allowed only for the designated custom industry/,
      'custom industry text is rejected for standard industries',
    );

    const company = (
      await client.query(
        `INSERT INTO public.company (
           user_account_id, industry_id, company_name, company_type, description,
           contact_email, contact_number, contact_person_first_name,
           contact_person_last_name, address_line, address_barangay, address_city,
           logo_file_path
         ) VALUES ($1, $2, 'Validation Company', 'private', 'Validation company',
           'company@example.test', '09171111111', 'Casey', 'Manager',
           '2 Test Street', 'Test Barangay', 'Quezon City', '/validation/logo.png')
         RETURNING company_id`,
        [companyAccount, standardIndustry],
      )
    ).rows[0].company_id;

    await expectReject(
      client,
      'UPDATE public.company SET industry_id = $1 WHERE company_id = $2',
      [customIndustry, company],
      /cannot reference the student-only custom industry/,
      'companies cannot use the student-only custom industry',
    );

    const personnel = (
      await client.query(
        `INSERT INTO public.peso_personnel (
           user_account_id, first_name, last_name, sex, birth_date,
           address_line, address_barangay, address_district, address_city,
           contact_number, contact_email, employee_id, position, department,
           employee_id_file_path
         ) VALUES ($1, 'Pat', 'Officer', 'unspecified', DATE '1990-01-01',
           '3 Test Street', 'Test Barangay', 'Test District', 'Quezon City',
           '09172222222', 'personnel@example.test', 'VAL-001', 'Officer',
           'Placement', '/validation/id.png')
         RETURNING peso_personnel_id`,
        [personnelAccount],
      )
    ).rows[0].peso_personnel_id;

    await expectReject(
      client,
      `INSERT INTO public.user_account (email, password_hash, user_role)
       VALUES ('ACTOR@example.test', 'hash', 'admin')`,
      [],
      /uq_user_account_email_ci/,
      'case-insensitive account email uniqueness',
    );

    const opportunity1 = (
      await client.query(
        `INSERT INTO public.opportunity (
           company_id, title, department, description, has_allowance, allowance,
           minimum_required_hours, work_arrangement, offered_slots, application_deadline
         ) VALUES ($1, 'Backend Internship', 'Engineering', 'Validation opportunity',
           false, NULL, 240, 'hybrid', 1, CURRENT_TIMESTAMP + INTERVAL '30 days')
         RETURNING opportunity_id`,
        [company],
      )
    ).rows[0].opportunity_id;

    const application1 = (
      await client.query(
        `INSERT INTO public.application (student_id, opportunity_id)
         VALUES ($1, $2) RETURNING application_id`,
        [student1, opportunity1],
      )
    ).rows[0].application_id;
    const application2 = (
      await client.query(
        `INSERT INTO public.application (student_id, opportunity_id)
         VALUES ($1, $2) RETURNING application_id`,
        [student2, opportunity1],
      )
    ).rows[0].application_id;
    pass('offered_slots does not block a second student application');

    await expectReject(
      client,
      'INSERT INTO public.application (student_id, opportunity_id) VALUES ($1, $2)',
      [student1, opportunity1],
      /uq_application_active_student_opportunity/,
      'active application partial unique index',
    );
    await expectReject(
      client,
      "UPDATE public.application SET application_status='approved_for_referral' WHERE application_id=$1",
      [application1],
      /Invalid application status transition/,
      'invalid application transition is rejected',
    );

    await client.query(
      "SELECT set_config('app.current_user_account_id', $1, true)",
      [String(actorAccount)],
    );
    await client.query(
      "UPDATE public.application SET application_status='under_review' WHERE application_id=$1",
      [application1],
    );
    await client.query(
      "UPDATE public.application SET application_status='rejected_for_referral', remark='Revise documents' WHERE application_id=$1",
      [application1],
    );

    const historyBeforeNoop = Number(
      (
        await client.query(
          'SELECT count(*) AS count FROM public.application_status_history WHERE application_id=$1',
          [application1],
        )
      ).rows[0].count,
    );
    await client.query(
      "UPDATE public.application SET remark='Still terminal' WHERE application_id=$1",
      [application1],
    );
    const historyAfterNoop = Number(
      (
        await client.query(
          'SELECT count(*) AS count FROM public.application_status_history WHERE application_id=$1',
          [application1],
        )
      ).rows[0].count,
    );
    assert.equal(historyAfterNoop, historyBeforeNoop);
    pass('status history records actual status changes only');

    const resubmittedApplication = (
      await client.query(
        'INSERT INTO public.application (student_id, opportunity_id) VALUES ($1, $2) RETURNING application_id',
        [student1, opportunity1],
      )
    ).rows[0].application_id;
    pass('terminal application permits resubmission');
    await expectReject(
      client,
      'INSERT INTO public.application (student_id, opportunity_id) VALUES ($1, $2)',
      [student1, opportunity1],
      /uq_application_active_student_opportunity/,
      'resubmitted active application remains unique',
    );

    for (const applicationId of [resubmittedApplication, application2]) {
      await client.query(
        "UPDATE public.application SET application_status='under_review' WHERE application_id=$1",
        [applicationId],
      );
      await client.query(
        "UPDATE public.application SET application_status='approved_for_referral' WHERE application_id=$1",
        [applicationId],
      );
    }

    const referral1 = (
      await client.query(
        `INSERT INTO public.referral (application_id, peso_personnel_id, referral_document_file_path)
         VALUES ($1, $2, '/validation/referral-1.pdf') RETURNING referral_id`,
        [resubmittedApplication, personnel],
      )
    ).rows[0].referral_id;
    const referral2 = (
      await client.query(
        `INSERT INTO public.referral (application_id, peso_personnel_id, referral_document_file_path)
         VALUES ($1, $2, '/validation/referral-2.pdf') RETURNING referral_id`,
        [application2, personnel],
      )
    ).rows[0].referral_id;

    await expectReject(
      client,
      "UPDATE public.referral SET referral_status='closed', company_response='rejected', company_responded_at=CURRENT_TIMESTAMP WHERE referral_id=$1",
      [referral1],
      /Invalid referral status transition/,
      'invalid referral transition is rejected',
    );

    for (const referralId of [referral1, referral2]) {
      await client.query(
        "UPDATE public.referral SET referral_status='under_review', company_response='for_interview', company_responded_at=CURRENT_TIMESTAMP WHERE referral_id=$1",
        [referralId],
      );
    }

    await client.query(
      `INSERT INTO public.interview (referral_id, scheduled_at, interview_mode, online_meeting_url)
       VALUES ($1, CURRENT_TIMESTAMP + INTERVAL '2 days', 'online', 'https://example.test/interview-1')`,
      [referral1],
    );
    await client.query(
      `INSERT INTO public.interview (referral_id, scheduled_at, interview_mode, physical_location, created_at)
       VALUES ($1, CURRENT_TIMESTAMP - INTERVAL '1 day', 'physical', 'Validation Room', CURRENT_TIMESTAMP - INTERVAL '2 days')`,
      [referral2],
    );
    const upcomingInitial = await client.query(
      'SELECT referral_id FROM public.vw_upcoming_interviews ORDER BY referral_id',
    );
    assert.deepEqual(
      upcomingInitial.rows.map((row) => row.referral_id),
      [referral1],
    );
    pass('upcoming interviews includes only future actionable interviews');

    await expectReject(
      client,
      "UPDATE public.application SET student_response='accepted', student_responded_at=CURRENT_TIMESTAMP WHERE application_id=$1",
      [resubmittedApplication],
      /only after company acceptance/,
      'student response requires company acceptance',
    );

    await client.query(
      "UPDATE public.referral SET company_response='accepted', company_responded_at=CURRENT_TIMESTAMP WHERE referral_id=$1",
      [referral1],
    );
    await client.query(
      "UPDATE public.application SET student_response='accepted', student_responded_at=CURRENT_TIMESTAMP WHERE application_id=$1",
      [resubmittedApplication],
    );
    await expectReject(
      client,
      "UPDATE public.application SET student_response='declined', student_responded_at=CURRENT_TIMESTAMP WHERE application_id=$1",
      [resubmittedApplication],
      /Invalid student response transition/,
      'terminal student response cannot transition',
    );
    await expectReject(
      client,
      "UPDATE public.referral SET company_response='pending', company_responded_at=NULL WHERE referral_id=$1",
      [referral1],
      /Invalid company response transition/,
      'terminal company response cannot transition',
    );

    const assignment1 = (
      await client.query(
        `INSERT INTO public.internship_assignment (
           referral_id, required_hours, start_date, expected_end_date,
           working_days, start_shift, end_shift
         ) VALUES ($1, 16, CURRENT_DATE, CURRENT_DATE + 10, 'weekdays', TIME '09:00', TIME '17:00')
         RETURNING internship_assignment_id`,
        [referral1],
      )
    ).rows[0].internship_assignment_id;
    pass('assignment hours remain independent of opportunity minimum hours');

    await expectReject(
      client,
      "UPDATE public.internship_assignment SET assignment_status='completed', end_date=CURRENT_DATE WHERE internship_assignment_id=$1",
      [assignment1],
      /Invalid assignment status transition/,
      'invalid assignment transition is rejected',
    );
    await client.query(
      "UPDATE public.internship_assignment SET assignment_status='ongoing' WHERE internship_assignment_id=$1",
      [assignment1],
    );

    await client.query(
      "UPDATE public.referral SET company_response='accepted', company_responded_at=CURRENT_TIMESTAMP WHERE referral_id=$1",
      [referral2],
    );
    await client.query(
      "UPDATE public.application SET student_response='accepted', student_responded_at=CURRENT_TIMESTAMP WHERE application_id=$1",
      [application2],
    );
    const assignment2 = (
      await client.query(
        `INSERT INTO public.internship_assignment (
           referral_id, required_hours, start_date, expected_end_date,
           working_days, start_shift, end_shift
         ) VALUES ($1, 80, CURRENT_DATE, CURRENT_DATE + 20, 'flexible', TIME '08:00', TIME '16:00')
         RETURNING internship_assignment_id`,
        [referral2],
      )
    ).rows[0].internship_assignment_id;

    const zeroAttendance = await client.query(
      `SELECT total_rendered_hours, attendance_record_count
       FROM public.vw_attendance_summary WHERE internship_assignment_id=$1`,
      [assignment2],
    );
    assert.equal(zeroAttendance.rows[0].total_rendered_hours, '0');
    assert.equal(zeroAttendance.rows[0].attendance_record_count, '0');
    pass('attendance summary includes zero-attendance assignments');

    const opportunity2 = (
      await client.query(
        `INSERT INTO public.opportunity (
           company_id, title, department, description, has_allowance,
           minimum_required_hours, work_arrangement, offered_slots, application_deadline
         ) VALUES ($1, 'Data Internship', 'Analytics', 'Second validation opportunity',
           false, 999, 'onsite', 1, CURRENT_TIMESTAMP + INTERVAL '30 days')
         RETURNING opportunity_id`,
        [company],
      )
    ).rows[0].opportunity_id;
    const application3 = (
      await client.query(
        'INSERT INTO public.application (student_id, opportunity_id) VALUES ($1, $2) RETURNING application_id',
        [student1, opportunity2],
      )
    ).rows[0].application_id;
    await client.query(
      "UPDATE public.application SET application_status='under_review' WHERE application_id=$1",
      [application3],
    );
    await client.query(
      "UPDATE public.application SET application_status='approved_for_referral' WHERE application_id=$1",
      [application3],
    );
    const referral3 = (
      await client.query(
        `INSERT INTO public.referral (application_id, peso_personnel_id, referral_document_file_path)
         VALUES ($1, $2, '/validation/referral-3.pdf') RETURNING referral_id`,
        [application3, personnel],
      )
    ).rows[0].referral_id;
    await client.query(
      "UPDATE public.referral SET referral_status='under_review', company_response='accepted', company_responded_at=CURRENT_TIMESTAMP WHERE referral_id=$1",
      [referral3],
    );
    await client.query(
      "UPDATE public.application SET student_response='accepted', student_responded_at=CURRENT_TIMESTAMP WHERE application_id=$1",
      [application3],
    );
    const assignment3 = (
      await client.query(
        `INSERT INTO public.internship_assignment (
           referral_id, required_hours, start_date, expected_end_date,
           working_days, start_shift, end_shift
         ) VALUES ($1, 40, CURRENT_DATE, CURRENT_DATE + 10, 'weekdays', TIME '09:00', TIME '17:00')
         RETURNING internship_assignment_id`,
        [referral3],
      )
    ).rows[0].internship_assignment_id;
    await expectReject(
      client,
      "UPDATE public.internship_assignment SET assignment_status='ongoing' WHERE internship_assignment_id=$1",
      [assignment3],
      /already has an ongoing assignment/,
      'one ongoing assignment per student',
    );

    const application4 = (
      await client.query(
        'INSERT INTO public.application (student_id, opportunity_id) VALUES ($1, $2) RETURNING application_id',
        [student2, opportunity2],
      )
    ).rows[0].application_id;
    await client.query(
      "UPDATE public.application SET application_status='under_review' WHERE application_id=$1",
      [application4],
    );
    await client.query(
      "SELECT set_config('app.current_user_account_id', '', true)",
    );
    await client.query(
      "UPDATE public.application SET application_status='withdrawn' WHERE application_id=$1",
      [application4],
    );
    const systemHistory = await client.query(
      `SELECT changed_by_user_account_id FROM public.application_status_history
       WHERE application_id=$1 AND new_application_status='withdrawn'`,
      [application4],
    );
    assert.equal(systemHistory.rows[0].changed_by_user_account_id, null);
    pass('system status transition records a null actor');
    await client.query(
      "SELECT set_config('app.current_user_account_id', $1, true)",
      [String(actorAccount)],
    );

    await client.query(
      `INSERT INTO public.attendance_record (internship_assignment_id, attendance_date, time_in, time_in_status)
       VALUES ($1, CURRENT_DATE, TIME '09:00', 'late')`,
      [assignment1],
    );
    await client.query(
      `INSERT INTO public.attendance_record (internship_assignment_id, attendance_date, time_in, time_in_status, time_out)
       VALUES ($1, CURRENT_DATE + 1, TIME '09:10', 'on_time', TIME '17:00')`,
      [assignment1],
    );
    await client.query(
      `INSERT INTO public.attendance_record (internship_assignment_id, attendance_date, time_in, time_in_status, time_out)
       VALUES ($1, CURRENT_DATE + 2, TIME '08:30', 'late', TIME '17:30')`,
      [assignment1],
    );
    await client.query(
      `INSERT INTO public.attendance_record (internship_assignment_id, attendance_date, time_in, time_in_status, time_out)
       VALUES ($1, CURRENT_DATE + 3, TIME '09:00', 'late', TIME '17:00')`,
      [assignment1],
    );

    const derived = await client.query(
      `SELECT attendance_date, time_in_status, hours_rendered, rendered_hours_status
       FROM public.attendance_record WHERE internship_assignment_id=$1 ORDER BY attendance_date`,
      [assignment1],
    );
    assert.deepEqual(
      derived.rows.map((row) => [
        row.time_in_status,
        row.hours_rendered,
        row.rendered_hours_status,
      ]),
      [
        ['on_time', null, 'incomplete'],
        ['late', '7.83', 'undertime'],
        ['on_time', '9.00', 'overtime'],
        ['on_time', '8.00', 'complete'],
      ],
    );
    pass('attendance values are derived from assignment shift data');

    const incompleteSummary = await client.query(
      `SELECT total_rendered_hours, incomplete_count, late_count, undertime_count, overtime_count
       FROM public.vw_attendance_summary WHERE internship_assignment_id=$1`,
      [assignment1],
    );
    assert.equal(incompleteSummary.rows[0].total_rendered_hours, '24.83');
    assert.equal(incompleteSummary.rows[0].incomplete_count, '1');
    assert.equal(incompleteSummary.rows[0].late_count, '1');
    assert.equal(incompleteSummary.rows[0].undertime_count, '1');
    assert.equal(incompleteSummary.rows[0].overtime_count, '1');
    pass('attendance summary ignores null rendered hours and preserves counts');

    await expectReject(
      client,
      `INSERT INTO public.attendance_record (internship_assignment_id, attendance_date, time_in, time_in_status)
       VALUES ($1, CURRENT_DATE, TIME '09:00', 'on_time')`,
      [assignment1],
      /uq_attendance_assignment_date/,
      'one attendance row per assignment date',
    );
    await expectReject(
      client,
      `INSERT INTO public.attendance_record (internship_assignment_id, attendance_date, time_in, time_in_status)
       VALUES ($1, CURRENT_DATE + 11, TIME '09:00', 'on_time')`,
      [assignment1],
      /outside the assignment period/,
      'attendance outside assignment period is rejected',
    );
    await expectReject(
      client,
      `INSERT INTO public.attendance_record (internship_assignment_id, attendance_date, time_in, time_in_status, time_out)
       VALUES ($1, CURRENT_DATE + 4, TIME '17:00', 'on_time', TIME '09:00')`,
      [assignment1],
      /time_out must be later than time_in/,
      'invalid attendance time order is rejected',
    );

    await client.query(
      `UPDATE public.attendance_record SET time_out=TIME '17:00'
       WHERE internship_assignment_id=$1 AND attendance_date=CURRENT_DATE`,
      [assignment1],
    );
    const correctedSummary = await client.query(
      `SELECT total_rendered_hours, incomplete_count, complete_count, completion_percentage
       FROM public.vw_attendance_summary WHERE internship_assignment_id=$1`,
      [assignment1],
    );
    assert.equal(correctedSummary.rows[0].total_rendered_hours, '32.83');
    assert.equal(correctedSummary.rows[0].incomplete_count, '0');
    assert.equal(correctedSummary.rows[0].complete_count, '2');
    assert.equal(correctedSummary.rows[0].completion_percentage, '205.19');
    pass(
      'attendance correction recalculates derivations without capping completion',
    );

    await expectReject(
      client,
      'INSERT INTO public.internship_feedback (internship_assignment_id, rating) VALUES ($1, 5)',
      [assignment1],
      /Feedback requires/,
      'feedback is rejected before assignment termination',
    );
    await client.query(
      "UPDATE public.internship_assignment SET assignment_status='completed', end_date=CURRENT_DATE + 3 WHERE internship_assignment_id=$1",
      [assignment1],
    );
    await client.query(
      "INSERT INTO public.internship_feedback (internship_assignment_id, rating, feedback_text) VALUES ($1, 5, 'Excellent')",
      [assignment1],
    );
    pass('feedback is accepted for a completed assignment');

    await client.query(
      "UPDATE public.user_account SET account_status='archived', deleted_at=CURRENT_TIMESTAMP WHERE user_account_id=$1",
      [studentAccount2],
    );
    await client.query(
      "UPDATE public.user_account SET account_status='active', deleted_at=NULL WHERE user_account_id=$1",
      [studentAccount2],
    );
    await client.query(
      "UPDATE public.user_account SET account_status='suspended' WHERE user_account_id=$1",
      [studentAccount2],
    );
    await client.query(
      "UPDATE public.user_account SET account_status='archived', deleted_at=CURRENT_TIMESTAMP WHERE user_account_id=$1",
      [studentAccount2],
    );
    await expectReject(
      client,
      "UPDATE public.user_account SET account_status='suspended', deleted_at=NULL WHERE user_account_id=$1",
      [studentAccount2],
      /Invalid account status transition/,
      'invalid archived-to-suspended account transition',
    );
    await client.query(
      "UPDATE public.user_account SET account_status='active', deleted_at=NULL WHERE user_account_id=$1",
      [studentAccount2],
    );
    const restored = await client.query(
      'SELECT account_status, deleted_at FROM public.user_account WHERE user_account_id=$1',
      [studentAccount2],
    );
    assert.equal(restored.rows[0].account_status, 'active');
    assert.equal(restored.rows[0].deleted_at, null);
    pass('account soft deletion and restoration');

    const accountHistory = await client.query(
      'SELECT changed_by_user_account_id FROM public.user_account_status_history WHERE user_account_id=$1',
      [studentAccount2],
    );
    assert.equal(accountHistory.rowCount, 5);
    assert.ok(
      accountHistory.rows.every(
        (row) => row.changed_by_user_account_id === actorAccount,
      ),
    );
    pass('status-history actor is propagated on the same transaction');

    const accountHistoryId = (
      await client.query(
        'SELECT user_account_status_history_id FROM public.user_account_status_history WHERE user_account_id=$1 LIMIT 1',
        [studentAccount2],
      )
    ).rows[0].user_account_status_history_id;
    await expectReject(
      client,
      'UPDATE public.user_account_status_history SET changed_at=CURRENT_TIMESTAMP WHERE user_account_status_history_id=$1',
      [accountHistoryId],
      /append-only/,
      'status history rejects updates',
    );
    await expectReject(
      client,
      'DELETE FROM public.user_account_status_history WHERE user_account_status_history_id=$1',
      [accountHistoryId],
      /append-only/,
      'status history rejects deletes',
    );

    await client.query(
      "UPDATE public.referral SET referral_status='closed' WHERE referral_id=$1",
      [referral1],
    );
    await client.query(
      "UPDATE public.opportunity SET opportunity_status='closed' WHERE opportunity_id=$1",
      [opportunity2],
    );
    await client.query(
      "UPDATE public.opportunity SET opportunity_status='archived' WHERE opportunity_id=$1",
      [opportunity2],
    );
    await expectReject(
      client,
      "UPDATE public.opportunity SET opportunity_status='open' WHERE opportunity_id=$1",
      [opportunity2],
      /Invalid opportunity status transition/,
      'invalid opportunity transition is rejected',
    );
    await client.query(
      "UPDATE public.opportunity SET opportunity_status='closed' WHERE opportunity_id=$1",
      [opportunity2],
    );
    await client.query(
      "UPDATE public.opportunity SET opportunity_status='open' WHERE opportunity_id=$1",
      [opportunity2],
    );
    pass('allowed opportunity transitions succeed');

    const studentView = await client.query(
      'SELECT * FROM public.vw_student_profile_details ORDER BY student_id',
    );
    assert.equal(studentView.rowCount, 2);
    assert.equal(studentView.rows[0].preferred_industries.length, 2);
    assert.deepEqual(studentView.rows[1].preferred_industries, []);
    pass(
      'student profile view has one row per student and aggregates industries',
    );

    const opportunityView = await client.query(
      'SELECT * FROM public.vw_opportunity_summary WHERE opportunity_id=$1',
      [opportunity1],
    );
    assert.equal(opportunityView.rowCount, 1);
    assert.equal(opportunityView.rows[0].offered_slots, 1);
    assert.equal(opportunityView.rows[0].total_application_count, '3');
    assert.equal(
      Object.hasOwn(opportunityView.rows[0], 'remaining_slots'),
      false,
    );
    pass('opportunity summary row grain, counts, and capacity semantics');

    const rejectedApplicationView = await client.query(
      'SELECT referral_id FROM public.vw_application_details WHERE application_id=$1',
      [application1],
    );
    assert.equal(rejectedApplicationView.rowCount, 1);
    assert.equal(rejectedApplicationView.rows[0].referral_id, null);
    const applicationCount = await client.query(
      'SELECT count(*) AS count FROM public.application',
    );
    const applicationViewCount = await client.query(
      'SELECT count(*) AS count FROM public.vw_application_details',
    );
    assert.equal(
      applicationViewCount.rows[0].count,
      applicationCount.rows[0].count,
    );
    pass(
      'application details includes rejected applications without referrals',
    );

    const referralCount = await client.query(
      'SELECT count(*) AS count FROM public.referral',
    );
    const referralViewCount = await client.query(
      'SELECT count(*) AS count FROM public.vw_referral_details',
    );
    assert.equal(referralViewCount.rows[0].count, referralCount.rows[0].count);
    pass('referral details contains exactly one row per referral');

    const upcomingFinal = await client.query(
      'SELECT count(*) AS count FROM public.vw_upcoming_interviews',
    );
    assert.equal(upcomingFinal.rows[0].count, '0');
    pass('upcoming interview view excludes past and non-actionable interviews');

    const assignmentCount = await client.query(
      'SELECT count(*) AS count FROM public.internship_assignment',
    );
    const assignmentViewCount = await client.query(
      'SELECT count(*) AS count FROM public.vw_internship_assignment_details',
    );
    const attendanceViewCount = await client.query(
      'SELECT count(*) AS count FROM public.vw_attendance_summary',
    );
    assert.equal(
      assignmentViewCount.rows[0].count,
      assignmentCount.rows[0].count,
    );
    assert.equal(
      attendanceViewCount.rows[0].count,
      assignmentCount.rows[0].count,
    );
    const assignmentFeedback = await client.query(
      'SELECT feedback_rating FROM public.vw_internship_assignment_details WHERE internship_assignment_id=$1',
      [assignment1],
    );
    assert.equal(assignmentFeedback.rows[0].feedback_rating, 5);
    pass('assignment and attendance views preserve one row per assignment');

    await client.query('SET CONSTRAINTS ALL IMMEDIATE');
    await client.query('COMMIT');
    pass('all deferred integrity constraints pass for valid fixtures');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }

  await expectTransactionReject(
    async (transaction) => {
      await transaction.query(
        `INSERT INTO public.user_account (email, password_hash, user_role)
         VALUES ('missing-profile@example.test', 'hash', 'student')`,
      );
    },
    /does not have exactly the profile permitted by role/,
    'deferred non-admin profile requirement',
  );

  await expectTransactionReject(
    async (transaction) => {
      const wrongAccount = await insertAccount(
        transaction,
        'wrong-profile@example.test',
        'company',
      );
      await insertStudent(transaction, wrongAccount, 'Wrong');
    },
    /requires account role student/,
    'role-specific profile enforcement',
  );

  await expectTransactionReject(
    async (transaction) => {
      await transaction.query(
        `INSERT INTO public.user_account (email, password_hash, user_role)
         VALUES ('passwordless-admin@example.test', NULL, 'admin')`,
      );
    },
    /requires a password hash/,
    'company, PESO personnel, and admin accounts require passwords',
  );

  await expectTransactionReject(
    async (transaction) => {
      const result = await transaction.query(
        `INSERT INTO public.user_account (email, password_hash, user_role)
         VALUES ('passwordless-student@example.test', NULL, 'student')
         RETURNING user_account_id`,
      );
      await insertStudent(
        transaction,
        result.rows[0].user_account_id,
        'Passwordless',
      );
    },
    /requires a password hash or OAuth identity/,
    'student accounts require at least one authentication method',
  );

  await expectTransactionReject(
    async (transaction) => {
      const accountId = await insertAccount(
        transaction,
        'oauth-admin@example.test',
        'admin',
      );
      await transaction.query(
        `INSERT INTO public.oauth_identity (
           user_account_id, authentication_provider, provider_subject, provider_email
         ) VALUES ($1, 'google', 'google-admin', 'oauth-admin@example.test')`,
        [accountId],
      );
    },
    /permitted only for student accounts/,
    'OAuth identities are student-only',
  );

  const googleOnlyClient = new Client(connection);
  await googleOnlyClient.connect();
  try {
    await googleOnlyClient.query('BEGIN');
    const googleOnlyAccount = (
      await googleOnlyClient.query(
        `INSERT INTO public.user_account (email, password_hash, user_role)
         VALUES ('google-only@example.test', NULL, 'student')
         RETURNING user_account_id`,
      )
    ).rows[0].user_account_id;
    await insertStudent(googleOnlyClient, googleOnlyAccount, 'GoogleOnly');
    await googleOnlyClient.query(
      `INSERT INTO public.oauth_identity (
         user_account_id, authentication_provider, provider_subject, provider_email
       ) VALUES ($1, 'google', 'google-only-subject', 'google-only@example.test')`,
      [googleOnlyAccount],
    );
    await googleOnlyClient.query('COMMIT');
    pass('Google-only student account passes deferred integrity checks');
  } catch (error) {
    await googleOnlyClient.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await googleOnlyClient.end();
  }

  const dataSource = require('../../dist/config/data-source.js').default;
  const {
    withStatusActor,
  } = require('../../dist/database/status-actor.transaction.js');
  await dataSource.initialize();
  try {
    const actor = (
      await dataSource.query(
        "SELECT user_account_id FROM public.user_account WHERE email='actor@example.test'",
      )
    )[0].user_account_id;
    const assignment = (
      await dataSource.query(
        'SELECT internship_assignment_id FROM public.internship_assignment WHERE required_hours=40',
      )
    )[0].internship_assignment_id;
    await withStatusActor(dataSource, actor, (queryRunner) =>
      queryRunner.query(
        "UPDATE public.internship_assignment SET assignment_status='withdrawn' WHERE internship_assignment_id=$1",
        [assignment],
      ),
    );
    const helperHistory = (
      await dataSource.query(
        `SELECT changed_by_user_account_id
         FROM public.internship_assignment_status_history
         WHERE internship_assignment_id=$1 AND new_assignment_status='withdrawn'`,
        [assignment],
      )
    )[0];
    assert.equal(helperHistory.changed_by_user_account_id, actor);
    pass(
      'compiled TypeORM helper propagates actor on one transaction-bound QueryRunner',
    );
  } finally {
    await dataSource.destroy();
  }

  console.log(`PASS SUMMARY ${passed.length} behavioral checks`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
