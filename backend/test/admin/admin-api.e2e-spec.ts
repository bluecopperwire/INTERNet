/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { AdminE2eEnvironment } from './support/admin-e2e-environment';
import {
  AdminFixtureFactory,
  type AccountFixture,
} from './support/fixture-factory';

const env = new AdminE2eEnvironment();
let db: DataSource;
let fixtures: AdminFixtureFactory;
let admin: AccountFixture;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const employerBody = {
  accountEmail: 'login@abctech.test',
  initialPassword: 'Password1!',
  companyName: 'ABC Technologies',
  companyType: 'private',
  industryId: 1,
  companySize: 250,
  yearEstablished: 2010,
  websiteUrl: 'https://abctech.test',
  description: 'A technology company.',
  addressLine: '123 Aurora Boulevard',
  addressBarangay: 'Cubao',
  addressDistrict: 'District 3',
  addressCity: 'Quezon City',
  contactPersonFirstName: 'Maria',
  contactPersonMiddleName: null,
  contactPersonLastName: 'Santos',
  contactPersonExtensionName: null,
  contactEmail: 'hr@abc.test',
  contactNumber: '09123456789',
};
const pesoBody = {
  accountEmail: 'maria.reyes@quezoncity.test',
  initialPassword: 'Password1!',
  firstName: 'Maria',
  middleName: 'Santos',
  lastName: 'Reyes',
  extensionName: null,
  addressLine: '309 Katipunan Ave',
  addressBarangay: 'Loyola Heights',
  addressDistrict: '3',
  addressCity: 'Quezon City',
  birthDate: '1990-08-20',
  sex: 'Female',
  contactEmail: 'maria@quezoncity.test',
  contactNumber: '09123456789',
  employeeId: 'QCPESO-001',
  department: 'QC PESO Internship Division',
  position: 'Employment Officer',
};

beforeAll(async () => {
  await env.start();
  db = env.dataSource;
});

beforeEach(async () => {
  await env.resetDatabase();
  fixtures = new AdminFixtureFactory(db);
  await fixtures.seedReference();
  admin = await fixtures.admin();
});

afterAll(async () => env.stop());

describe('Admin authorization', () => {
  const routes: Array<[string, string]> = [
    ['get', '/admin/students'],
    ['get', '/admin/students/1'],
    ['patch', '/admin/students/1'],
    ['get', '/admin/employers'],
    ['get', '/admin/employers/1'],
    ['post', '/admin/employers'],
    ['patch', '/admin/employers/1'],
    ['get', '/admin/qc-peso'],
    ['get', '/admin/qc-peso/1'],
    ['post', '/admin/qc-peso'],
    ['patch', '/admin/qc-peso/1'],
    ['patch', '/admin/accounts/1/status'],
  ];

  test('every Admin route rejects unauthenticated requests', async () => {
    for (const [method, path] of routes) {
      await (request(env.app.getHttpServer()) as any)
        [method](path)
        .send({})
        .expect(401);
    }
  });

  test('every Admin route rejects an authenticated non-admin', async () => {
    const student = await fixtures.student('WrongRole', 'active');
    for (const [method, path] of routes) {
      await (request(env.app.getHttpServer()) as any)
        [method](path)
        .set(auth(student.token))
        .send({})
        .expect(403);
    }
  });
});

