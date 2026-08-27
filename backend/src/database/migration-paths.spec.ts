import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { seedReferenceData, APPROVED_INDUSTRIES } from './seeds/reference.seed';

describe('Database migration paths and behavioral validation', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;

  const migration001Sql = readFileSync(
    join(__dirname, 'migrations', '001_initial_schema.sql'),
    'utf8',
  );
  const migration002Sql = readFileSync(
    join(__dirname, 'migrations', '002_approved_database_redesign.sql'),
    'utf8',
  );
  const migration002DownSql = readFileSync(
    join(__dirname, 'migrations', '002_approved_database_redesign.down.sql'),
    'utf8',
  );

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('migration_test_db')
      .withUsername('migration_user')
      .withPassword('test_password')
      .start();

    dataSource = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      synchronize: false,
      migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
      migrationsTransactionMode: 'none',
    });
    await dataSource.initialize();
  }, 120_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    if (container) {
      await container.stop();
    }
  });

  it('Fresh path: executes migrations through runner on an empty DB, validates final schema and seeds reference data idempotently', async () => {
    await dataSource.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);

    // Run migrations using TypeORM
    await dataSource.runMigrations();

    const migrationRows = await dataSource.query(`SELECT name FROM public.migrations ORDER BY timestamp`);
    expect(migrationRows.map((r: any) => r.name)).toEqual([
      'InitialSchema1785860400000',
      'ApprovedDatabaseRedesign1787788800000',
    ]);

    // Validate redesigned columns
    const columns: Array<{ table_name: string; column_name: string; data_type: string; is_nullable: string }> =
      await dataSource.query(`
        SELECT table_name, column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND (
          (table_name = 'user_account' AND column_name = 'suspended_until') OR
          (table_name = 'company' AND column_name = 'logo_file_path') OR
          (table_name = 'opportunity' AND column_name = 'allowance') OR
          (table_name = 'internship_assignment' AND column_name = 'deleted_at')
        )
      `);
    expect(columns.length).toBe(4);

    // Validate views
    const views: Array<{ table_name: string }> = await dataSource.query(`
      SELECT table_name FROM information_schema.views WHERE table_schema = 'public'
    `);
    const viewNames = new Set(views.map((v) => v.table_name));
    for (const view of [
      'vw_student_profile_details',
      'vw_opportunity_summary',
      'vw_application_details',
      'vw_referral_details',
      'vw_internship_assignment_details',
      'vw_attendance_summary',
    ]) {
      expect(viewNames.has(view)).toBe(true);
    }

    // Seed reference data and verify idempotency
    const initialSeed = await seedReferenceData(dataSource);
    expect(initialSeed.every((r) => r.outcome === 'inserted')).toBe(true);

    const secondSeed = await seedReferenceData(dataSource);
    expect(secondSeed.every((r) => r.outcome === 'already existed')).toBe(true);

    const industries = await dataSource.query(
      `SELECT count(*)::int AS count FROM public.industry WHERE is_custom_text = false`,
    );
    expect(industries[0].count).toBe(APPROVED_INDUSTRIES.length);
  });

  it('Historical AuthAlignmentV3 upgrade path: reproduces historical schema & data, runs redesign migration, preserves history, and validates', async () => {
    // Reset schema to historical InitialSchema + AuthAlignmentV3 state
    await dataSource.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
    await dataSource.query(migration001Sql);

    // Setup TypeORM migrations table with historical InitialSchema + AuthAlignmentV3
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS public.migrations (
        id SERIAL PRIMARY KEY,
        timestamp BIGINT NOT NULL,
        name VARCHAR NOT NULL
      );
      INSERT INTO public.migrations (timestamp, name) VALUES
        (1785860400000, 'InitialSchema1785860400000'),
        (1786125600000, 'AuthAlignmentV31786125600000');
    `);

    // Insert representative legacy fixtures
    await dataSource.query(`
      BEGIN;

      INSERT INTO public.industry (industry_name, is_custom_text)
      VALUES ('Information Technology', false);

      INSERT INTO public.user_account (email, user_role, account_status, deleted_at)
      VALUES
        ('legacy-active@example.test', 'student', 'active', NULL),
        ('legacy-suspended@example.test', 'student', 'suspended', NULL),
        ('legacy-archived@example.test', 'student', 'archived', CURRENT_TIMESTAMP),
        ('legacy-company@example.test', 'company', 'active', NULL),
        ('legacy-peso@example.test', 'peso_personnel', 'active', NULL);

      INSERT INTO public.local_authentication_credential (user_account_id, password_hash)
      SELECT user_account_id, '$2b$10$abcdefghijklmnopqrstuv'
      FROM public.user_account;

      INSERT INTO public.company (user_account_id, industry_id, company_name, company_type, description, address_line, address_barangay, address_city, contact_email, contact_number, contact_person_first_name, contact_person_last_name, logo_file_path)
      VALUES (
        (SELECT user_account_id FROM public.user_account WHERE email = 'legacy-company@example.test'),
        (SELECT industry_id FROM public.industry WHERE industry_name = 'Information Technology'),
        'Legacy Tech Corp', 'private', 'Legacy company description', '123 Tech St', 'Brgy 1', 'Quezon City', 'corp@example.test', '09123456789', 'John', 'Doe', '/uploads/logos/legacy.png'
      );

      INSERT INTO public.opportunity (company_id, title, department, description, minimum_required_hours, work_arrangement, offered_slots, has_allowance, allowance, application_deadline, opportunity_status)
      VALUES
        ((SELECT company_id FROM public.company WHERE company_name = 'Legacy Tech Corp'), 'Paid Role', 'IT', 'Paid description', 200, 'onsite', 2, true, 5000.50, '2099-01-01', 'open'),
        ((SELECT company_id FROM public.company WHERE company_name = 'Legacy Tech Corp'), 'Unpaid Role', 'IT', 'Unpaid description', 200, 'onsite', 2, false, NULL, '2099-01-01', 'open');

      INSERT INTO public.student (user_account_id, first_name, last_name, sex, birth_date, contact_number, contact_email, address_line, address_barangay, address_district, address_city, inquiry_method)
      VALUES
        ((SELECT user_account_id FROM public.user_account WHERE email = 'legacy-active@example.test'), 'Active', 'Student', 'Male', '2000-01-01', '09123456789', 'legacy-active@example.test', '456 Student St', 'Brgy 2', 'District 1', 'Quezon City', 'walk_in'),
        ((SELECT user_account_id FROM public.user_account WHERE email = 'legacy-suspended@example.test'), 'Suspended', 'Student', 'Male', '2000-01-01', '09123456788', 'legacy-suspended@example.test', '456 Student St', 'Brgy 2', 'District 1', 'Quezon City', 'walk_in'),
        ((SELECT user_account_id FROM public.user_account WHERE email = 'legacy-archived@example.test'), 'Archived', 'Student', 'Male', '2000-01-01', '09123456787', 'legacy-archived@example.test', '456 Student St', 'Brgy 2', 'District 1', 'Quezon City', 'walk_in');

      INSERT INTO public.application (student_id, opportunity_id, application_status)
      VALUES (
        (SELECT student_id FROM public.student WHERE contact_email = 'legacy-active@example.test'),
        (SELECT opportunity_id FROM public.opportunity WHERE title = 'Paid Role'),
        'submitted'
      );

      UPDATE public.application
      SET application_status = 'under_review'
      WHERE application_status = 'submitted';

      UPDATE public.application
      SET application_status = 'approved_for_referral'
      WHERE application_status = 'under_review';

      INSERT INTO public.peso_personnel (user_account_id, first_name, last_name, employee_id, sex, birth_date, contact_number, contact_email, address_line, address_barangay, address_district, address_city, position, department, employee_id_file_path)
      VALUES (
        (SELECT user_account_id FROM public.user_account WHERE email = 'legacy-peso@example.test'),
        'Peso', 'Officer', 'PESO-001', 'Female', '1985-01-01', '09123456780', 'peso@example.test', '789 City Hall', 'Brgy 3', 'District 1', 'Quezon City', 'Officer', 'Employment', '/uploads/ids/peso.pdf'
      );

      INSERT INTO public.referral (application_id, peso_personnel_id, referral_document_file_path, referral_status, company_response)
      VALUES (
        (SELECT application_id FROM public.application LIMIT 1),
        (SELECT peso_personnel_id FROM public.peso_personnel LIMIT 1),
        '/uploads/referrals/ref-1.pdf',
        'sent',
        'pending'
      );

      UPDATE public.referral
      SET referral_status = 'under_review', company_response = 'accepted', company_responded_at = CURRENT_TIMESTAMP
      WHERE referral_status = 'sent';

      UPDATE public.application
      SET student_response = 'accepted', student_responded_at = CURRENT_TIMESTAMP
      WHERE application_id = (SELECT application_id FROM public.application LIMIT 1);

      INSERT INTO public.internship_assignment (referral_id, required_hours, start_date, expected_end_date, working_days, start_shift, end_shift, assignment_status)
      VALUES (
        (SELECT referral_id FROM public.referral LIMIT 1),
        200, '2026-08-01', '2026-08-31', 'weekdays', '08:00', '17:00', 'pending'
      );

      UPDATE public.internship_assignment
      SET assignment_status = 'ongoing'
      WHERE assignment_status = 'pending';

      INSERT INTO public.attendance_record (internship_assignment_id, attendance_date, time_in, time_out)
      VALUES (
        (SELECT internship_assignment_id FROM public.internship_assignment LIMIT 1),
        '2026-08-10', '08:00:00', '17:00:00'
      );

      COMMIT;
    `);

    // Run pending migrations through TypeORM runner
    await dataSource.runMigrations();

    // Assert that AuthAlignmentV3 remains recorded and ApprovedDatabaseRedesign is appended
    const updatedMigrations = await dataSource.query(`SELECT name FROM public.migrations ORDER BY timestamp`);
    expect(updatedMigrations.map((r: any) => r.name)).toEqual([
      'InitialSchema1785860400000',
      'AuthAlignmentV31786125600000',
      'ApprovedDatabaseRedesign1787788800000',
    ]);

    // Assert conversions
    const oppWithAllowance = await dataSource.query(`
      SELECT allowance, has_allowance FROM public.vw_opportunity_summary WHERE title = 'Paid Role'
    `);
    expect(oppWithAllowance[0].allowance).toBe('5000.50');
    expect(oppWithAllowance[0].has_allowance).toBe(true);

    const oppWithoutAllowance = await dataSource.query(`
      SELECT allowance, has_allowance FROM public.vw_opportunity_summary WHERE title = 'Unpaid Role'
    `);
    expect(oppWithoutAllowance[0].allowance).toBeNull();
    expect(oppWithoutAllowance[0].has_allowance).toBe(false);

    // Suspended accounts backfill
    const suspended = await dataSource.query(`
      SELECT email, suspended_until FROM public.user_account WHERE account_status = 'suspended'
    `);
    expect(suspended[0].suspended_until).not.toBeNull();

    // Attendance recalculated with 1-hour lunch break (08:00 - 17:00 = 9h - 1h = 8h rendered)
    const attendance = await dataSource.query(`
      SELECT hours_rendered, rendered_hours_status FROM public.attendance_record LIMIT 1
    `);
    expect(Number(attendance[0].hours_rendered)).toBe(8);
    expect(attendance[0].rendered_hours_status).toBe('complete');

    // Test soft delete behavior
    const assignmentId = (await dataSource.query(`SELECT internship_assignment_id FROM public.internship_assignment LIMIT 1`))[0].internship_assignment_id;
    await dataSource.query(
      `UPDATE public.internship_assignment SET deleted_at = CURRENT_TIMESTAMP WHERE internship_assignment_id = $1`,
      [assignmentId],
    );

    const viewRows = await dataSource.query(
      `SELECT * FROM public.vw_internship_assignment_details WHERE internship_assignment_id = $1`,
      [assignmentId],
    );
    expect(viewRows.length).toBe(0);

    // Test seed idempotency on upgraded database
    const seedResult = await seedReferenceData(dataSource);
    expect(seedResult.length).toBeGreaterThan(0);

    // Test irreversible down migration constraint
    await expect(dataSource.query(migration002DownSql)).rejects.toThrow(/ApprovedDatabaseRedesign1787788800000 is irreversible/);
  });
});
