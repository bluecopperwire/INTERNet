require('dotenv').config();
const assert = require('node:assert/strict');
const { Client } = require('pg');

const databaseName = process.env.DATABASE_NAME || 'internet_db';

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

async function main() {
  const client = new Client(connection);
  await client.connect();

  try {
    const version = await client.query(
      "SELECT current_setting('server_version_num')::integer AS version",
    );
    assert.ok(
      version.rows[0].version >= 160000 && version.rows[0].version < 170000,
      'PostgreSQL version must be 16.x',
    );
    pass('PostgreSQL major version is 16');

    const migrations = await client.query(
      `SELECT name FROM public.migrations ORDER BY timestamp`,
    );
    const migrationNames = migrations.rows.map((row) => row.name);
    const requiredMigrations = [
      'InitialSchema1785860400000',
      'ApprovedDatabaseRedesign1787788800000',
    ];
    const recognizedHistoricalMigrations = new Set([
      'AuthAlignmentV31786125600000',
    ]);

    for (const req of requiredMigrations) {
      const count = migrationNames.filter((name) => name === req).length;
      assert.equal(
        count,
        1,
        `Required migration ${req} must be recorded exactly once. Found: ${count}`,
      );
    }

    const unknownMigrations = migrationNames.filter(
      (name) =>
        !requiredMigrations.includes(name) &&
        !recognizedHistoricalMigrations.has(name),
    );
    assert.equal(
      unknownMigrations.length,
      0,
      `Unsupported migration lineage detected with unknown migrations: ${unknownMigrations.join(', ')}`,
    );

    const hasAuthAlignment = migrationNames.includes('AuthAlignmentV31786125600000');
    if (hasAuthAlignment) {
      const authCount = migrationNames.filter((name) => name === 'AuthAlignmentV31786125600000').length;
      assert.equal(authCount, 1, 'Historical AuthAlignmentV31786125600000 cannot appear more than once.');
      pass('recognized historical migration AuthAlignmentV31786125600000 is present and valid');
    }
    pass('initial and approved-redesign migrations are recorded');

    const canonicalAuthTables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'local_authentication_credential',
          'external_authentication_identity',
          'authentication_session',
          'registration_onboarding'
        )
    `);
    assert.equal(canonicalAuthTables.rowCount, 4, 'Canonical authentication tables must all exist.');
    const retiredAuthObjects = await client.query(`
      SELECT
        to_regclass('public.oauth_identity') AS oauth_identity,
        to_regclass('public.auth_session') AS auth_session,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'user_account' AND column_name = 'password_hash'
        ) AS password_hash
    `);
    assert.equal(retiredAuthObjects.rows[0].oauth_identity, null, 'Historical oauth_identity table must be removed.');
    assert.equal(retiredAuthObjects.rows[0].auth_session, null, 'Historical auth_session table must be removed.');
    assert.equal(retiredAuthObjects.rows[0].password_hash, false, 'Historical user_account.password_hash column must be removed.');
    const accountsWithoutAuth = await client.query(`
      SELECT ua.user_account_id
      FROM public.user_account ua
      LEFT JOIN public.local_authentication_credential lac ON lac.user_account_id = ua.user_account_id
      LEFT JOIN public.external_authentication_identity eai ON eai.user_account_id = ua.user_account_id
      GROUP BY ua.user_account_id
      HAVING count(lac.user_account_id) + count(eai.external_authentication_identity_id) = 0
    `);
    assert.equal(accountsWithoutAuth.rowCount, 0, 'Every account must retain a local credential or external identity.');
    pass('canonical authentication schema is present and historical authentication objects are absent');

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
    assert.equal(removedColumns.rowCount, 0, 'Retired opportunity and PESO columns must be absent');
    pass('retired opportunity and PESO columns are absent');

    const historyTable = await client.query(`
      SELECT to_regclass('public.peso_personnel_verification_history') AS relation
    `);
    assert.equal(historyTable.rows[0].relation, null, 'Retired PESO verification history table must be dropped');
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
    assert.equal(requiredColumns.rowCount, 4, 'All four redesigned columns must exist');
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
      'vw_student_profile_details',
      'vw_opportunity_summary',
      'vw_application_details',
      'vw_referral_details',
      'vw_internship_assignment_details',
      'vw_attendance_summary',
    ]) {
      assert.ok(viewNames.has(name), `missing view ${name}`);
    }
    const summaryColumns = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'vw_opportunity_summary'
    `);
    assert.ok(summaryColumns.rows.some((row) => row.column_name === 'has_allowance'), 'vw_opportunity_summary missing has_allowance');
    assert.ok(summaryColumns.rows.some((row) => row.column_name === 'allowance'), 'vw_opportunity_summary missing allowance');
    pass('dependent views were rebuilt with compatibility allowance output');

    const functions = await client.query(`
      SELECT p.proname, pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN ('fn_derive_attendance', 'fn_validate_referral')
    `);
    const definitions = new Map(
      functions.rows.map((row) => [row.proname, row.definition.toLowerCase()]),
    );
    assert.ok(definitions.has('fn_derive_attendance'), 'missing fn_derive_attendance function');
    assert.match(definitions.get('fn_derive_attendance'), /interval '1 hour'/, 'fn_derive_attendance missing 1 hour deduction');
    assert.ok(definitions.has('fn_validate_referral'), 'missing fn_validate_referral function');
    assert.match(definitions.get('fn_validate_referral'), /accepted.*rejected/s, 'fn_validate_referral missing accepted -> rejected transition');
    pass('attendance deduction and accepted-to-rejected referral transition are installed');

    const suspensionConstraint = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) AS def
      FROM pg_constraint
      WHERE conname = 'ck_user_account_suspension_expiry'
    `);
    assert.equal(suspensionConstraint.rowCount, 1, 'ck_user_account_suspension_expiry constraint must exist');
    pass('suspension status/deadline constraint is present');

    const softDeleteIndex = await client.query(`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'internship_assignment'
        AND indexdef ILIKE '%deleted_at%'
    `);
    assert.ok(softDeleteIndex.rowCount > 0, 'internship_assignment soft-delete index is required');
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