describe('Admin Student APIs', () => {
  test('lists with default/explicit pagination, search, status filters, and role-wide summaries', async () => {
    for (let index = 0; index < 6; index++)
      await fixtures.student(`Active${index}`, 'active');
    const suspended = await fixtures.student('Searchable', 'suspended');
    await fixtures.student('Archived', 'archived');

    const first = await request(env.app.getHttpServer())
      .get('/admin/students')
      .set(auth(admin.token))
      .expect(200);
    expect(first.body.data).toHaveLength(7);
    expect(first.body.meta).toMatchObject({
      page: 1,
      limit: 7,
      total: 8,
      totalPages: 2,
    });
    expect(first.body.summary).toEqual({
      total: 8,
      active: 6,
      suspended: 1,
      archived: 1,
    });

    const filtered = await request(env.app.getHttpServer())
      .get('/admin/students?search=searchable&status=suspended&page=1&limit=2')
      .set(auth(admin.token))
      .expect(200);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0]).toMatchObject({
      studentId: suspended.studentId,
      accountEmail: suspended.email,
    });
    expect(filtered.body.summary.total).toBe(8);
  });

  test('views active, suspended, and archived details including LinkedIn and industries', async () => {
    for (const status of ['active', 'suspended', 'archived'] as const) {
      const student = await fixtures.student(status, status);
      const response = await request(env.app.getHttpServer())
        .get(`/admin/students/${student.studentId}`)
        .set(auth(admin.token))
        .expect(200);
      expect(response.body).toMatchObject({
        studentId: student.studentId,
        accountStatus: status,
      });
      expect(response.body.linkedinUrl).toMatch(/^https:\/\/linkedin\.com/);
      expect(response.body.preferredIndustries).toHaveLength(1);
      expect(response.body).not.toHaveProperty('inquiryMethod');
    }
  });

  test('updates active profile sections while preserving account email', async () => {
    const student = await fixtures.student('Editable', 'active');
    const industry = await db.query(
      `SELECT industry_id FROM public.industry WHERE industry_name='Engineering'`,
    );
    const response = await request(env.app.getHttpServer())
      .patch(`/admin/students/${student.studentId}`)
      .set(auth(admin.token))
      .send({
        firstName: 'Updated',
        contactEmail: 'profile-updated@test.invalid',
        linkedinUrl: 'https://linkedin.com/in/updated',
        schoolName: 'Updated University',
        yearLevel: 'grade_12',
        requiredHours: 500,
        availableDays: 'flexible',
        preferredIndustries: [{ industryId: Number(industry[0].industry_id) }],
      })
      .expect(200);
    expect(response.body).toMatchObject({
      firstName: 'Updated',
      contactEmail: 'profile-updated@test.invalid',
      yearLevel: 'grade_12',
      requiredHours: 500,
      accountEmail: student.email,
    });
    const account = await db.query(
      'SELECT email FROM public.user_account WHERE user_account_id=$1',
      [student.accountId],
    );
    expect(account[0].email).toBe(student.email);
  });

  test('updates suspended students but rejects archived edits', async () => {
    const suspended = await fixtures.student('Suspended', 'suspended');
    await request(env.app.getHttpServer())
      .patch(`/admin/students/${suspended.studentId}`)
      .set(auth(admin.token))
      .send({ contactNumber: '09999999999' })
      .expect(200);
    const archived = await fixtures.student('Archived', 'archived');
    await request(env.app.getHttpServer())
      .patch(`/admin/students/${archived.studentId}`)
      .set(auth(admin.token))
      .send({ firstName: 'Nope' })
      .expect(409);
  });

  test('rejects fifth year, forbidden ownership fields, and invalid/nonexistent IDs', async () => {
    const student = await fixtures.student('Validation', 'active');
    await request(env.app.getHttpServer())
      .patch(`/admin/students/${student.studentId}`)
      .set(auth(admin.token))
      .send({ yearLevel: 'fifth_year_college' })
      .expect(400);
    await request(env.app.getHttpServer())
      .patch(`/admin/students/${student.studentId}`)
      .set(auth(admin.token))
      .send({ accountEmail: 'changed@test.invalid' })
      .expect(400);
    await request(env.app.getHttpServer())
      .get('/admin/students/0')
      .set(auth(admin.token))
      .expect(400);
    await request(env.app.getHttpServer())
      .get('/admin/students/999999')
      .set(auth(admin.token))
      .expect(404);
  });
});

describe('Admin Employer APIs', () => {
  test('lists/searches/filters/paginates and returns role-wide summaries', async () => {
    for (let index = 0; index < 6; index++)
      await fixtures.company(`Active${index}`, 'active');
    await fixtures.company('Needle', 'suspended');
    await fixtures.company('Archived', 'archived');
    const first = await request(env.app.getHttpServer())
      .get('/admin/employers')
      .set(auth(admin.token))
      .expect(200);
    expect(first.body.data).toHaveLength(7);
    expect(first.body.meta).toMatchObject({
      limit: 7,
      total: 8,
      totalPages: 2,
    });
    expect(first.body.summary).toEqual({
      total: 8,
      active: 6,
      suspended: 1,
      archived: 1,
    });
    const filtered = await request(env.app.getHttpServer())
      .get('/admin/employers?search=needle&status=suspended&limit=1&page=1')
      .set(auth(admin.token))
      .expect(200);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.summary.total).toBe(8);
  });

  test('views active and archived employers with numeric company size', async () => {
    for (const status of ['active', 'archived'] as const) {
      const company = await fixtures.company(status, status);
      const response = await request(env.app.getHttpServer())
        .get(`/admin/employers/${company.companyId}`)
        .set(auth(admin.token))
        .expect(200);
      expect(response.body).toMatchObject({
        companyId: company.companyId,
        accountStatus: status,
        companySize: 250,
      });
      expect(typeof response.body.companySize).toBe('number');
    }
  });

  test('updates active and suspended profiles without changing account email', async () => {
    for (const status of ['active', 'suspended'] as const) {
      const company = await fixtures.company(status, status);
      const response = await request(env.app.getHttpServer())
        .patch(`/admin/employers/${company.companyId}`)
        .set(auth(admin.token))
        .send({
          companyName: `Updated ${status}`,
          contactEmail: `${status}@profile.test`,
          companySize: 300,
        })
        .expect(200);
      expect(response.body).toMatchObject({
        accountEmail: company.email,
        contactEmail: `${status}@profile.test`,
        companySize: 300,
      });
    }
  });

  test('rejects archived edits and account-email ownership fields', async () => {
    const archived = await fixtures.company('Archived', 'archived');
    await request(env.app.getHttpServer())
      .patch(`/admin/employers/${archived.companyId}`)
      .set(auth(admin.token))
      .send({ companyName: 'Nope' })
      .expect(409);
    const active = await fixtures.company('Active', 'active');
    await request(env.app.getHttpServer())
      .patch(`/admin/employers/${active.companyId}`)
      .set(auth(admin.token))
      .send({ accountEmail: 'nope@test.invalid' })
      .expect(400);
  });

  test('validates the create contract then returns the DB-ADMIN-002 stub', async () => {
    const response = await request(env.app.getHttpServer())
      .post('/admin/employers')
      .set(auth(admin.token))
      .send(employerBody)
      .expect(503);
    expect(response.body).toMatchObject({
      code: 'DB_MIGRATION_PENDING',
      dependency: 'DB-ADMIN-002',
    });
    await request(env.app.getHttpServer())
      .post('/admin/employers')
      .set(auth(admin.token))
      .send({ ...employerBody, accountEmail: 'invalid' })
      .expect(400);
  });
});

