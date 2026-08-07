/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import {
  ConflictException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';

const profile = {
  firstName: 'Test',
  lastName: 'Student',
  sex: 'unspecified',
  birthDate: '2000-01-01',
  contactNumber: '09170000000',
  addressLine: '1 Test Street',
  addressBarangay: 'Test Barangay',
  addressDistrict: 'Test District',
  addressCity: 'Quezon City',
  inquiryMethod: 'online',
};

describe('V3 authentication (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authService: AuthService;
  let accessToken: string;
  let firstRefreshToken: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_SECRET = 'e2e-access-secret';
    process.env.JWT_REFRESH_SECRET = 'e2e-refresh-secret';
    process.env.GOOGLE_PENDING_REGISTRATION_SECRET = 'e2e-pending-secret';
    process.env.COOKIE_DOMAIN = '';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);
    authService = app.get(AuthService);
    const database = (
      await dataSource.query('SELECT current_database() AS name')
    )[0].name as string;
    if (!database.toLowerCase().includes('validation')) {
      throw new Error(
        'Refusing to run destructive auth e2e outside a validation database',
      );
    }
    await dataSource.query(
      `TRUNCATE TABLE public.user_account, public.industry, public.requirement_type
       RESTART IDENTITY CASCADE`,
    );
  });

  it('creates account, student profile, session, cookie, and /auth/me atomically', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        ...profile,
        email: 'Manual.Student@Example.test',
        password: 'Password123!',
      })
      .expect(201);

    accessToken = response.body.accessToken;
    firstRefreshToken = response.body.refreshToken;
    expect(response.headers['set-cookie']?.[0]).toContain('refreshToken=');
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(response.headers['set-cookie']?.[0]).toContain('Path=/auth');

    const rows = await dataSource.query(
      `SELECT ua.email, ua.password_hash, s.contact_email,
              count(asn.auth_session_id) FILTER (WHERE asn.revoked_at IS NULL)::integer AS active_sessions
       FROM public.user_account ua
       JOIN public.student s ON s.user_account_id=ua.user_account_id
       LEFT JOIN public.auth_session asn ON asn.user_account_id=ua.user_account_id
       WHERE ua.email='manual.student@example.test'
       GROUP BY ua.email, ua.password_hash, s.contact_email`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
    expect(rows[0].contact_email).toBe('manual.student@example.test');
    expect(rows[0].active_sessions).toBe(1);

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(me.body).toMatchObject({
      email: 'manual.student@example.test',
      userRole: 'student',
      accountStatus: 'active',
      profile: { firstName: 'Test', lastName: 'Student' },
    });
    expect(JSON.stringify(me.body)).not.toMatch(
      /password|refreshToken|tokenFamily|providerSubject/i,
    );
  });

  it('rejects duplicate email case-insensitively', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        ...profile,
        email: 'MANUAL.STUDENT@example.test',
        password: 'Password123!',
      })
      .expect(409);
  });

  it('supports local login and replaces the previous active session', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'MANUAL.STUDENT@example.test',
        password: 'Password123!',
      })
      .expect(200);
    accessToken = response.body.accessToken;
    firstRefreshToken = response.body.refreshToken;

    const sessions = await dataSource.query(
      `SELECT count(*) FILTER (WHERE revoked_at IS NULL)::integer AS active,
              count(*) FILTER (WHERE revoked_at IS NOT NULL)::integer AS revoked
       FROM public.auth_session s
       JOIN public.user_account ua ON ua.user_account_id=s.user_account_id
       WHERE ua.email='manual.student@example.test'`,
    );
    expect(sessions[0].active).toBe(1);
    expect(sessions[0].revoked).toBe(1);
  });

  it('rotates refresh hashes and revokes the family when an old token is reused', async () => {
    const before = (
      await dataSource.query(
        `SELECT refresh_token_hash FROM public.auth_session s
         JOIN public.user_account ua ON ua.user_account_id=s.user_account_id
         WHERE ua.email='manual.student@example.test' AND s.revoked_at IS NULL`,
      )
    )[0].refresh_token_hash;

    const rotated = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: firstRefreshToken })
      .expect(200);
    expect(rotated.body.refreshToken).not.toBe(firstRefreshToken);

    const after = (
      await dataSource.query(
        `SELECT refresh_token_hash FROM public.auth_session s
         JOIN public.user_account ua ON ua.user_account_id=s.user_account_id
         WHERE ua.email='manual.student@example.test' AND s.revoked_at IS NULL`,
      )
    )[0].refresh_token_hash;
    expect(after).not.toBe(before);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: firstRefreshToken })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: rotated.body.refreshToken })
      .expect(401);
  });

  it('revokes the active session on logout and clears the cookie', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'manual.student@example.test',
        password: 'Password123!',
      })
      .expect(200);

    const logout = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(logout.body.message).toBe('Successfully logged out');
    expect(logout.headers['set-cookie']?.[0]).toMatch(
      /refreshToken=;.*Path=\/auth/,
    );
    const active = await dataSource.query(
      `SELECT count(*)::integer AS count FROM public.auth_session s
       JOIN public.user_account ua ON ua.user_account_id=s.user_account_id
       WHERE ua.email='manual.student@example.test' AND s.revoked_at IS NULL`,
    );
    expect(active[0].count).toBe(0);
  });

  it('links only verified Google email to an active student and preserves local login', async () => {
    await expect(
      authService.handleGoogleProfile({
        providerSubject: 'unverified-subject',
        email: 'manual.student@example.test',
        emailVerified: false,
      }),
    ).rejects.toThrow('explicitly verified');

    const passwordBefore = (
      await dataSource.query(
        `SELECT password_hash FROM public.user_account
         WHERE email='manual.student@example.test'`,
      )
    )[0].password_hash;
    const linked = await authService.handleGoogleProfile({
      providerSubject: 'verified-manual-subject',
      email: 'manual.student@example.test',
      emailVerified: true,
    });
    expect(linked.requiresProfileCompletion).toBe(false);
    const passwordAfter = (
      await dataSource.query(
        `SELECT password_hash FROM public.user_account
         WHERE email='manual.student@example.test'`,
      )
    )[0].password_hash;
    expect(passwordAfter).toBe(passwordBefore);

    const linkedAgain = await authService.handleGoogleProfile({
      providerSubject: 'verified-manual-subject',
      email: 'changed-provider-email@example.test',
      emailVerified: true,
    });
    expect(linkedAgain.requiresProfileCompletion).toBe(false);

    await expect(
      authService.handleGoogleProfile({
        providerSubject: 'conflicting-subject',
        email: 'manual.student@example.test',
        emailVerified: true,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'manual.student@example.test',
        password: 'Password123!',
      })
      .expect(200);
  });

  it('does not link Google to company, suspended, or archived accounts', async () => {
    await dataSource.transaction(async (manager) => {
      const companyAccount = (
        await manager.query(
          `INSERT INTO public.user_account (email, password_hash, user_role)
           VALUES ('company@example.test', 'hash', 'company') RETURNING user_account_id`,
        )
      )[0].user_account_id;
      const industry = (
        await manager.query(
          `INSERT INTO public.industry (industry_name) VALUES ('E2E Industry') RETURNING industry_id`,
        )
      )[0].industry_id;
      await manager.query(
        `INSERT INTO public.company (
           user_account_id, industry_id, company_name, company_type, description,
           contact_email, contact_number, contact_person_first_name,
           contact_person_last_name, address_line, address_barangay, address_city,
           logo_file_path
         ) VALUES ($1,$2,'E2E Company','private','Test','company@example.test',
           '09170000001','Casey','Manager','2 Test St','Barangay','Quezon City','/logo.png')`,
        [companyAccount, industry],
      );
    });

    for (const [email, status] of [
      ['suspended@example.test', 'suspended'],
      ['archived@example.test', 'archived'],
    ] as const) {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ ...profile, email, password: 'Password123!' })
        .expect(201);
      await dataSource.query(
        `UPDATE public.user_account
         SET account_status=$2::public.account_status_enum,
             deleted_at=CASE WHEN $2::text='archived' THEN CURRENT_TIMESTAMP ELSE NULL END
         WHERE email=$1`,
        [email, status],
      );
    }

    for (const email of [
      'company@example.test',
      'suspended@example.test',
      'archived@example.test',
    ]) {
      await expect(
        authService.handleGoogleProfile({
          providerSubject: `subject-${email}`,
          email,
          emailVerified: true,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    }

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'suspended@example.test', password: 'Password123!' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'archived@example.test', password: 'Password123!' })
      .expect(401);
  });

  it('keeps new Google callbacks transient and completes Google-only signup atomically', async () => {
    const before = Number(
      (
        await dataSource.query(
          `SELECT count(*) AS count FROM public.user_account
           WHERE email='google.new@example.test'`,
        )
      )[0].count,
    );
    const pending = await authService.handleGoogleProfile({
      providerSubject: 'google-new-subject',
      email: 'google.new@example.test',
      emailVerified: true,
    });
    expect(pending.requiresProfileCompletion).toBe(true);
    const afterCallback = Number(
      (
        await dataSource.query(
          `SELECT count(*) AS count FROM public.user_account
           WHERE email='google.new@example.test'`,
        )
      )[0].count,
    );
    expect(afterCallback).toBe(before);
    if (!pending.requiresProfileCompletion) {
      throw new Error('Expected pending Google registration');
    }

    await request(app.getHttpServer())
      .post('/auth/google/complete-signup')
      .send({
        ...profile,
        firstName: 'Google',
        pendingRegistrationToken: pending.pendingRegistrationToken,
      })
      .expect(201);

    const completed = await dataSource.query(
      `SELECT ua.password_hash, s.first_name, oi.provider_subject,
              count(asn.auth_session_id) FILTER (WHERE asn.revoked_at IS NULL)::integer AS active_sessions
       FROM public.user_account ua
       JOIN public.student s ON s.user_account_id=ua.user_account_id
       JOIN public.oauth_identity oi ON oi.user_account_id=ua.user_account_id
       LEFT JOIN public.auth_session asn ON asn.user_account_id=ua.user_account_id
       WHERE ua.email='google.new@example.test'
       GROUP BY ua.password_hash, s.first_name, oi.provider_subject`,
    );
    expect(completed[0]).toMatchObject({
      password_hash: null,
      first_name: 'Google',
      provider_subject: 'google-new-subject',
      active_sessions: 1,
    });

    await expect(
      authService.validateUser('google.new@example.test', 'Password123!'),
    ).resolves.toBeNull();
  });

  afterAll(async () => {
    await app?.close();
  });
});
