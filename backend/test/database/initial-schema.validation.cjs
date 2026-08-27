const assert = require('node:assert/strict');
const { Client } = require('pg');

const databaseName = process.env.DATABASE_NAME || '';
if (!databaseName.toLowerCase().includes('validation')) {
  throw new Error(
    'Refusing to run destructive fixture validation unless DATABASE_NAME contains "validation".',
  );
}

const connection = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT || 5433),
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD,
  database: databaseName,
};

const passed = [];

function pass(name) {
  passed.push(name);
  console.log(`PASS ${name}`);
}

async function expectReject(client, sql, params, pattern, name) {
  await client.query('SAVEPOINT expected_rejection');
  let error;
  try {
    await client.query(sql, params);
  } catch (caught) {
    error = caught;
  }
  await client.query('ROLLBACK TO SAVEPOINT expected_rejection');
  await client.query('RELEASE SAVEPOINT expected_rejection');
  assert.ok(error, `${name}: expected rejection`);
  if (pattern) assert.match(error.message, pattern);
  pass(name);
}

async function main() {
  const client = new Client(connection);
  await client.connect();

  try {
    const version = await client.query(
      "SELECT current_setting('server_version_num')::integer AS version",
    );
    assert.ok(version.rows[0].version >= 160000 && version.rows[0].version < 170000);
    pass('PostgreSQL major version is 16');

    const migrations = await client.query(
      `SELECT name FROM public.migrations ORDER BY timestamp`,
    );
    assert.deepEqual(
      migrations.rows.map((row) => row.name),
      ['InitialSchema1772236800000', 'ApprovedDatabaseRedesign1787788800000'],
    );
    pass('initial and approved-redesign migrations are recorded');

    const removedColumns = await client.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND (
        (table_name = 'opportunity' AND column_name = 'has_allowance') OR
        (table_name = 'peso_personnel' AND column_name IN (
          'employee_id_file_path', 'employee_id_file_mime_type',
          'verification_status', 'reviewed_at',
          'reviewed_by_user_account_id', 'verification_remark'
        ))
      )
    `);
    assert.equal(removedColumns.rowCount, 0);
    pass('retired opportunity and PESO columns are absent');

    const historyTable = await client.query(`
      SELECT to_regclass('public.peso_personnel_verification_status_history') AS relation
    `);
    assert.equal(historyTable.rows[0].relation, null);
    pass('retired PESO verification history table is absent');

    const requiredColumns = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND (
        (table_name = 'user_account' AND column_name = 'suspended_until') OR
        (table_name = 'company' AND column_name = 'logo_file_path') OR
        (table_name = 'opportunity' AND column_name = 'allowance') OR
        (table_name = 'internship_assignment' AND column_name = 'deleted_at')
      )
      ORDER BY table_name, column_name
    `);
    assert.equal(requiredColumns.rowCount, 4);
    const columns = new Map(
      requiredColumns.rows.map((row) => [`${row.table_name}.${row.column_name}`, row]),
    );
    assert.equal(columns.get('user_account.suspended_until').is_nullable, 'YES');
    assert.equal(columns.get('company.logo_file_path').is_nullable, 'YES');
    assert.equal(columns.get('opportunity.allowance').data_type, 'text');
    assert.equal(columns.get('opportunity.allowance').is_nullable, 'YES');
    assert.equal(columns.get('internship_assignment.deleted_at').is_nullable, 'YES');
    pass('redesigned columns have the expected types and nullability');

    const yearLevels = await client.query(`
      SELECT enumlabel
      FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'year_level_enum'
      ORDER BY e.enumsortorder
    `);
    assert.deepEqual(yearLevels.rows.map((row) => row.enumlabel), [
      'grade_11',
      'grade_12',
      'first_year_college',
      'second_year_college',
      'third_year_college',
      'fourth_year_college',
    ]);
    pass('fifth-year college is removed from the year-level enum');

    const views = await client.query(`
      SELECT table_name FROM information_schema.views
      WHERE table_schema = 'public'
    `);
    const viewNames = new Set(views.rows.map((row) => row.table_name));
    for (const name of [
      'vw_student_profile',
      'vw_opportunity_catalog',
      'vw_application_tracking',
      'vw_referral_tracking',
      'vw_assignment_summary',
      'vw_attendance_summary',
      'vw_peso_personnel_profile',
    ]) {
      assert.ok(viewNames.has(name), `missing ${name}`);
    }
    const catalogColumns = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'vw_opportunity_catalog'
    `);
    assert.ok(catalogColumns.rows.some((row) => row.column_name === 'has_allowance'));
    assert.ok(catalogColumns.rows.some((row) => row.column_name === 'allowance'));
    pass('dependent views were rebuilt with compatibility allowance output');

    const functions = await client.query(`
      SELECT p.proname, pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN ('fn_calculate_attendance_hours', 'fn_validate_referral_transition')
    `);
    const definitions = new Map(
      functions.rows.map((row) => [row.proname, row.definition.toLowerCase()]),
    );
    assert.match(definitions.get('fn_calculate_attendance_hours'), /interval '1 hour'/);
    assert.match(definitions.get('fn_validate_referral_transition'), /accepted.*rejected/s);
    pass('attendance deduction and accepted-to-rejected referral transition are installed');

    await client.query('BEGIN');
    const active = await client.query(
      `INSERT INTO public.user_account (email, user_role)
       VALUES ('migration-validation-active@example.test', 'student')
       RETURNING user_account_id`,
    );
    const accountId = active.rows[0].user_account_id;

    await expectReject(
      client,
      `UPDATE public.user_account
       SET account_status = 'suspended', suspended_until = NULL
       WHERE user_account_id = $1`,
      [accountId],
      /ck_user_account_suspension_window/,
      'suspended accounts require a future suspension deadline',
    );

    await client.query(
      `UPDATE public.user_account
       SET account_status = 'suspended', suspended_until = CURRENT_TIMESTAMP + INTERVAL '2 days'
       WHERE user_account_id = $1`,
      [accountId],
    );
    await expectReject(
      client,
      `UPDATE public.user_account SET account_status = 'active' WHERE user_account_id = $1`,
      [accountId],
      /ck_user_account_suspension_window/,
      'non-suspended accounts cannot retain a suspension deadline',
    );
    await client.query(
      `UPDATE public.user_account
       SET account_status = 'active', suspended_until = NULL
       WHERE user_account_id = $1`,
      [accountId],
    );
    await client.query('ROLLBACK');

    const softDeleteIndex = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'internship_assignment'
        AND indexdef ILIKE '%deleted_at%'
    `);
    assert.ok(softDeleteIndex.rowCount > 0);
    pass('internship-assignment soft-delete index is present');

    console.log(`\n${passed.length} final-schema validation checks passed.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