describe('Admin QC PESO APIs', () => {
  test('lists/searches/filters/paginates and returns role-wide summaries', async () => {
    for (let index = 0; index < 6; index++)
      await fixtures.peso(`Active${index}`, 'active');
    await fixtures.peso('Needle', 'suspended');
    await fixtures.peso('Archived', 'archived');
    const first = await request(env.app.getHttpServer())
      .get('/admin/qc-peso')
      .set(auth(admin.token))
      .expect(200);
    expect(first.body.data).toHaveLength(7);
    expect(first.body.summary).toEqual({
      total: 8,
      active: 6,
      suspended: 1,
      archived: 1,
    });
    const filtered = await request(env.app.getHttpServer())
      .get('/admin/qc-peso?search=needle&status=suspended&page=1&limit=2')
      .set(auth(admin.token))
      .expect(200);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.summary.total).toBe(8);
  });

  test('views active and archived details without exposing verification state', async () => {
    for (const status of ['active', 'archived'] as const) {
      const peso = await fixtures.peso(status, status);
      const response = await request(env.app.getHttpServer())
        .get(`/admin/qc-peso/${peso.pesoPersonnelId}`)
        .set(auth(admin.token))
        .expect(200);
      expect(response.body).toMatchObject({
        pesoPersonnelId: peso.pesoPersonnelId,
        accountStatus: status,
      });
      expect(response.body).not.toHaveProperty('verificationStatus');
      expect(response.body).not.toHaveProperty('employeeIdFilePath');
    }
  });

  test('updates active and suspended profiles without changing account email', async () => {
    for (const status of ['active', 'suspended'] as const) {
      const peso = await fixtures.peso(status, status);
      const response = await request(env.app.getHttpServer())
        .patch(`/admin/qc-peso/${peso.pesoPersonnelId}`)
        .set(auth(admin.token))
        .send({
          contactEmail: `${status}@profile.test`,
          position: 'Senior Officer',
        })
        .expect(200);
      expect(response.body).toMatchObject({
        accountEmail: peso.email,
        contactEmail: `${status}@profile.test`,
        position: 'Senior Officer',
      });
    }
  });

  test('rejects archived edits and verification/account ownership fields', async () => {
    const archived = await fixtures.peso('Archived', 'archived');
    await request(env.app.getHttpServer())
      .patch(`/admin/qc-peso/${archived.pesoPersonnelId}`)
      .set(auth(admin.token))
      .send({ position: 'Nope' })
      .expect(409);
    const active = await fixtures.peso('Active', 'active');
    await request(env.app.getHttpServer())
      .patch(`/admin/qc-peso/${active.pesoPersonnelId}`)
      .set(auth(admin.token))
      .send({ verificationStatus: 'approved' })
      .expect(400);
  });

  test('validates the create contract then returns the DB-ADMIN-003 stub', async () => {
    const response = await request(env.app.getHttpServer())
      .post('/admin/qc-peso')
      .set(auth(admin.token))
      .send(pesoBody)
      .expect(503);
    expect(response.body).toMatchObject({
      code: 'DB_MIGRATION_PENDING',
      dependency: 'DB-ADMIN-003',
    });
    await request(env.app.getHttpServer())
      .post('/admin/qc-peso')
      .set(auth(admin.token))
      .send({ ...pesoBody, employeeId: '' })
      .expect(400);
  });
});

