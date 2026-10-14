import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { AuthService } from '../../auth/auth.service';
import {
  AuthenticationSession,
  Company,
  ExternalAuthenticationIdentity,
  LocalAuthenticationCredential,
  PesoPersonnel,
  Student,
  UserAccount,
} from '../../users/entities/account.entities';
import { UsersService } from '../../users/users.service';
import {
  DEVELOPMENT_COMPANY_FIXTURES,
  DEVELOPMENT_STUDENT_FIXTURES,
  DEVELOPMENT_WORKFLOW_TIMELINE,
} from './development.seed.fixtures';

jest.setTimeout(180_000);

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
] as const;

const newLocalAccounts = [
  ...DEVELOPMENT_COMPANY_FIXTURES.map((fixture) => ({
    email: fixture.loginEmail,
    role: 'company',
    profile: 'company',
  })),
  ...DEVELOPMENT_STUDENT_FIXTURES.map((fixture) => ({
    email: fixture.loginEmail,
    role: 'student',
    profile: 'student',
  })),
] as const;

const seedOwnedEmails = [
  ...legacySeedOwnedEmails,
  ...newLocalAccounts.map((account) => account.email),
];

function runBackendNpmScript(scriptName: string, env: NodeJS.ProcessEnv) {
  const npmCliPath =
    process.env.npm_execpath ??
    join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  return spawnSync(process.execPath, [npmCliPath, 'run', scriptName], {
    cwd: join(__dirname, '..', '..', '..'),
    encoding: 'utf8',
    env,
  });
}

function restoreEnvironmentValue(
  name: string,
  value: string | undefined,
): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function dateOnly(value: unknown): string {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

function timestamp(value: unknown): number {
  return value instanceof Date
    ? value.getTime()
    : new Date(String(value)).getTime();
}

function expectedRenderedMinutes(
  timeIn: string | null,
  timeOut: string | null,
): number {
  if (timeIn === null || timeOut === null) return 0;
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  };
  return Math.max(0, toMinutes(timeOut) - toMinutes(timeIn) - 60);
}

async function captureSeedSnapshot(dataSource: DataSource): Promise<unknown> {
  const [row] = await dataSource.query<Array<{ snapshot: unknown }>>(
    `SELECT json_build_object(
       'seedAccountIds', (
         SELECT json_agg(user_account_id ORDER BY email)
           FROM public.user_account WHERE email = ANY($1::text[])
       ),
       'companyIds', (
         SELECT json_agg(company_id ORDER BY company_id) FROM public.company
       ),
       'opportunityIds', (
         SELECT json_agg(opportunity_id ORDER BY opportunity_id)
           FROM public.opportunity
       ),
       'studentIds', (
         SELECT json_agg(student_id ORDER BY student_id) FROM public.student
       ),
       'applicationIds', (
         SELECT json_agg(application_id ORDER BY application_id)
           FROM public.application
       ),
       'referralIds', (
         SELECT json_agg(referral_id ORDER BY referral_id) FROM public.referral
       ),
       'interviewIds', (
         SELECT json_agg(interview_id ORDER BY interview_id)
           FROM public.interview
       ),
       'assignmentIds', (
         SELECT json_agg(internship_assignment_id
                         ORDER BY internship_assignment_id)
           FROM public.internship_assignment
       ),
       'attendanceIds', (
         SELECT json_agg(attendance_record_id ORDER BY attendance_record_id)
           FROM public.attendance_record
       ),
       'feedbackIds', (
         SELECT json_agg(internship_feedback_id
                         ORDER BY internship_feedback_id)
           FROM public.internship_feedback
       ),
       'applicationHistoryCount', (
         SELECT count(*) FROM public.application_status_history
       ),
       'referralHistoryCount', (
         SELECT count(*) FROM public.referral_status_history
       ),
       'assignmentHistoryCount', (
         SELECT count(*)
           FROM public.internship_assignment_status_history
       )
     ) AS snapshot`,
    [seedOwnedEmails],
  );
  return row.snapshot;
}