describe('shared Admin account status API', () => {
  test('implements suspended -> active and records the Admin actor', async () => {
    const student = await fixtures.student('Suspended', 'suspended');
    await request(env.app.getHttpServer())
      .patch(`/admin/accounts/${student.accountId}/status`)
      .set(auth(admin.token))
      .send({ status: 'active' })
      .expect(200);
    const rows = await db.query(
      'SELECT account_status, deleted_at FROM public.user_account WHERE user_account_id=$1',
      [student.accountId],
    );
    expect(rows[0]).toMatchObject({
      account_status: 'active',
      deleted_at: null,
    });
    const history = await db.query(
      'SELECT changed_by_user_account_id FROM public.user_account_status_history WHERE user_account_id=$1',
      [student.accountId],
    );
    expect(Number(history[0].changed_by_user_account_id)).toBe(admin.accountId);
  });

  test('implements active -> archived, revokes sessions, and keeps details viewable', async () => {
    const company = await fixtures.company('Active', 'active');
    await db.query(
      `INSERT INTO public.authentication_session
        (user_account_id, token_family_id, refresh_token_hash, expires_at)
       VALUES ($1,'20000000-0000-4000-8000-000000000001','hash',CURRENT_TIMESTAMP + INTERVAL '1 day')`,
      [company.accountId],
    );
    await request(env.app.getHttpServer())
      .patch(`/admin/accounts/${company.accountId}/status`)
      .set(auth(admin.token))
      .send({ status: 'archived' })
      .expect(200);
    const rows = await db.query(
      `SELECT ua.account_status, ua.deleted_at, s.revoked_at FROM public.user_account ua
       JOIN public.authentication_session s ON s.user_account_id=ua.user_account_id WHERE ua.user_account_id=$1`,
      [company.accountId],
    );
    expect(rows[0].account_status).toBe('archived');
    expect(rows[0].deleted_at).not.toBeNull();
    expect(rows[0].revoked_at).not.toBeNull();
    await request(env.app.getHttpServer())
      .get(`/admin/employers/${company.companyId}`)
      .set(auth(admin.token))
      .expect(200)
      .expect(({ body }) => expect(body.accountStatus).toBe('archived'));
  });

  test('implements suspended -> archived', async () => {
    const peso = await fixtures.peso('Suspended', 'suspended');
    await request(env.app.getHttpServer())
      .patch(`/admin/accounts/${peso.accountId}/status`)
      .set(auth(admin.token))
      .send({ status: 'archived' })
      .expect(200);
    const rows = await db.query(
      'SELECT account_status, deleted_at FROM public.user_account WHERE user_account_id=$1',
      [peso.accountId],
    );
    expect(rows[0].account_status).toBe('archived');
    expect(rows[0].deleted_at).not.toBeNull();
  });

  test('rejects archived -> active and archived -> suspended', async () => {
    const student = await fixtures.student('Archived', 'archived');
    await request(env.app.getHttpServer())
      .patch(`/admin/accounts/${student.accountId}/status`)
      .set(auth(admin.token))
      .send({ status: 'active' })
      .expect(409);
    await request(env.app.getHttpServer())
      .patch(`/admin/accounts/${student.accountId}/status`)
      .set(auth(admin.token))
      .send({ status: 'suspended', suspensionDays: 7 })
      .expect(409);
  });

  test('returns DB-ADMIN-001 for timed suspension without mutating state', async () => {
    const student = await fixtures.student('Active', 'active');
    const response = await request(env.app.getHttpServer())
      .patch(`/admin/accounts/${student.accountId}/status`)
      .set(auth(admin.token))
      .send({ status: 'suspended', suspensionDays: 7 })
      .expect(503);
    expect(response.body).toMatchObject({
      code: 'DB_MIGRATION_PENDING',
      dependency: 'DB-ADMIN-001',
    });
    const rows = await db.query(
      'SELECT account_status FROM public.user_account WHERE user_account_id=$1',
      [student.accountId],
    );
    expect(rows[0].account_status).toBe('active');
    const history = await db.query(
      'SELECT count(*) AS count FROM public.user_account_status_history WHERE user_account_id=$1',
      [student.accountId],
    );
    expect(Number(history[0].count)).toBe(0);
  });

  test('validates suspension days and refuses to manage Admin accounts', async () => {
    const student = await fixtures.student('Active', 'active');
    await request(env.app.getHttpServer())
      .patch(`/admin/accounts/${student.accountId}/status`)
      .set(auth(admin.token))
      .send({ status: 'suspended', suspensionDays: 0 })
      .expect(400);
    await request(env.app.getHttpServer())
      .patch(`/admin/accounts/${admin.accountId}/status`)
      .set(auth(admin.token))
      .send({ status: 'archived' })
      .expect(404);
  });
});