describe('realistic development seed', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let authService: AuthService;
  let usersService: UsersService;
  const previousEnvironment = {
    nodeEnv: process.env.NODE_ENV,
    allowDevSeed: process.env.ALLOW_DEV_SEED,
    password: process.env.DEV_SEED_PASSWORD,
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_DEV_SEED = 'true';
    process.env.DEV_SEED_PASSWORD = 'TestPassword123';

    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('development_seed_test_db')
      .withUsername('development_seed_user')
      .withPassword('development_seed_password')
      .start();
    dataSource = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      synchronize: false,
      entities: [
        UserAccount,
        LocalAuthenticationCredential,
        ExternalAuthenticationIdentity,
        AuthenticationSession,
        PesoPersonnel,
        Student,
        Company,
      ],
      migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
      migrationsTransactionMode: 'none',
    });
    await dataSource.initialize();
    await dataSource.runMigrations();

    usersService = new UsersService(
      dataSource.getRepository(UserAccount),
      dataSource.getRepository(LocalAuthenticationCredential),
      dataSource.getRepository(ExternalAuthenticationIdentity),
      dataSource.getRepository(AuthenticationSession),
      dataSource.getRepository(PesoPersonnel),
      dataSource.getRepository(Student),
      dataSource.getRepository(Company),
    );
    authService = new AuthService(
      usersService,
      {} as JwtService,
      {} as ConfigService,
      dataSource,
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    if (container) await container.stop();

    restoreEnvironmentValue('NODE_ENV', previousEnvironment.nodeEnv);
    restoreEnvironmentValue('ALLOW_DEV_SEED', previousEnvironment.allowDevSeed);
    restoreEnvironmentValue('DEV_SEED_PASSWORD', previousEnvironment.password);
  });

  it('seeds complete workflow fixtures, authenticates every new account, and is repeatable', async () => {
    const disposableEnvironment = {
      ...process.env,
      NODE_ENV: 'test',
      ALLOW_DEV_SEED: 'true',
      DATABASE_HOST: container.getHost(),
      DATABASE_PORT: String(container.getPort()),
      DATABASE_USER: container.getUsername(),
      DATABASE_PASSWORD: container.getPassword(),
      DATABASE_NAME: container.getDatabase(),
    };
    const firstSeedRun = runBackendNpmScript('seed:dev', disposableEnvironment);
    expect(firstSeedRun.error).toBeUndefined();
    if (firstSeedRun.status !== 0) {
      throw new Error(
        `npm run seed:dev failed:\n${firstSeedRun.stdout}\n${firstSeedRun.stderr}`,
      );
    }
    expect(firstSeedRun.stdout).toContain('49 seed-owned accounts');

    expect(DEVELOPMENT_COMPANY_FIXTURES).toHaveLength(9);
    expect(
      DEVELOPMENT_COMPANY_FIXTURES.flatMap((company) => company.opportunities),
    ).toHaveLength(27);
    expect(DEVELOPMENT_STUDENT_FIXTURES).toHaveLength(27);
    expect(newLocalAccounts).toHaveLength(36);
    expect(seedOwnedEmails).toHaveLength(49);
    expect(new Set(seedOwnedEmails).size).toBe(seedOwnedEmails.length);

    const companyRows = await dataSource.query<Array<Record<string, unknown>>>(
      `SELECT ua.email, ua.user_account_id, ua.user_role, ua.account_status,
              ua.created_at AS account_created_at,
              c.company_id, c.company_name, c.company_type, c.description,
              c.created_at AS company_created_at,
              c.website_url, c.year_established, c.company_size,
              c.contact_email, c.contact_number,
              c.contact_person_first_name, c.contact_person_middle_name,
              c.contact_person_last_name, c.address_line, c.address_barangay,
              c.address_district, c.address_city, i.industry_name,
              (SELECT count(*)::integer FROM public.local_authentication_credential lac
                WHERE lac.user_account_id = ua.user_account_id) AS local_count,
              (SELECT min(lac.created_at) FROM public.local_authentication_credential lac
                WHERE lac.user_account_id = ua.user_account_id) AS credential_created_at,
              (SELECT count(*)::integer FROM public.external_authentication_identity eai
                WHERE eai.user_account_id = ua.user_account_id) AS google_count,
              (SELECT count(*)::integer FROM public.company other
                WHERE other.user_account_id = ua.user_account_id) AS profile_count
         FROM public.user_account ua
         JOIN public.company c ON c.user_account_id = ua.user_account_id
         JOIN public.industry i USING (industry_id)
        WHERE ua.email = ANY($1::text[])`,
      [DEVELOPMENT_COMPANY_FIXTURES.map((fixture) => fixture.loginEmail)],
    );
    expect(companyRows).toHaveLength(9);
    for (const fixture of DEVELOPMENT_COMPANY_FIXTURES) {
      const row = companyRows.find(
        (candidate) => candidate.email === fixture.loginEmail,
      );
      expect(row).toBeDefined();
      expect(row).toMatchObject({
        user_role: 'company',
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
        google_count: 0,
        profile_count: 1,
      });
      expect(timestamp(row.account_created_at)).toBeLessThan(
        timestamp(DEVELOPMENT_WORKFLOW_TIMELINE.applicationSubmittedAt),
      );
      expect(timestamp(row.company_created_at)).toBeLessThan(
        timestamp(DEVELOPMENT_WORKFLOW_TIMELINE.applicationSubmittedAt),
      );
      expect(timestamp(row.credential_created_at)).toBeLessThan(
        timestamp(DEVELOPMENT_WORKFLOW_TIMELINE.applicationSubmittedAt),
      );
    }

    const opportunityRows = await dataSource.query<
      Array<Record<string, unknown>>
    >(
      `SELECT c.company_name, o.title, o.department, o.description,
              o.qualification, (o.allowance IS NOT NULL) AS has_allowance,
              o.allowance,
              o.minimum_required_hours, o.work_arrangement, o.offered_slots,
              (o.application_deadline AT TIME ZONE 'Asia/Manila')::date::text
                AS application_deadline,
              o.created_at, o.application_deadline AS deadline_timestamp
         FROM public.opportunity o
         JOIN public.company c USING (company_id)
        WHERE c.user_account_id IN (
          SELECT user_account_id FROM public.user_account
           WHERE email = ANY($1::text[])
        )`,
      [DEVELOPMENT_COMPANY_FIXTURES.map((fixture) => fixture.loginEmail)],
    );
    expect(opportunityRows).toHaveLength(27);
    for (const companyFixture of DEVELOPMENT_COMPANY_FIXTURES) {
      for (const fixture of companyFixture.opportunities) {
        const row = opportunityRows.find(
          (candidate) =>
            candidate.company_name === companyFixture.companyName &&
            candidate.title === fixture.title,
        );
        expect(row).toBeDefined();
        expect(row).toMatchObject({
          department: fixture.department,
          description: fixture.description,
          qualification: fixture.qualification,
          has_allowance: fixture.allowance !== null,
          allowance: fixture.allowance,
          minimum_required_hours: fixture.minimumRequiredHours,
          work_arrangement: fixture.workArrangement,
          offered_slots: fixture.offeredSlots,
          application_deadline: fixture.applicationDeadline.slice(0, 10),
        });
        expect(timestamp(row.created_at)).toBeLessThan(
          timestamp(row.deadline_timestamp),
        );
      }
    }

    const studentRows = await dataSource.query<Array<Record<string, unknown>>>(
      `SELECT ua.email, ua.user_account_id, ua.user_role, ua.account_status,
              ua.created_at AS account_created_at,
              s.student_id, s.first_name, s.middle_name, s.last_name,
              s.created_at AS student_created_at,
              s.contact_number, s.contact_email, s.address_line,
              s.address_barangay, s.address_district, s.address_city,
              sai.strand_program, sai.created_at AS academic_created_at,
              ip.required_hours, ip.created_at AS preference_created_at,
              ip.start_date::text AS preference_start_date,
              ip.created_at AS preference_created_at,
              c.company_name, o.title AS opportunity_title,
              i.industry_name AS company_industry,
              (SELECT array_agg(pi.industry_name ORDER BY pi.industry_name)
                 FROM public.student_preferred_industry spi
                 JOIN public.industry pi USING (industry_id)
                WHERE spi.student_id = s.student_id) AS preferred_industries,
              (SELECT min(spi.created_at)
                 FROM public.student_preferred_industry spi
                WHERE spi.student_id = s.student_id) AS preferred_industry_created_at,
              (SELECT count(*)::integer FROM public.local_authentication_credential lac
                WHERE lac.user_account_id = ua.user_account_id) AS local_count,
              (SELECT count(*)::integer FROM public.external_authentication_identity eai
                WHERE eai.user_account_id = ua.user_account_id) AS google_count,
              (SELECT count(*)::integer FROM public.student other
                WHERE other.user_account_id = ua.user_account_id) AS profile_count
         FROM public.user_account ua
         JOIN public.student s ON s.user_account_id = ua.user_account_id
         JOIN public.student_academic_information sai USING (student_id)
         JOIN public.internship_preference ip USING (student_id)
         LEFT JOIN public.application a USING (student_id)
         LEFT JOIN public.opportunity o USING (opportunity_id)
         LEFT JOIN public.company c USING (company_id)
         LEFT JOIN public.industry i USING (industry_id)
        WHERE ua.email = ANY($1::text[])`,
      [DEVELOPMENT_STUDENT_FIXTURES.map((fixture) => fixture.loginEmail)],
    );
    expect(studentRows).toHaveLength(27);
    for (const fixture of DEVELOPMENT_STUDENT_FIXTURES) {
      const companyFixture = DEVELOPMENT_COMPANY_FIXTURES.find(
        (company) => company.key === fixture.companyKey,
      );
      const opportunityFixture = companyFixture?.opportunities.find(
        (opportunity) => opportunity.key === fixture.opportunityKey,
      );
      expect(companyFixture).toBeDefined();
      expect(opportunityFixture).toBeDefined();
      const row = studentRows.find(
        (candidate) => candidate.email === fixture.loginEmail,
      );
      expect(row).toBeDefined();
      expect(row).toMatchObject({
        user_role: 'student',
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
        required_hours: opportunityFixture!.minimumRequiredHours,
        preference_start_date:
          DEVELOPMENT_WORKFLOW_TIMELINE.preferenceStartDate,
        company_name: companyFixture!.companyName,
        opportunity_title: opportunityFixture!.title,
        company_industry: companyFixture!.industryName,
        local_count: 1,
        google_count: 0,
        profile_count: 1,
      });
      expect(timestamp(row.preference_created_at)).toBeLessThan(
        timestamp(row.preference_start_date),
      );
      for (const createdAt of [
        row.account_created_at,
        row.student_created_at,
        row.academic_created_at,
        row.preference_created_at,
        row.preferred_industry_created_at,
      ]) {
        expect(timestamp(createdAt)).toBeLessThan(
          timestamp(DEVELOPMENT_WORKFLOW_TIMELINE.applicationSubmittedAt),
        );
      }
      expect(row.preferred_industries).toContain(companyFixture!.industryName);
    }

    const workflowRows = await dataSource.query<Array<Record<string, unknown>>>(
      `SELECT ua.email, s.student_id, a.application_status,
              a.submitted_at, o.created_at AS opportunity_created_at,
              o.application_deadline, r.referral_id, r.referral_status,
              r.company_response, a.student_response,
              i.interview_id, i.interview_mode, i.created_at AS interview_created_at,
              i.scheduled_at, ia.internship_assignment_id,
              ia.assignment_status,
              to_char(ia.start_date, 'YYYY-MM-DD') AS start_date,
              to_char(ia.expected_end_date, 'YYYY-MM-DD') AS expected_end_date,
              count(ar.attendance_record_id)::integer AS attendance_count
         FROM public.user_account ua
         JOIN public.student s ON s.user_account_id = ua.user_account_id
         LEFT JOIN public.application a USING (student_id)
         LEFT JOIN public.opportunity o USING (opportunity_id)
         LEFT JOIN public.referral r USING (application_id)
         LEFT JOIN public.interview i USING (referral_id)
         LEFT JOIN public.internship_assignment ia USING (referral_id)
         LEFT JOIN public.attendance_record ar USING (internship_assignment_id)
        WHERE ua.email = ANY($1::text[])
        GROUP BY ua.email, s.student_id, a.application_status, a.submitted_at,
                 o.created_at, o.application_deadline, r.referral_id,
                 r.referral_status, r.company_response, a.student_response,
                 i.interview_id, i.interview_mode, i.created_at, i.scheduled_at,
                 ia.internship_assignment_id, ia.assignment_status, ia.start_date,
                 ia.expected_end_date
        ORDER BY ua.email`,
      [DEVELOPMENT_STUDENT_FIXTURES.map((fixture) => fixture.loginEmail)],
    );
    expect(workflowRows).toHaveLength(27);
    const applicants = DEVELOPMENT_STUDENT_FIXTURES.filter(
      (fixture) => fixture.workflowStage === 'applicant',
    );
    const interviewCandidates = DEVELOPMENT_STUDENT_FIXTURES.filter(
      (fixture) => fixture.workflowStage === 'interview',
    );
    const interns = DEVELOPMENT_STUDENT_FIXTURES.filter(
      (fixture) => fixture.workflowStage === 'intern',
    );
    expect(applicants).toHaveLength(9);
    expect(interviewCandidates).toHaveLength(9);
    expect(interns).toHaveLength(9);
    for (const fixture of applicants) {
      const row = workflowRows.find(
        (candidate) => candidate.email === fixture.loginEmail,
      )!;
      expect(['submitted', 'under_review']).toContain(row.application_status);
      expect(row.application_status).toBe(fixture.applicationStatus);
      expect(row.referral_id).toBeNull();
      expect(row.interview_id).toBeNull();
      expect(row.internship_assignment_id).toBeNull();
      expect(Number(row.attendance_count)).toBe(0);
    }
    expect(
      new Set(
        applicants.map(
          (fixture) =>
            workflowRows.find((row) => row.email === fixture.loginEmail)!
              .application_status,
        ),
      ),
    ).toEqual(new Set(['submitted', 'under_review']));

    for (const fixture of interviewCandidates) {
      const row = workflowRows.find(
        (candidate) => candidate.email === fixture.loginEmail,
      )!;
      expect(row.application_status).toBe('approved_for_referral');
      expect(row.referral_status).toBe('under_review');
      expect(row.company_response).toBe('for_interview');
      expect(row.interview_id).not.toBeNull();
      expect(row.interview_mode).toBe(fixture.interviewMode);
      expect(row.internship_assignment_id).toBeNull();
      expect(Number(row.attendance_count)).toBe(0);
      expect(timestamp(row.opportunity_created_at)).toBeLessThan(
        timestamp(row.application_deadline),
      );
      expect(timestamp(row.submitted_at)).toBeLessThan(
        timestamp(row.application_deadline),
      );
      expect(timestamp(row.interview_created_at)).toBeLessThan(
        timestamp(row.scheduled_at),
      );
    }

    for (const fixture of interns) {
      const row = workflowRows.find(
        (candidate) => candidate.email === fixture.loginEmail,
      )!;
      expect(row.application_status).toBe('closed');
      expect(row.referral_status).toBe('closed');
      expect(row.company_response).toBe('accepted');
      expect(row.student_response).toBe('accepted');
      expect(row.assignment_status).toBe('ongoing');
      expect(dateOnly(row.start_date)).toBe(
        DEVELOPMENT_WORKFLOW_TIMELINE.assignmentStartDate,
      );
      expect(Number(row.attendance_count)).toBe(8);
    }

    const attendanceRows = await dataSource.query<
      Array<Record<string, unknown>>
    >(
      `SELECT ua.email, ar.attendance_date::text AS attendance_date,
              ar.attendance_status,
              to_char(ar.time_in, 'HH24:MI') AS time_in,
              CASE WHEN ar.time_out IS NULL THEN NULL
                   ELSE to_char(ar.time_out, 'HH24:MI') END AS time_out,
              ar.rendered_minutes,
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
      [interns.map((fixture) => fixture.loginEmail)],
    );
    expect(attendanceRows).toHaveLength(72);
    for (const fixture of interns) {
      const rows = attendanceRows.filter(
        (row) => row.email === fixture.loginEmail,
      );
      expect(rows).toHaveLength(8);
      for (
        let index = 0;
        index < DEVELOPMENT_WORKFLOW_TIMELINE.attendance.length;
        index++
      ) {
        const expected = DEVELOPMENT_WORKFLOW_TIMELINE.attendance[index];
        expect(rows[index]).toMatchObject({
          attendance_date: expected.date,
          attendance_status: expected.status,
          time_in: expected.timeIn,
          time_out: expected.timeOut,
        });
        expect(Number(rows[index].rendered_minutes)).toBeGreaterThanOrEqual(0);
        expect(Number(rows[index].rendered_minutes)).toBe(
          expectedRenderedMinutes(expected.timeIn, expected.timeOut),
        );
        expect(
          dateOnly(rows[index].attendance_date) >=
            dateOnly(rows[index].start_date),
        ).toBe(true);
        expect(
          dateOnly(rows[index].attendance_date) <=
            dateOnly(rows[index].expected_end_date),
        ).toBe(true);
      }
    }

    const attendanceSummaries = await dataSource.query<
      Array<Record<string, unknown>>
    >(
      `SELECT s.student_id, ua.email, v.attendance_record_count,
              v.total_rendered_minutes, v.present_count, v.incomplete_count,
              v.first_attendance_date::text AS first_attendance_date,
              v.latest_attendance_date::text AS latest_attendance_date,
              totals.raw_total
         FROM public.vw_attendance_summary v
         JOIN public.internship_assignment ia
           ON ia.internship_assignment_id = v.internship_assignment_id
         JOIN public.referral r ON r.referral_id = ia.referral_id
         JOIN public.application a ON a.application_id = r.application_id
         JOIN public.student s ON s.student_id = a.student_id
         JOIN public.user_account ua ON ua.user_account_id = s.user_account_id
         JOIN LATERAL (
           SELECT sum(ar.rendered_minutes)::bigint AS raw_total
             FROM public.attendance_record ar
            WHERE ar.internship_assignment_id = ia.internship_assignment_id
         ) totals ON true
        WHERE ua.email = ANY($1::text[])
        ORDER BY ua.email`,
      [interns.map((fixture) => fixture.loginEmail)],
    );
    expect(attendanceSummaries).toHaveLength(9);
    for (const summary of attendanceSummaries) {
      expect(Number(summary.attendance_record_count)).toBe(8);
      expect(Number(summary.total_rendered_minutes)).toBe(
        Number(summary.raw_total),
      );
      expect(Number(summary.present_count)).toBe(7);
      expect(Number(summary.incomplete_count)).toBe(1);
      expect(summary.first_attendance_date).toBe('2026-09-01');
      expect(summary.latest_attendance_date).toBe('2026-09-10');
    }

    const historyCounts = await dataSource.query<
      Array<Record<string, unknown>>
    >(
      `SELECT
        (SELECT count(*)::integer FROM public.application_status_history h
          JOIN public.application a USING (application_id)
          JOIN public.student s USING (student_id)
          JOIN public.user_account ua USING (user_account_id)
         WHERE ua.email = ANY($1::text[])) AS applications,
        (SELECT count(*)::integer FROM public.referral_status_history h
          JOIN public.referral r USING (referral_id)
          JOIN public.application a USING (application_id)
          JOIN public.student s USING (student_id)
          JOIN public.user_account ua USING (user_account_id)
         WHERE ua.email = ANY($1::text[])) AS referrals,
        (SELECT count(*)::integer FROM public.internship_assignment_status_history h
          JOIN public.internship_assignment ia USING (internship_assignment_id)
          JOIN public.referral r USING (referral_id)
          JOIN public.application a USING (application_id)
          JOIN public.student s USING (student_id)
          JOIN public.user_account ua USING (user_account_id)
         WHERE ua.email = ANY($1::text[])) AS assignments`,
      [DEVELOPMENT_STUDENT_FIXTURES.map((fixture) => fixture.loginEmail)],
    );
    expect(Number(historyCounts[0].applications)).toBeGreaterThan(0);
    expect(Number(historyCounts[0].referrals)).toBeGreaterThan(0);
    expect(Number(historyCounts[0].assignments)).toBeGreaterThan(0);

    for (const accountFixture of newLocalAccounts) {
      const account = await authService.validateUser(
        accountFixture.email,
        process.env.DEV_SEED_PASSWORD!,
      );
      expect(account).not.toBeNull();
      expect(account!.email).toBe(accountFixture.email);
      expect(account!.userRole).toBe(accountFixture.role);
      expect(account!.accountStatus).toBe('active');

      const current = await usersService.getCurrentAccount(
        account!.userAccountId,
      );
      expect(current).not.toBeNull();
      expect(current!.account.email).toBe(accountFixture.email);
      expect(current!.account.userRole).toBe(accountFixture.role);
      if (accountFixture.profile === 'company') {
        const expected = companyRows.find(
          (row) => row.email === accountFixture.email,
        )!;
        expect(current!.companyId).toBe(expected.company_id);
        expect(current!.studentId).toBeNull();
      } else {
        const expected = studentRows.find(
          (row) => row.email === accountFixture.email,
        )!;
        expect(current!.studentId).toBe(expected.student_id);
        expect(current!.companyId).toBeNull();
      }
    }

    const validator = runBackendNpmScript(
      'database:validate-dev-seeds',
      disposableEnvironment,
    );
    expect(validator.error).toBeUndefined();
    if (validator.status !== 0) {
      throw new Error(
        `npm run database:validate-dev-seeds failed:\n${validator.stdout}\n${validator.stderr}`,
      );
    }
    expect(`${validator.stdout}\n${validator.stderr}`).toContain(
      'Development seed validation passed',
    );

    for (const scriptName of [
      'database:validate',
      'database:validate-reference-seeds',
    ]) {
      const validation = runBackendNpmScript(scriptName, disposableEnvironment);
      expect(validation.error).toBeUndefined();
      if (validation.status !== 0) {
        throw new Error(
          `npm run ${scriptName} failed:\n${validation.stdout}\n${validation.stderr}`,
        );
      }
    }

    const seededAccounts = await dataSource.query<
      Array<{ user_account_id: number; email: string }>
    >(
      `SELECT user_account_id, email
         FROM public.user_account
        WHERE email = ANY($1::text[])
        ORDER BY email`,
      [seedOwnedEmails],
    );
    expect(seededAccounts).toHaveLength(seedOwnedEmails.length);

    const sentinel = await dataSource.transaction(async (manager) => {
      const rows = await manager.query(
        `INSERT INTO public.user_account (email, user_role)
         VALUES ('unrelated.session-sentinel@example.test', 'company')
         RETURNING user_account_id`,
      );
      const accountId = rows[0].user_account_id as number;
      await manager.query(
        `INSERT INTO public.local_authentication_credential
           (user_account_id, password_hash)
         VALUES ($1, 'sentinel-local-password-hash')`,
        [accountId],
      );
      const companyRows = await manager.query(
        `INSERT INTO public.company
           (user_account_id, industry_id, company_name, company_type,
            description, company_size, contact_email, contact_number,
            contact_person_first_name, contact_person_last_name, address_line,
            address_barangay, address_city, logo_file_path)
         SELECT $1, industry_id, 'Unrelated Sentinel Company', 'private',
                'Unrelated data preservation sentinel.', 1,
                'sentinel@example.test', '09170000000', 'Sentinel', 'Owner',
                '1 Sentinel Road', 'Central', 'Quezon City', 'sentinel/logo.png'
           FROM public.industry WHERE industry_name = 'Information Technology'
         RETURNING company_id`,
        [accountId],
      );
      const opportunityRows = await manager.query(
        `INSERT INTO public.opportunity
           (company_id, title, department, description, allowance,
            minimum_required_hours, work_arrangement, offered_slots,
            created_at, application_deadline)
         VALUES ($1, 'Unrelated Sentinel Opportunity', 'Operations',
                 'Unrelated data preservation sentinel.', NULL, 120,
                 'onsite', 1, TIMESTAMPTZ '2026-08-01 09:00:00+08',
                 TIMESTAMPTZ '2026-12-01 23:59:59+08')
         RETURNING opportunity_id`,
        [companyRows[0].company_id],
      );
      return {
        accountId,
        companyId: companyRows[0].company_id as number,
        opportunityId: opportunityRows[0].opportunity_id as number,
      };
    });
    const beforeRerun = await captureSeedSnapshot(dataSource);

    for (const account of seededAccounts) {
      await dataSource.query(
        `INSERT INTO public.authentication_session
           (user_account_id, token_family_id, refresh_token_hash, expires_at)
         VALUES ($1, $2, 'seed-owned-session-hash', CURRENT_TIMESTAMP + INTERVAL '1 day')`,
        [account.user_account_id, randomUUID()],
      );
    }
    await dataSource.query(
      `INSERT INTO public.authentication_session
         (user_account_id, token_family_id, refresh_token_hash, expires_at)
       VALUES ($1, $2, 'sentinel-session-hash', CURRENT_TIMESTAMP + INTERVAL '1 day')`,
      [sentinel.accountId, randomUUID()],
    );

    const secondSeedRun = runBackendNpmScript(
      'seed:dev',
      disposableEnvironment,
    );
    expect(secondSeedRun.error).toBeUndefined();
    if (secondSeedRun.status !== 0) {
      throw new Error(
        `second npm run seed:dev failed:\n${secondSeedRun.stdout}\n${secondSeedRun.stderr}`,
      );
    }
    expect(secondSeedRun.stdout).toContain('49 seed-owned accounts');

    expect(await captureSeedSnapshot(dataSource)).toEqual(beforeRerun);

    const [remainingSeedSessions] = await dataSource.query<
      Array<{ count: number }>
    >(
      `SELECT count(*)::integer AS count
         FROM public.authentication_session session
         JOIN public.user_account account
           ON account.user_account_id = session.user_account_id
        WHERE account.email = ANY($1::text[])`,
      [seedOwnedEmails],
    );
    expect(remainingSeedSessions.count).toBe(0);

    const preservedSentinel = await dataSource.query<
      Array<{
        email: string;
        password_hash: string;
        company_name: string;
        title: string;
        sessions: number;
      }>
    >(
      `SELECT ua.email, lac.password_hash, c.company_name, o.title,
              count(s.authentication_session_id)::integer AS sessions
         FROM public.user_account ua
         JOIN public.local_authentication_credential lac USING (user_account_id)
         LEFT JOIN public.authentication_session s USING (user_account_id)
        JOIN public.company c USING (user_account_id)
        JOIN public.opportunity o USING (company_id)
        WHERE ua.user_account_id = $1
        GROUP BY ua.email, lac.password_hash, c.company_name, o.title`,
      [sentinel.accountId],
    );
    expect(preservedSentinel).toEqual([
      {
        email: 'unrelated.session-sentinel@example.test',
        password_hash: 'sentinel-local-password-hash',
        company_name: 'Unrelated Sentinel Company',
        title: 'Unrelated Sentinel Opportunity',
        sessions: 1,
      },
    ]);
  });
});
