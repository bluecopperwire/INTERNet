/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { AssignmentStartScheduler } from '../../src/employer/scheduler/assignment-start.scheduler';
import { EmployerE2eEnvironment } from './support/employer-e2e-environment';
import {
  EmployerFixtureFactory,
  type CompanyFixture,
  type StudentFixture,
} from './support/fixture-factory';

const env = new EmployerE2eEnvironment();
let fixtures: EmployerFixtureFactory;
let companyA: CompanyFixture;
let companyB: CompanyFixture;
let studentActor: StudentFixture;
let db: DataSource;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const todayManila = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

beforeAll(async () => {
  await env.start();
  db = env.dataSource;
});

beforeEach(async () => {
  await env.resetDatabase();
  fixtures = new EmployerFixtureFactory(db, env.documentRoot);
  await fixtures.seedReference();
  companyA = await fixtures.company('A');
  companyB = await fixtures.company('B');
  studentActor = await fixtures.student('WrongRole');
});

afterAll(async () => env.stop());

describe('shared HTTP authentication and authorization for all 29 routes', () => {
  const routes: Array<[string, string]> = [
    ['get', '/employer/profile'],
    ['patch', '/employer/profile'],
    ['put', '/employer/profile/image'],
    ['get', '/employer/opportunities'],
    ['post', '/employer/opportunities'],
    ['get', '/employer/opportunities/1'],
    ['patch', '/employer/opportunities/1'],
    ['patch', '/employer/opportunities/1/close'],
    ['delete', '/employer/opportunities/1'],
    ['get', '/employer/opportunities/1/referrals'],
    ['get', '/employer/referrals'],
    ['get', '/employer/referrals/1'],
    ['patch', '/employer/referrals/1/accept'],
    ['put', '/employer/referrals/1/interview'],
    ['patch', '/employer/referrals/1/reject'],
    ['get', '/employer/referrals/1/documents/1/download'],
    ['get', '/employer/internship-assignment-candidates'],
    ['post', '/employer/referrals/1/internship-assignment'],
    ['patch', '/employer/referrals/1/withdraw-acceptance'],
    ['get', '/employer/attendance/summary'],
    ['get', '/employer/attendance'],
    ['get', '/employer/internships/1/attendance'],
    ['get', '/employer/internships/summary'],
    ['get', '/employer/internships'],
    ['get', '/employer/internships/1'],
    ['patch', '/employer/internships/1'],
    ['patch', '/employer/internships/1/cancel'],
    ['patch', '/employer/internships/1/complete'],
    ['delete', '/employer/internships/1'],
  ];

  test.each(routes)('%s %s rejects a missing JWT', async (method, path) => {
    await (request(env.app.getHttpServer()) as any)[method](path).expect(401);
  });

  test.each(routes)('%s %s rejects the student role', async (method, path) => {
    await (request(env.app.getHttpServer()) as any)
      [method](path)
      .set(auth(studentActor.token))
      .expect(403);
  });
});

describe('profile APIs', () => {
  test('E2E-PROFILE-001 returns the joined company profile', async () => {
    const { body } = await request(env.app.getHttpServer())
      .get('/employer/profile')
      .set(auth(companyA.token))
      .expect(200);
    expect(body).toMatchObject({
      companyId: companyA.companyId,
      companyType: 'private',
      industryName: 'Information Technology',
    });
  });

  test('E2E-PROFILE-002 returns 404 for a company-role account with no company row', async () => {
    const orphan = await fixtures.corruptCompanyAccountWithoutProfile();
    await request(env.app.getHttpServer())
      .get('/employer/profile')
      .set(auth(orphan.token))
      .expect(404);
  });

  test('E2E-PROFILE-004/005/010 partial update persists, resolves industry case-insensitively, and normalizes nullable whitespace', async () => {
    const before = await request(env.app.getHttpServer())
      .get('/employer/profile')
      .set(auth(companyA.token))
      .expect(200);
    const { body } = await request(env.app.getHttpServer())
      .patch('/employer/profile')
      .set(auth(companyA.token))
      .send({
        companyName: ' Updated Employer ',
        industryName: 'engineering',
        websiteUrl: '   ',
        addressDistrict: ' ',
      })
      .expect(200);
    expect(body).toMatchObject({
      companyName: 'Updated Employer',
      industryName: 'Engineering',
      websiteUrl: null,
      addressDistrict: null,
      contactEmail: before.body.contactEmail,
    });
    const row = await db.query(
      'SELECT company_name, industry_id FROM public.company WHERE company_id=$1',
      [companyA.companyId],
    );
    expect(row[0].company_name).toBe('Updated Employer');
  });

  test.each([
    [
      'E2E-PROFILE-006 custom industry',
      { industryName: 'Other (please specify)' },
    ],
    ['E2E-PROFILE-007 invalid email', { contactEmail: 'bad-email' }],
    ['E2E-PROFILE-008 nonpositive size', { companySize: 0 }],
    ['E2E-PROFILE-009 future year', { yearEstablished: 9999 }],
    ['E2E-PROFILE-011 ownership field', { companyId: 999999 }],
  ])(
    '%s returns 400 and leaves ownership/data unchanged',
    async (_name, body) => {
      const before = await db.query(
        'SELECT * FROM public.company WHERE company_id=$1',
        [companyA.companyId],
      );
      await request(env.app.getHttpServer())
        .patch('/employer/profile')
        .set(auth(companyA.token))
        .send(body)
        .expect(400);
      const after = await db.query(
        'SELECT * FROM public.company WHERE company_id=$1',
        [companyA.companyId],
      );
      expect(after[0]).toMatchObject(before[0]);
    },
  );

  test('E2E-PROFILE-012/013/016 uploads safely and replaces the prior managed file', async () => {
    const oldAbsolute = join(
      env.uploadRoot,
      'company-logos',
      'old-managed.png',
    );
    mkdirSync(dirname(oldAbsolute), { recursive: true });
    writeFileSync(oldAbsolute, Buffer.from('old'));
    await db.query(
      `UPDATE public.company SET logo_file_path='/uploads/company-logos/old-managed.png' WHERE company_id=$1`,
      [companyA.companyId],
    );
    const { body } = await request(env.app.getHttpServer())
      .put('/employer/profile/image')
      .set(auth(companyA.token))
      .attach('image', Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
        filename: '../../../../escape.png',
        contentType: 'image/png',
      })
      .expect(200);
    expect(body.logoFilePath).toMatch(/^\/uploads\/company-logos\//);
    expect(
      existsSync(
        resolve(env.uploadRoot, body.logoFilePath.replace(/^\/uploads\//, '')),
      ),
    ).toBe(true);
    expect(existsSync(oldAbsolute)).toBe(false);
    expect(
      resolve(
        env.uploadRoot,
        body.logoFilePath.replace(/^\/uploads\//, ''),
      ).startsWith(resolve(env.uploadRoot)),
    ).toBe(true);
  });

  test.each([
    [
      'E2E-PROFILE-014 unsupported MIME',
      Buffer.from('text'),
      'logo.txt',
      'text/plain',
      415,
    ],
    [
      'E2E-PROFILE-015 over 5 MiB',
      Buffer.alloc(5 * 1024 * 1024 + 1),
      'huge.png',
      'image/png',
      413,
    ],
  ])(
    '%s is rejected without changing the DB path',
    async (_name, bytes, name, mime, status) => {
      const before = await db.query(
        'SELECT logo_file_path FROM public.company WHERE company_id=$1',
        [companyA.companyId],
      );
      await request(env.app.getHttpServer())
        .put('/employer/profile/image')
        .set(auth(companyA.token))
        .attach('image', bytes, { filename: name, contentType: mime })
        .expect(status);
      const after = await db.query(
        'SELECT logo_file_path FROM public.company WHERE company_id=$1',
        [companyA.companyId],
      );
      expect(after[0]).toEqual(before[0]);
    },
  );
});

describe('opportunity APIs', () => {
  test('E2E-OPP-001..006 lists scoped/filterable/paginated opportunities with referral counts and Manila dates', async () => {
    const own = await fixtures.opportunity(companyA.companyId, {
      title: 'Own Open',
      allowance: '5000.00',
      deadline: '2026-09-01T00:30:00+08:00',
    });
    await fixtures.opportunity(companyA.companyId, {
      title: 'Own Closed',
      status: 'closed',
      allowance: null,
    });
    await fixtures.opportunity(companyB.companyId, { title: 'Foreign' });
    const referred = await fixtures.referral(companyA.companyId, {
      title: 'Counted Referral',
    });
    await fixtures.unreferredApplication(companyA.companyId);
    const { body } = await request(env.app.getHttpServer())
      .get('/employer/opportunities?status=open&page=1&limit=50')
      .set(auth(companyA.token))
      .expect(200);
    expect(body.data.every((x: any) => x.opportunityStatus === 'open')).toBe(
      true,
    );
    expect(body.data.some((x: any) => x.title === 'Foreign')).toBe(false);
    expect(body.meta).toMatchObject({ page: 1, limit: 50 });
    expect(body.data.find((x: any) => x.opportunityId === own)).toMatchObject({
      allowance: '5000.00',
      applicationDeadline: '2026-09-01',
    });
    expect(
      body.data.find((x: any) => x.opportunityId === referred.opportunityId)
        .totalApplicantCount,
    ).toBe(1);
    expect(body.data.map((x: any) => x.opportunityId)).toEqual(
      [...body.data.map((x: any) => x.opportunityId)].sort(
        (a: number, b: number) => b - a,
      ),
    );
  });

  test('E2E-OPP-007..009 POST validates before returning DB-EMP-001 and never inserts', async () => {
    const valid = {
      title: 'Blocked',
      department: 'IT',
      workArrangement: 'remote',
      minimumRequiredHours: 80,
      offeredSlots: 1,
      allowance: null,
      description: 'Blocked create',
      qualification: null,
      applicationDeadline: '2026-09-30',
    };
    const countBefore = Number(
      (await db.query('SELECT count(*) AS n FROM public.opportunity'))[0].n,
    );
    const blocked = await request(env.app.getHttpServer())
      .post('/employer/opportunities')
      .set(auth(companyA.token))
      .send(valid)
      .expect(503);
    expect(blocked.body).toMatchObject({
      code: 'DB_MIGRATION_PENDING',
      dependency: 'DB-EMP-001',
    });
    await request(env.app.getHttpServer())
      .post('/employer/opportunities')
      .set(auth(companyA.token))
      .send({ ...valid, offeredSlots: 0 })
      .expect(400);
    expect(
      Number(
        (await db.query('SELECT count(*) AS n FROM public.opportunity'))[0].n,
      ),
    ).toBe(countBefore);
  });

  test('E2E-OPP-010..016 detail/update scoping and blocker behavior', async () => {
    const own = await fixtures.opportunity(companyA.companyId, {
      title: 'Own Detail',
    });
    const foreign = await fixtures.opportunity(companyB.companyId, {
      title: 'Foreign Detail',
    });
    await request(env.app.getHttpServer())
      .get(`/employer/opportunities/${own}`)
      .set(auth(companyA.token))
      .expect(200);
    await request(env.app.getHttpServer())
      .get(`/employer/opportunities/${foreign}`)
      .set(auth(companyA.token))
      .expect(404);
    await request(env.app.getHttpServer())
      .get('/employer/opportunities/999999')
      .set(auth(companyA.token))
      .expect(404);
    const before = await db.query(
      'SELECT title FROM public.opportunity WHERE opportunity_id=$1',
      [own],
    );
    const blocked = await request(env.app.getHttpServer())
      .patch(`/employer/opportunities/${own}`)
      .set(auth(companyA.token))
      .send({ title: 'No Write' })
      .expect(503);
    expect(blocked.body.dependency).toBe('DB-EMP-001');
    expect(
      await db.query(
        'SELECT title FROM public.opportunity WHERE opportunity_id=$1',
        [own],
      ),
    ).toEqual(before);
    await request(env.app.getHttpServer())
      .patch(`/employer/opportunities/${foreign}`)
      .set(auth(companyA.token))
      .send({ title: 'No' })
      .expect(404);
    await request(env.app.getHttpServer())
      .patch(`/employer/opportunities/${own}`)
      .set(auth(companyA.token))
      .send({ offeredSlots: 0 })
      .expect(400);
  });

  test('E2E-OPP-017..025 close/archive transitions are valid, idempotent, scoped, and never physically delete', async () => {
    const open = await fixtures.opportunity(companyA.companyId);
    const closed = await fixtures.opportunity(companyA.companyId, {
      status: 'closed',
    });
    const archived = await fixtures.opportunity(companyA.companyId, {
      status: 'archived',
    });
    const foreign = await fixtures.opportunity(companyB.companyId);
    await request(env.app.getHttpServer())
      .patch(`/employer/opportunities/${open}/close`)
      .set(auth(companyA.token))
      .expect(200);
    await request(env.app.getHttpServer())
      .patch(`/employer/opportunities/${open}/close`)
      .set(auth(companyA.token))
      .expect(200);
    await request(env.app.getHttpServer())
      .patch(`/employer/opportunities/${archived}/close`)
      .set(auth(companyA.token))
      .expect(409);
    await request(env.app.getHttpServer())
      .patch(`/employer/opportunities/${foreign}/close`)
      .set(auth(companyA.token))
      .expect(404);
    for (const id of [open, closed, archived]) {
      await request(env.app.getHttpServer())
        .delete(`/employer/opportunities/${id}`)
        .set(auth(companyA.token))
        .expect(200);
    }
    const rows = await db.query(
      'SELECT opportunity_id,opportunity_status FROM public.opportunity WHERE opportunity_id=ANY($1) ORDER BY opportunity_id',
      [[open, closed, archived]],
    );
    expect(rows).toHaveLength(3);
    expect(rows.every((x: any) => x.opportunity_status === 'archived')).toBe(
      true,
    );
    await request(env.app.getHttpServer())
      .delete(`/employer/opportunities/${foreign}`)
      .set(auth(companyA.token))
      .expect(404);
  });

  test('E2E-OPP-026..031 opportunity referral listing excludes unreferred/cross-company and supports filters/search/pagination', async () => {
    const r1 = await fixtures.referral(companyA.companyId, {
      title: 'Selected Job',
      response: 'accepted',
      studentLabel: 'Alice',
    });
    await fixtures.referral(companyA.companyId, {
      title: 'Other Job',
      response: 'rejected',
      studentLabel: 'Beth',
    });
    await fixtures.unreferredApplication(companyA.companyId, 'RawOnly');
    const foreign = await fixtures.referral(companyB.companyId, {
      title: 'Foreign Job',
    });
    const { body } = await request(env.app.getHttpServer())
      .get(
        `/employer/opportunities/${r1.opportunityId}/referrals?companyResponse=accepted&search=Alice&page=1&limit=1`,
      )
      .set(auth(companyA.token))
      .expect(200);
    expect(body.meta).toMatchObject({ total: 1, page: 1, limit: 1 });
    expect(body.data[0].referralId).toBe(r1.referralId);
    await request(env.app.getHttpServer())
      .get(`/employer/opportunities/${foreign.opportunityId}/referrals`)
      .set(auth(companyA.token))
      .expect(404);
  });
});

describe('referral APIs', () => {
  test('E2E-REF-001..006 list is scoped, excludes unreferred applications, and supports search/filter/pagination', async () => {
    const alice = await fixtures.referral(companyA.companyId, {
      title: 'Platform Engineer',
      response: 'accepted',
      studentLabel: 'Alice',
    });
    await fixtures.referral(companyA.companyId, {
      title: 'Design Intern',
      response: 'rejected',
      studentLabel: 'Beth',
    });
    await fixtures.referral(companyB.companyId, {
      title: 'Foreign Platform',
      response: 'accepted',
      studentLabel: 'Foreign',
    });
    await fixtures.unreferredApplication(companyA.companyId, 'Raw');
    for (const query of [
      'search=Alice',
      'search=Platform',
      'companyResponse=accepted',
    ]) {
      const { body } = await request(env.app.getHttpServer())
        .get(`/employer/referrals?${query}&page=1&limit=1`)
        .set(auth(companyA.token))
        .expect(200);
      expect(body.meta).toMatchObject({ total: 1, page: 1, limit: 1 });
      expect(body.data[0].referralId).toBe(alice.referralId);
    }
  });

  test('E2E-REF-007..010 detail aggregates only the scoped student data and handles null interview/cross-company', async () => {
    const own = await fixtures.referral(companyA.companyId, {
      title: 'Review Job',
      studentLabel: 'Review',
    });
    const otherStudent = await fixtures.student('OtherDocs');
    const ownDocument = await fixtures.document(own.student.studentId);
    await fixtures.document(otherStudent.studentId);
    const { body } = await request(env.app.getHttpServer())
      .get(`/employer/referrals/${own.referralId}`)
      .set(auth(companyA.token))
      .expect(200);
    expect(body).toHaveProperty('referral.referralId', own.referralId);
    expect(body).toHaveProperty('application.applicationId', own.applicationId);
    expect(body).toHaveProperty('student.studentId', own.student.studentId);
    expect(body).toHaveProperty('internshipPreference');
    expect(body).toHaveProperty('opportunity.opportunityId', own.opportunityId);
    expect(body.interview).toBeNull();
    expect(body.documents.map((x: any) => x.submissionId)).toEqual([
      ownDocument,
    ]);
    const foreign = await fixtures.referral(companyB.companyId);
    await request(env.app.getHttpServer())
      .get(`/employer/referrals/${foreign.referralId}`)
      .set(auth(companyA.token))
      .expect(404);
  });

  test('E2E-REF-011..018 acceptance follows workflow, records employer actor, preserves application status, and scopes', async () => {
    const sent = await fixtures.referral(companyA.companyId);
    const interview = await fixtures.referral(companyA.companyId, {
      response: 'for_interview',
    });
    for (const item of [sent, interview]) {
      const { body } = await request(env.app.getHttpServer())
        .patch(`/employer/referrals/${item.referralId}/accept`)
        .set(auth(companyA.token))
        .expect(200);
      expect(body.referral).toMatchObject({
        referralStatus: 'under_review',
        companyResponse: 'accepted',
      });
      const application = await db.query(
        'SELECT application_status FROM public.application WHERE application_id=$1',
        [item.applicationId],
      );
      expect(application[0].application_status).toBe('approved_for_referral');
    }
    const history = await db.query(
      `SELECT changed_by_user_account_id FROM public.referral_status_history WHERE referral_id=$1 ORDER BY changed_at DESC LIMIT 1`,
      [sent.referralId],
    );
    expect(Number(history[0].changed_by_user_account_id)).toBe(
      companyA.accountId,
    );
    const rejected = await fixtures.referral(companyA.companyId, {
      response: 'rejected',
    });
    await request(env.app.getHttpServer())
      .patch(`/employer/referrals/${rejected.referralId}/accept`)
      .set(auth(companyA.token))
      .expect(409);
    await request(env.app.getHttpServer())
      .patch(`/employer/referrals/${sent.referralId}/accept`)
      .set(auth(companyA.token))
      .expect(409);
    const foreign = await fixtures.referral(companyB.companyId);
    await request(env.app.getHttpServer())
      .patch(`/employer/referrals/${foreign.referralId}/accept`)
      .set(auth(companyA.token))
      .expect(404);
  });

  test('E2E-REF-019..021 creates online/physical interviews and upserts one row', async () => {
    const online = await fixtures.referral(companyA.companyId);
    let response = await request(env.app.getHttpServer())
      .put(`/employer/referrals/${online.referralId}/interview`)
      .set(auth(companyA.token))
      .send({
        interviewDate: '2026-09-20',
        interviewTime: '10:00',
        interviewMode: 'online',
        onlineMeetingUrl: 'https://meet.example.test/one',
      })
      .expect(200);
    expect(response.body.interview).toMatchObject({
      interviewMode: 'online',
      physicalLocation: null,
    });
    response = await request(env.app.getHttpServer())
      .put(`/employer/referrals/${online.referralId}/interview`)
      .set(auth(companyA.token))
      .send({
        interviewDate: '2026-09-21',
        interviewTime: '11:00',
        interviewMode: 'physical',
        physicalLocation: 'Room 1',
      })
      .expect(200);
    expect(response.body.interview).toMatchObject({
      interviewMode: 'physical',
      physicalLocation: 'Room 1',
      onlineMeetingUrl: null,
    });
    expect(
      Number(
        (
          await db.query(
            'SELECT count(*) AS n FROM public.interview WHERE referral_id=$1',
            [online.referralId],
          )
        )[0].n,
      ),
    ).toBe(1);
  });

  test.each([
    [
      'E2E-REF-022 online URL required',
      {
        interviewDate: '2026-09-20',
        interviewTime: '10:00',
        interviewMode: 'online',
      },
      400,
    ],
    [
      'E2E-REF-023 physical location required',
      {
        interviewDate: '2026-09-20',
        interviewTime: '10:00',
        interviewMode: 'physical',
      },
      400,
    ],
    [
      'E2E-REF-024 incompatible location',
      {
        interviewDate: '2026-09-20',
        interviewTime: '10:00',
        interviewMode: 'online',
        onlineMeetingUrl: 'https://meet.test/x',
        physicalLocation: 'Room',
      },
      400,
    ],
    [
      'E2E-REF-025 past Manila datetime',
      {
        interviewDate: '2020-01-01',
        interviewTime: '10:00',
        interviewMode: 'physical',
        physicalLocation: 'Room',
      },
      400,
    ],
  ])('%s', async (_name, body, status) => {
    const referral = await fixtures.referral(companyA.companyId);
    await request(env.app.getHttpServer())
      .put(`/employer/referrals/${referral.referralId}/interview`)
      .set(auth(companyA.token))
      .send(body)
      .expect(status);
  });

  test('E2E-REF-026..028 terminal/cross-company referrals cannot schedule interviews', async () => {
    for (const responseState of ['accepted', 'rejected'] as const) {
      const referral = await fixtures.referral(companyA.companyId, {
        response: responseState,
      });
      await request(env.app.getHttpServer())
        .put(`/employer/referrals/${referral.referralId}/interview`)
        .set(auth(companyA.token))
        .send({
          interviewDate: '2026-09-20',
          interviewTime: '10:00',
          interviewMode: 'physical',
          physicalLocation: 'Room',
        })
        .expect(409);
    }
    const foreign = await fixtures.referral(companyB.companyId);
    await request(env.app.getHttpServer())
      .put(`/employer/referrals/${foreign.referralId}/interview`)
      .set(auth(companyA.token))
      .send({
        interviewDate: '2026-09-20',
        interviewTime: '10:00',
        interviewMode: 'physical',
        physicalLocation: 'Room',
      })
      .expect(404);
  });

  test('E2E-REF-029..036 rejection transitions pending/interview, stores optional remark/actor, and rejects terminal/cross-company', async () => {
    const pending = await fixtures.referral(companyA.companyId);
    const interviewing = await fixtures.referral(companyA.companyId, {
      response: 'for_interview',
    });
    await request(env.app.getHttpServer())
      .patch(`/employer/referrals/${pending.referralId}/reject`)
      .set(auth(companyA.token))
      .send({ remark: null })
      .expect(200);
    const rejected = await request(env.app.getHttpServer())
      .patch(`/employer/referrals/${interviewing.referralId}/reject`)
      .set(auth(companyA.token))
      .send({ remark: 'Not aligned' })
      .expect(200);
    expect(rejected.body.referral).toMatchObject({
      referralStatus: 'closed',
      companyResponse: 'rejected',
      referralRemark: 'Not aligned',
    });
    const history = await db.query(
      `SELECT changed_by_user_account_id FROM public.referral_status_history WHERE referral_id=$1 AND new_referral_status='closed'`,
      [interviewing.referralId],
    );
    expect(Number(history[0].changed_by_user_account_id)).toBe(
      companyA.accountId,
    );
    const accepted = await fixtures.referral(companyA.companyId, {
      response: 'accepted',
    });
    await request(env.app.getHttpServer())
      .patch(`/employer/referrals/${accepted.referralId}/reject`)
      .set(auth(companyA.token))
      .send({})
      .expect(409);
    const foreign = await fixtures.referral(companyB.companyId);
    await request(env.app.getHttpServer())
      .patch(`/employer/referrals/${foreign.referralId}/reject`)
      .set(auth(companyA.token))
      .send({})
      .expect(404);
  });

  test('E2E-REF-037..042 document download validates ownership, record, file, and traversal safety', async () => {
    const own = await fixtures.referral(companyA.companyId);
    const bytes = Buffer.from('%PDF-employer-e2e');
    const documentId = await fixtures.document(own.student.studentId, bytes);
    const download = await request(env.app.getHttpServer())
      .get(
        `/employer/referrals/${own.referralId}/documents/${documentId}/download`,
      )
      .set(auth(companyA.token))
      .expect(200)
      .expect('Content-Type', /application\/pdf/)
      .expect('Content-Disposition', /attachment/);
    expect(Buffer.from(download.body)).toEqual(bytes);
    const other = await fixtures.student('Other');
    const otherDocument = await fixtures.document(other.studentId);
    await request(env.app.getHttpServer())
      .get(
        `/employer/referrals/${own.referralId}/documents/${otherDocument}/download`,
      )
      .set(auth(companyA.token))
      .expect(404);
    await request(env.app.getHttpServer())
      .get(`/employer/referrals/${own.referralId}/documents/999999/download`)
      .set(auth(companyA.token))
      .expect(404);
    await db.query(
      `UPDATE public.student_requirement_submission SET requirement_file_path='/uploads/requirements/missing.pdf' WHERE student_requirement_submission_id=$1`,
      [documentId],
    );
    await request(env.app.getHttpServer())
      .get(
        `/employer/referrals/${own.referralId}/documents/${documentId}/download`,
      )
      .set(auth(companyA.token))
      .expect(404);
    const outside = join(dirname(env.documentRoot), 'outside.pdf');
    writeFileSync(outside, Buffer.from('secret'));
    await db.query(
      `UPDATE public.student_requirement_submission SET requirement_file_path='/uploads/requirements/../outside.pdf' WHERE student_requirement_submission_id=$1`,
      [documentId],
    );
    await request(env.app.getHttpServer())
      .get(
        `/employer/referrals/${own.referralId}/documents/${documentId}/download`,
      )
      .set(auth(companyA.token))
      .expect(404);
    const foreign = await fixtures.referral(companyB.companyId);
    const foreignDocument = await fixtures.document(foreign.student.studentId);
    await request(env.app.getHttpServer())
      .get(
        `/employer/referrals/${foreign.referralId}/documents/${foreignDocument}/download`,
      )
      .set(auth(companyA.token))
      .expect(404);
  });
});

describe('assignment workflow APIs', () => {
  test('E2E-ASG-001..006 candidates are accepted-only, scoped, searchable/filterable, and expose nullable assignment IDs', async () => {
    const candidate = await fixtures.referral(companyA.companyId, {
      title: 'Candidate Job',
      response: 'accepted',
      studentResponse: 'accepted',
      studentLabel: 'Candice',
    });
    const pendingStudent = await fixtures.referral(companyA.companyId, {
      title: 'Pending Job',
      response: 'accepted',
      studentLabel: 'Peter',
    });
    await fixtures.referral(companyA.companyId, { response: 'pending' });
    await fixtures.referral(companyB.companyId, {
      response: 'accepted',
      studentResponse: 'accepted',
    });
    const assignmentId = await fixtures.assignment(candidate.referralId);
    for (const query of [
      'studentResponse=accepted',
      'search=Candice',
      'search=Candidate',
    ]) {
      const { body } = await request(env.app.getHttpServer())
        .get(`/employer/internship-assignment-candidates?${query}`)
        .set(auth(companyA.token))
        .expect(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toMatchObject({
        referralId: candidate.referralId,
        internshipAssignmentId: assignmentId,
      });
    }
    const pending = await request(env.app.getHttpServer())
      .get('/employer/internship-assignment-candidates?studentResponse=pending')
      .set(auth(companyA.token))
      .expect(200);
    expect(
      pending.body.data.find(
        (x: any) => x.referralId === pendingStudent.referralId,
      ).internshipAssignmentId,
    ).toBeNull();
  });

  test('E2E-ASG-007..018 creates one pending assignment with derived fields and enforces validation/workflow/scoping', async () => {
    const accepted = await fixtures.referral(companyA.companyId, {
      title: 'Derived Job',
      response: 'accepted',
      studentResponse: 'accepted',
    });
    const payload = {
      workingDays: 'weekdays',
      requiredHours: 80,
      startDate: '2026-09-01',
      expectedEndDate: '2026-10-01',
      startShift: '08:00',
      endShift: '17:00',
    };
    const created = await request(env.app.getHttpServer())
      .post(`/employer/referrals/${accepted.referralId}/internship-assignment`)
      .set(auth(companyA.token))
      .send(payload)
      .expect(201);
    expect(created.body.status).toMatchObject({ assignmentStatus: 'pending' });
    expect(created.body.assignment).toMatchObject({ jobTitle: 'Derived Job' });
    expect(created.body.assignment.companyName).toMatch(/^Company A/);
    expect(
      Number(
        (
          await db.query(
            'SELECT count(*) AS n FROM public.internship_assignment WHERE referral_id=$1',
            [accepted.referralId],
          )
        )[0].n,
      ),
    ).toBe(1);
    await request(env.app.getHttpServer())
      .post(`/employer/referrals/${accepted.referralId}/internship-assignment`)
      .set(auth(companyA.token))
      .send(payload)
      .expect(409);
    await request(env.app.getHttpServer())
      .post(`/employer/referrals/${accepted.referralId}/internship-assignment`)
      .set(auth(companyA.token))
      .send({ ...payload, companyName: 'Spoof' })
      .expect(400);

    const pendingStudent = await fixtures.referral(companyA.companyId, {
      response: 'accepted',
    });
    const declined = await fixtures.referral(companyA.companyId, {
      response: 'accepted',
      studentResponse: 'declined',
    });
    const employerPending = await fixtures.referral(companyA.companyId);
    for (const ref of [pendingStudent, declined, employerPending]) {
      await request(env.app.getHttpServer())
        .post(`/employer/referrals/${ref.referralId}/internship-assignment`)
        .set(auth(companyA.token))
        .send(payload)
        .expect(409);
    }
    const invalidBodies = [
      { ...payload, workingDays: 'flexible' },
      { ...payload, requiredHours: 0 },
      { ...payload, expectedEndDate: '2026-08-01' },
      { ...payload, endShift: '08:00' },
    ];
    for (const body of invalidBodies) {
      const ref = await fixtures.referral(companyA.companyId, {
        response: 'accepted',
        studentResponse: 'accepted',
      });
      await request(env.app.getHttpServer())
        .post(`/employer/referrals/${ref.referralId}/internship-assignment`)
        .set(auth(companyA.token))
        .send(body)
        .expect(400);
    }
    const foreign = await fixtures.referral(companyB.companyId, {
      response: 'accepted',
      studentResponse: 'accepted',
    });
    await request(env.app.getHttpServer())
      .post(`/employer/referrals/${foreign.referralId}/internship-assignment`)
      .set(auth(companyA.token))
      .send(payload)
      .expect(404);
  });

  test('E2E-ASG-019..022 withdraw acceptance returns DB-EMP-002 only for accepted own referrals and never mutates', async () => {
    const accepted = await fixtures.referral(companyA.companyId, {
      response: 'accepted',
    });
    const blocked = await request(env.app.getHttpServer())
      .patch(`/employer/referrals/${accepted.referralId}/withdraw-acceptance`)
      .set(auth(companyA.token))
      .expect(503);
    expect(blocked.body).toMatchObject({
      code: 'DB_MIGRATION_PENDING',
      dependency: 'DB-EMP-002',
    });
    expect(
      (
        await db.query(
          'SELECT company_response FROM public.referral WHERE referral_id=$1',
          [accepted.referralId],
        )
      )[0].company_response,
    ).toBe('accepted');
    const pending = await fixtures.referral(companyA.companyId);
    await request(env.app.getHttpServer())
      .patch(`/employer/referrals/${pending.referralId}/withdraw-acceptance`)
      .set(auth(companyA.token))
      .expect(409);
    const foreign = await fixtures.referral(companyB.companyId, {
      response: 'accepted',
    });
    await request(env.app.getHttpServer())
      .patch(`/employer/referrals/${foreign.referralId}/withdraw-acceptance`)
      .set(auth(companyA.token))
      .expect(404);
  });
});

describe('attendance APIs', () => {
  const makeAssignment = async (
    company: CompanyFixture,
    options: Parameters<EmployerFixtureFactory['assignment']>[1] = {},
    title = 'Attendance Job',
    studentLabel = 'Attendee',
  ) => {
    const referral = await fixtures.referral(company.companyId, {
      title,
      response: 'accepted',
      studentResponse: 'accepted',
      studentLabel,
    });
    const assignmentId = await fixtures.assignment(
      referral.referralId,
      options,
    );
    return { ...referral, assignmentId };
  };

  test('E2E-ATT-001/002 summary counts present, late, absent and totalActive exactly', async () => {
    const date = '2026-08-17';
    const present = await makeAssignment(
      companyA,
      { status: 'ongoing', startDate: '2026-08-01' },
      'Present Job',
      'Present',
    );
    const late = await makeAssignment(
      companyA,
      { status: 'ongoing', startDate: '2026-08-01' },
      'Late Job',
      'Late',
    );
    await makeAssignment(
      companyA,
      { status: 'ongoing', startDate: '2026-08-01' },
      'Absent Job',
      'Absent',
    );
    await fixtures.attendance(present.assignmentId, date, '08:00', '17:00');
    await fixtures.attendance(late.assignmentId, date, '08:11', '17:00');
    const { body } = await request(env.app.getHttpServer())
      .get(`/employer/attendance/summary?date=${date}`)
      .set(auth(companyA.token))
      .expect(200);
    expect(body).toEqual({ totalActive: 3, present: 1, late: 1, absent: 1 });
    expect(body.totalActive).toBe(body.present + body.late + body.absent);
  });

  test('E2E-ATT-003/004 current-day absence requires the ongoing assignment shift to have ended', async () => {
    const today = todayManila();
    await makeAssignment(
      companyA,
      {
        status: 'ongoing',
        startDate: today,
        startShift: '00:00',
        endShift: '00:01',
      },
      'Ended Shift',
    );
    await makeAssignment(
      companyA,
      {
        status: 'ongoing',
        startDate: today,
        startShift: '00:01',
        endShift: '23:59',
      },
      'Open Shift',
    );
    const { body } = await request(env.app.getHttpServer())
      .get(`/employer/attendance?date=${today}&status=absent`)
      .set(auth(companyA.token))
      .expect(200);
    expect(body.data.map((x: any) => x.jobTitle)).toEqual(['Ended Shift']);
  });

  test('E2E-ATT-005/033 future dates return zero summary and an empty list', async () => {
    const future = '2099-01-01';
    await makeAssignment(companyA, { status: 'ongoing' });
    const summary = await request(env.app.getHttpServer())
      .get(`/employer/attendance/summary?date=${future}`)
      .set(auth(companyA.token))
      .expect(200);
    expect(summary.body).toEqual({
      totalActive: 0,
      present: 0,
      late: 0,
      absent: 0,
    });
    const list = await request(env.app.getHttpServer())
      .get(`/employer/attendance?date=${future}`)
      .set(auth(companyA.token))
      .expect(200);
    expect(list.body.meta.total).toBe(0);
    expect(list.body.data).toEqual([]);
  });

  test('E2E-ATT-006..008 weekday/weekend schedules apply and flexible never creates virtual absence', async () => {
    await makeAssignment(
      companyA,
      { status: 'ongoing', startDate: '2026-08-01', workingDays: 'weekdays' },
      'Weekday',
    );
    await makeAssignment(
      companyA,
      { status: 'ongoing', startDate: '2026-08-01', workingDays: 'weekends' },
      'Weekend',
    );
    await makeAssignment(
      companyA,
      { status: 'ongoing', startDate: '2026-08-01', workingDays: 'flexible' },
      'Flexible',
    );
    const monday = await request(env.app.getHttpServer())
      .get('/employer/attendance?date=2026-08-17&status=absent')
      .set(auth(companyA.token))
      .expect(200);
    expect(monday.body.data.map((x: any) => x.jobTitle)).toEqual(['Weekday']);
    const sunday = await request(env.app.getHttpServer())
      .get('/employer/attendance?date=2026-08-16&status=absent')
      .set(auth(companyA.token))
      .expect(200);
    expect(sunday.body.data.map((x: any) => x.jobTitle)).toEqual(['Weekend']);
  });

  test.each([
    [
      'E2E-ATT-009/010 completed',
      'completed' as const,
      '2026-08-20',
      '2026-08-19',
      '2026-08-21',
    ],
    [
      'E2E-ATT-011/012 cancelled',
      'cancelled' as const,
      '2026-08-20T14:00:00+08:00',
      '2026-08-19',
      '2026-08-21',
    ],
    [
      'E2E-ATT-013/014 withdrawn',
      'withdrawn' as const,
      '2026-08-20T23:30:00+08:00',
      '2026-08-19',
      '2026-08-21',
    ],
  ])(
    '%s assignments are historically included before and excluded after their actual terminal date',
    async (_name, status, terminal, before, after) => {
      await makeAssignment(companyA, {
        status,
        startDate: '2026-08-01',
        endDate: status === 'completed' ? terminal : null,
        terminalChangedAt: status === 'completed' ? undefined : terminal,
      });
      const included = await request(env.app.getHttpServer())
        .get(`/employer/attendance/summary?date=${before}`)
        .set(auth(companyA.token))
        .expect(200);
      expect(included.body.totalActive).toBe(1);
      const excluded = await request(env.app.getHttpServer())
        .get(`/employer/attendance/summary?date=${after}`)
        .set(auth(companyA.token))
        .expect(200);
      expect(excluded.body.totalActive).toBe(0);
    },
  );

  test('E2E-ATT-015 terminal date is inclusive for completed/cancelled/withdrawn', async () => {
    for (const status of ['completed', 'cancelled', 'withdrawn'] as const) {
      await makeAssignment(
        companyA,
        {
          status,
          startDate: '2026-08-01',
          endDate: status === 'completed' ? '2026-08-20' : null,
          terminalChangedAt: '2026-08-20T23:59:00+08:00',
        },
        `${status} inclusive`,
      );
    }
    const { body } = await request(env.app.getHttpServer())
      .get('/employer/attendance/summary?date=2026-08-20')
      .set(auth(companyA.token))
      .expect(200);
    expect(body.totalActive).toBe(3);
  });

  test('E2E-ATT-016 expected_end_date is never treated as an actual historical terminal cutoff', async () => {
    await makeAssignment(companyA, {
      status: 'ongoing',
      startDate: '2026-08-01',
      expectedEndDate: '2026-08-10',
    });
    const { body } = await request(env.app.getHttpServer())
      .get('/employer/attendance/summary?date=2026-08-17')
      .set(auth(companyA.token))
      .expect(200);
    expect(body.totalActive).toBe(1);
  });

  test('E2E-ATT-017/034 Company B attendance never contributes', async () => {
    const foreign = await makeAssignment(companyB, {
      status: 'ongoing',
      startDate: '2026-08-01',
    });
    await fixtures.attendance(foreign.assignmentId, '2026-08-17');
    const summary = await request(env.app.getHttpServer())
      .get('/employer/attendance/summary?date=2026-08-17')
      .set(auth(companyA.token))
      .expect(200);
    expect(summary.body.totalActive).toBe(0);
    const list = await request(env.app.getHttpServer())
      .get('/employer/attendance?date=2026-08-17')
      .set(auth(companyA.token))
      .expect(200);
    expect(list.body.meta.total).toBe(0);
  });

  test('current-day live monitor still requires current assignment_status=ongoing', async () => {
    const today = todayManila();
    const completed = await makeAssignment(companyA, {
      status: 'completed',
      startDate: '2026-08-01',
      endDate: today,
      requiredHours: 8,
    });
    await fixtures.attendance(completed.assignmentId, today, '08:00', '17:00');
    const summary = await request(env.app.getHttpServer())
      .get(`/employer/attendance/summary?date=${today}`)
      .set(auth(companyA.token))
      .expect(200);
    expect(summary.body.totalActive).toBe(0);
  });

  test('E2E-ATT-018..031 daily list derives statuses/hours, virtual absence, filters, search, and pagination', async () => {
    const date = '2026-08-17';
    const values = [
      ['Present Exact', '08:00', '17:00'],
      ['Late Eleven', '08:11', '17:00'],
      ['Early Out', '08:00', '16:00'],
      ['Overtime', '08:00', '18:00'],
      ['Incomplete', '08:00', null],
    ] as const;
    for (const [title, timeIn, timeOut] of values) {
      const item = await makeAssignment(
        companyA,
        { status: 'ongoing', startDate: '2026-08-01' },
        title,
        title.split(' ')[0],
      );
      await fixtures.attendance(item.assignmentId, date, timeIn, timeOut);
    }
    await makeAssignment(
      companyA,
      { status: 'ongoing', startDate: '2026-08-01' },
      'Absent Virtual',
      'Absent',
    );
    const response = await request(env.app.getHttpServer())
      .get(`/employer/attendance?date=${date}&page=1&limit=20`)
      .set(auth(companyA.token))
      .expect(200);
    expect(response.body.meta).toMatchObject({ total: 6, page: 1, limit: 20 });
    const byTitle = new Map(
      response.body.data.map((x: any) => [x.jobTitle, x]),
    );
    expect(byTitle.get('Present Exact')).toMatchObject({
      status: 'present',
      renderedHours: 8,
      renderedHoursStatus: 'complete',
    });
    expect(byTitle.get('Late Eleven')).toMatchObject({
      status: 'late',
      renderedHours: 7.82,
      renderedHoursStatus: 'undertime',
    });
    expect(byTitle.get('Early Out')).toMatchObject({
      renderedHours: 7,
      renderedHoursStatus: 'undertime',
    });
    expect(byTitle.get('Overtime')).toMatchObject({
      renderedHours: 9,
      renderedHoursStatus: 'overtime',
    });
    expect(byTitle.get('Incomplete')).toMatchObject({
      renderedHours: 0,
      renderedHoursStatus: 'incomplete',
      timeOut: null,
    });
    expect(byTitle.get('Absent Virtual')).toMatchObject({
      status: 'absent',
      timeIn: null,
      timeOut: null,
      renderedHours: 0,
      renderedHoursStatus: 'incomplete',
    });
    for (const status of ['present', 'late', 'absent']) {
      const filtered = await request(env.app.getHttpServer())
        .get(`/employer/attendance?date=${date}&status=${status}`)
        .set(auth(companyA.token))
        .expect(200);
      expect(filtered.body.data.every((x: any) => x.status === status)).toBe(
        true,
      );
    }
    const studentSearch = await request(env.app.getHttpServer())
      .get(`/employer/attendance?date=${date}&search=Present`)
      .set(auth(companyA.token))
      .expect(200);
    expect(studentSearch.body.meta.total).toBe(1);
    const titleSearch = await request(env.app.getHttpServer())
      .get(`/employer/attendance?date=${date}&search=Overtime`)
      .set(auth(companyA.token))
      .expect(200);
    expect(titleSearch.body.meta.total).toBe(1);
  });

  test('E2E-ATT-032 daily list matches representative terminal-date applicability', async () => {
    await makeAssignment(companyA, {
      status: 'cancelled',
      startDate: '2026-08-01',
      terminalChangedAt: '2026-08-20T08:00:00+08:00',
    });
    const before = await request(env.app.getHttpServer())
      .get('/employer/attendance?date=2026-08-19')
      .set(auth(companyA.token))
      .expect(200);
    const after = await request(env.app.getHttpServer())
      .get('/employer/attendance?date=2026-08-21')
      .set(auth(companyA.token))
      .expect(200);
    expect(before.body.meta.total).toBe(1);
    expect(after.body.meta.total).toBe(0);
  });

  test('E2E-ATT-035..043 history recomputes totals, preserves actual records, uses actual terminals, ignores expected end, and scopes', async () => {
    const completed = await makeAssignment(
      companyA,
      {
        status: 'completed',
        startDate: '2026-08-17',
        expectedEndDate: '2026-08-17',
        endDate: '2026-08-20',
        requiredHours: 4,
      },
      'Completed History',
    );
    await fixtures.attendance(
      completed.assignmentId,
      '2026-08-18',
      '08:00',
      '17:00',
      23,
    );
    const completedHistory = await request(env.app.getHttpServer())
      .get(`/employer/internships/${completed.assignmentId}/attendance`)
      .set(auth(companyA.token))
      .expect(200);
    const checks: Record<string, boolean> = {
      recomputedHeader:
        completedHistory.body.header.renderedHours === 8 &&
        completedHistory.body.header.remainingHours === 0,
      actualAfterCompletionVisible: completedHistory.body.history.some(
        (x: any) => x.date === '2026-08-18' && x.timeIn !== null,
      ),
      completedVirtualThroughTerminal: completedHistory.body.history.some(
        (x: any) => x.date === '2026-08-20' && x.timeIn === null,
      ),
    };

    for (const status of ['cancelled', 'withdrawn'] as const) {
      const item = await makeAssignment(
        companyA,
        {
          status,
          startDate: '2026-08-17',
          terminalChangedAt: '2026-08-20T15:00:00+08:00',
        },
        `${status} History`,
      );
      const history = await request(env.app.getHttpServer())
        .get(`/employer/internships/${item.assignmentId}/attendance`)
        .set(auth(companyA.token))
        .expect(200);
      checks[`${status}ThroughTerminal`] = history.body.history.some(
        (x: any) => x.date === '2026-08-20',
      );
      checks[`${status}StopsAfterTerminal`] = !history.body.history.some(
        (x: any) => x.date === '2026-08-21',
      );
    }

    const ongoing = await makeAssignment(
      companyA,
      {
        status: 'ongoing',
        startDate: '2026-08-17',
        expectedEndDate: '2026-08-18',
      },
      'Past Expected',
    );
    const ongoingHistory = await request(env.app.getHttpServer())
      .get(`/employer/internships/${ongoing.assignmentId}/attendance`)
      .set(auth(companyA.token))
      .expect(200);
    checks.ongoingContinuesPastExpectedEnd = ongoingHistory.body.history.some(
      (x: any) => x.date > '2026-08-18',
    );

    const flexible = await makeAssignment(
      companyA,
      { status: 'ongoing', startDate: '2026-08-17', workingDays: 'flexible' },
      'Flexible History',
    );
    await fixtures.attendance(flexible.assignmentId, '2026-08-18');
    const flexibleHistory = await request(env.app.getHttpServer())
      .get(`/employer/internships/${flexible.assignmentId}/attendance`)
      .set(auth(companyA.token))
      .expect(200);
    checks.flexibleActualOnly = flexibleHistory.body.history.length === 1;

    const foreign = await makeAssignment(companyB, { status: 'ongoing' });
    await request(env.app.getHttpServer())
      .get(`/employer/internships/${foreign.assignmentId}/attendance`)
      .set(auth(companyA.token))
      .expect(404);
    expect(checks).toEqual(
      Object.fromEntries(Object.keys(checks).map((key) => [key, true])),
    );
  });
});

describe('manage internship APIs', () => {
  const makeInternship = async (
    status: 'pending' | 'ongoing' | 'completed' | 'cancelled' | 'withdrawn',
    options: Parameters<EmployerFixtureFactory['assignment']>[1] = {},
    company = companyA,
    title = `${status} Job`,
    label = status,
  ) => {
    const referral = await fixtures.referral(company.companyId, {
      title,
      response: 'accepted',
      studentResponse: 'accepted',
      studentLabel: label,
    });
    const assignmentId = await fixtures.assignment(referral.referralId, {
      status,
      startDate: '2026-08-01',
      ...options,
    });
    return { ...referral, assignmentId };
  };

  test('E2E-INT-001..004 summary derives ongoing/awaiting/completed from recomputed own-company hours', async () => {
    await makeInternship(
      'ongoing',
      { requiredHours: 16 },
      companyA,
      'Below Hours',
    );
    const awaiting = await makeInternship(
      'ongoing',
      { requiredHours: 8 },
      companyA,
      'Awaiting',
    );
    await fixtures.attendance(
      awaiting.assignmentId,
      '2026-08-17',
      '08:00',
      '17:00',
      1,
    );
    await makeInternship('completed', {
      requiredHours: 8,
      endDate: '2026-08-20',
    });
    await makeInternship('ongoing', { requiredHours: 8 }, companyB, 'Foreign');
    const { body } = await request(env.app.getHttpServer())
      .get('/employer/internships/summary')
      .set(auth(companyA.token))
      .expect(200);
    expect(body).toEqual({
      totalInterns: 3,
      ongoingInterns: 1,
      completedInterns: 1,
      awaitingCompletionInterns: 1,
    });
  });

  test('E2E-INT-005..016 list scopes, maps/filter statuses, searches, paginates, and clamps remaining hours', async () => {
    const pending = await makeInternship(
      'pending',
      {},
      companyA,
      'Pending Search',
      'Penelope',
    );
    const ongoing = await makeInternship(
      'ongoing',
      { requiredHours: 16 },
      companyA,
      'Ongoing Search',
    );
    const awaiting = await makeInternship(
      'ongoing',
      { requiredHours: 8 },
      companyA,
      'Awaiting Search',
      'Awaiter',
    );
    await fixtures.attendance(
      awaiting.assignmentId,
      '2026-08-17',
      '08:00',
      '18:00',
    );
    await makeInternship('completed', { endDate: '2026-08-20' });
    await makeInternship('cancelled', {
      terminalChangedAt: '2026-08-20T10:00:00+08:00',
    });
    await makeInternship('withdrawn', {
      terminalChangedAt: '2026-08-20T10:00:00+08:00',
    });
    await makeInternship('ongoing', {}, companyB, 'Foreign');
    const all = await request(env.app.getHttpServer())
      .get('/employer/internships?page=1&limit=20')
      .set(auth(companyA.token))
      .expect(200);
    expect(all.body.meta).toMatchObject({ total: 6, page: 1, limit: 20 });
    expect(
      all.body.data.find(
        (x: any) => x.internshipAssignmentId === awaiting.assignmentId,
      ),
    ).toMatchObject({
      displayStatus: 'Awaiting Completion',
      remainingHours: 0,
    });
    for (const status of [
      'pending',
      'ongoing',
      'awaiting_completion',
      'completed',
      'cancelled',
      'withdrawn',
    ]) {
      const filtered = await request(env.app.getHttpServer())
        .get(`/employer/internships?status=${status}`)
        .set(auth(companyA.token))
        .expect(200);
      expect(filtered.body.meta.total).toBe(1);
    }
    const byStudent = await request(env.app.getHttpServer())
      .get('/employer/internships?search=Penelope')
      .set(auth(companyA.token))
      .expect(200);
    expect(byStudent.body.data[0].internshipAssignmentId).toBe(
      pending.assignmentId,
    );
    const byTitle = await request(env.app.getHttpServer())
      .get('/employer/internships?search=Ongoing')
      .set(auth(companyA.token))
      .expect(200);
    expect(byTitle.body.data[0].internshipAssignmentId).toBe(
      ongoing.assignmentId,
    );
  });

  test('E2E-INT-017..024 detail derives nested fields and action flags for every state with scoping', async () => {
    const pending = await makeInternship('pending', {}, companyA, 'Nested Job');
    const ongoing = await makeInternship('ongoing', { requiredHours: 16 });
    const awaiting = await makeInternship('ongoing', { requiredHours: 8 });
    await fixtures.attendance(awaiting.assignmentId, '2026-08-17');
    const completed = await makeInternship('completed', {
      endDate: '2026-08-20',
    });
    const cancelled = await makeInternship('cancelled');
    const withdrawn = await makeInternship('withdrawn');
    const expected: Array<[number, Record<string, boolean>]> = [
      [
        pending.assignmentId,
        {
          canEdit: true,
          canCancel: true,
          canComplete: false,
          canDelete: false,
        },
      ],
      [
        ongoing.assignmentId,
        {
          canEdit: false,
          canCancel: true,
          canComplete: false,
          canDelete: false,
        },
      ],
      [
        awaiting.assignmentId,
        {
          canEdit: false,
          canCancel: true,
          canComplete: true,
          canDelete: false,
        },
      ],
      [
        completed.assignmentId,
        {
          canEdit: false,
          canCancel: false,
          canComplete: false,
          canDelete: true,
        },
      ],
      [
        cancelled.assignmentId,
        {
          canEdit: false,
          canCancel: false,
          canComplete: false,
          canDelete: true,
        },
      ],
      [
        withdrawn.assignmentId,
        {
          canEdit: false,
          canCancel: false,
          canComplete: false,
          canDelete: true,
        },
      ],
    ];
    for (const [id, flags] of expected) {
      const detail = await request(env.app.getHttpServer())
        .get(`/employer/internships/${id}`)
        .set(auth(companyA.token))
        .expect(200);
      expect(detail.body).toHaveProperty('intern.studentId');
      expect(detail.body).toHaveProperty('assignment.companyName');
      expect(detail.body).toHaveProperty('assignment.jobTitle');
      expect(detail.body.status).toMatchObject(flags);
    }
    const foreign = await makeInternship('ongoing', {}, companyB);
    await request(env.app.getHttpServer())
      .get(`/employer/internships/${foreign.assignmentId}`)
      .set(auth(companyA.token))
      .expect(404);
  });

  test('E2E-INT-025 pending partial edit persists while retaining untouched values', async () => {
    const pending = await makeInternship('pending', {
      startShift: '08:00',
      endShift: '17:00',
      expectedEndDate: '2026-09-01',
    });
    const edited = await request(env.app.getHttpServer())
      .patch(`/employer/internships/${pending.assignmentId}`)
      .set(auth(companyA.token))
      .send({ requiredHours: 120 })
      .expect(200);
    expect(edited.body.assignment).toMatchObject({
      requiredHours: 120,
      startShift: '08:00:00',
    });
  });

  test('E2E-INT-026..033 merged validation and terminal/ongoing/cross-company edit restrictions', async () => {
    const pending = await makeInternship('pending', {
      startShift: '08:00',
      endShift: '17:00',
      expectedEndDate: '2026-09-01',
    });
    for (const body of [
      { startShift: '18:00' },
      { startDate: '2026-10-01' },
      { workingDays: 'flexible' },
      { companyName: 'Spoof' },
    ]) {
      await request(env.app.getHttpServer())
        .patch(`/employer/internships/${pending.assignmentId}`)
        .set(auth(companyA.token))
        .send(body)
        .expect(400);
    }
    for (const status of [
      'ongoing',
      'completed',
      'cancelled',
      'withdrawn',
    ] as const) {
      const item = await makeInternship(status);
      await request(env.app.getHttpServer())
        .patch(`/employer/internships/${item.assignmentId}`)
        .set(auth(companyA.token))
        .send({ requiredHours: 100 })
        .expect(409);
    }
    const foreign = await makeInternship('pending', {}, companyB);
    await request(env.app.getHttpServer())
      .patch(`/employer/internships/${foreign.assignmentId}`)
      .set(auth(companyA.token))
      .send({ requiredHours: 100 })
      .expect(404);
  });

  test('E2E-INT-034..040 cancel handles pending/ongoing, rejects terminal states, records actor, and scopes', async () => {
    for (const status of ['pending', 'ongoing'] as const) {
      const item = await makeInternship(status);
      const cancelled = await request(env.app.getHttpServer())
        .patch(`/employer/internships/${item.assignmentId}/cancel`)
        .set(auth(companyA.token))
        .expect(200);
      expect(cancelled.body.status.assignmentStatus).toBe('cancelled');
      const history = await db.query(
        `SELECT changed_by_user_account_id FROM public.internship_assignment_status_history WHERE internship_assignment_id=$1 AND new_assignment_status='cancelled' ORDER BY changed_at DESC LIMIT 1`,
        [item.assignmentId],
      );
      expect(Number(history[0].changed_by_user_account_id)).toBe(
        companyA.accountId,
      );
    }
    for (const status of ['completed', 'withdrawn', 'cancelled'] as const) {
      const item = await makeInternship(status);
      await request(env.app.getHttpServer())
        .patch(`/employer/internships/${item.assignmentId}/cancel`)
        .set(auth(companyA.token))
        .expect(409);
    }
    const foreign = await makeInternship('ongoing', {}, companyB);
    await request(env.app.getHttpServer())
      .patch(`/employer/internships/${foreign.assignmentId}/cancel`)
      .set(auth(companyA.token))
      .expect(404);
  });

  test('E2E-INT-041..048 complete uses recomputed hours, includes exact/overtime, sets Manila end date/actor, and rejects invalid states/scoping', async () => {
    for (const timeOut of ['17:00', '18:00']) {
      const item = await makeInternship('ongoing', { requiredHours: 8 });
      await fixtures.attendance(
        item.assignmentId,
        '2026-08-17',
        '08:00',
        timeOut,
        0,
      );
      const completed = await request(env.app.getHttpServer())
        .patch(`/employer/internships/${item.assignmentId}/complete`)
        .set(auth(companyA.token))
        .expect(200);
      expect(completed.body.status.assignmentStatus).toBe('completed');
      const endDate = await db.query(
        'SELECT end_date::text AS end_date FROM public.internship_assignment WHERE internship_assignment_id=$1',
        [item.assignmentId],
      );
      expect(endDate[0].end_date).toBe(todayManila());
      const history = await db.query(
        `SELECT changed_by_user_account_id FROM public.internship_assignment_status_history WHERE internship_assignment_id=$1 AND new_assignment_status='completed'`,
        [item.assignmentId],
      );
      expect(Number(history[0].changed_by_user_account_id)).toBe(
        companyA.accountId,
      );
    }
    const insufficient = await makeInternship('ongoing', { requiredHours: 9 });
    await fixtures.attendance(insufficient.assignmentId, '2026-08-17');
    await request(env.app.getHttpServer())
      .patch(`/employer/internships/${insufficient.assignmentId}/complete`)
      .set(auth(companyA.token))
      .expect(409);
    for (const status of [
      'pending',
      'completed',
      'cancelled',
      'withdrawn',
    ] as const) {
      const item = await makeInternship(status);
      await request(env.app.getHttpServer())
        .patch(`/employer/internships/${item.assignmentId}/complete`)
        .set(auth(companyA.token))
        .expect(409);
    }
    const foreign = await makeInternship(
      'ongoing',
      { requiredHours: 1 },
      companyB,
    );
    await request(env.app.getHttpServer())
      .patch(`/employer/internships/${foreign.assignmentId}/complete`)
      .set(auth(companyA.token))
      .expect(404);
  });

  test('E2E-INT-049..055 delete returns DB-EMP-003 only for terminal own rows and never deletes', async () => {
    for (const status of ['completed', 'cancelled', 'withdrawn'] as const) {
      const item = await makeInternship(status);
      const blocked = await request(env.app.getHttpServer())
        .delete(`/employer/internships/${item.assignmentId}`)
        .set(auth(companyA.token))
        .expect(503);
      expect(blocked.body).toMatchObject({
        code: 'DB_MIGRATION_PENDING',
        dependency: 'DB-EMP-003',
      });
      expect(
        Number(
          (
            await db.query(
              'SELECT count(*) AS n FROM public.internship_assignment WHERE internship_assignment_id=$1',
              [item.assignmentId],
            )
          )[0].n,
        ),
      ).toBe(1);
    }
    for (const status of ['pending', 'ongoing'] as const) {
      const item = await makeInternship(status);
      await request(env.app.getHttpServer())
        .delete(`/employer/internships/${item.assignmentId}`)
        .set(auth(companyA.token))
        .expect(409);
    }
    const foreign = await makeInternship('completed', {}, companyB);
    await request(env.app.getHttpServer())
      .delete(`/employer/internships/${foreign.assignmentId}`)
      .set(auth(companyA.token))
      .expect(404);
  });
});

describe('scheduler integration and cross-API workflow', () => {
  const acceptedReferral = async (company = companyA, title = 'Workflow Job') =>
    fixtures.referral(company.companyId, {
      title,
      response: 'accepted',
      studentResponse: 'accepted',
    });

  test('E2E-SCHED-001..004 transitions only due pending assignments and records a null system actor', async () => {
    const dueRef = await acceptedReferral();
    const futureRef = await acceptedReferral(companyA, 'Future Job');
    const ongoingRef = await acceptedReferral(companyA, 'Already Ongoing');
    const due = await fixtures.assignment(dueRef.referralId, {
      startDate: '2026-08-01',
    });
    const future = await fixtures.assignment(futureRef.referralId, {
      startDate: '2099-01-01',
    });
    const ongoing = await fixtures.assignment(ongoingRef.referralId, {
      status: 'completed',
      startDate: '2026-08-01',
      endDate: '2026-08-20',
    });
    expect(
      (
        await db.query(
          'SELECT assignment_status FROM public.internship_assignment WHERE internship_assignment_id=$1',
          [due],
        )
      )[0].assignment_status,
    ).toBe('pending');
    const duePreflight = await db.query(
      `SELECT internship_assignment_id FROM public.internship_assignment WHERE assignment_status='pending' AND start_date <= $1::date`,
      [todayManila()],
    );
    expect(
      duePreflight.map((row: any) => Number(row.internship_assignment_id)),
    ).toContain(due);
    const scheduler = env.app.get(AssignmentStartScheduler);
    const schedulerErrors: unknown[][] = [];
    jest
      .spyOn((scheduler as any).logger, 'error')
      .mockImplementation((...args: unknown[]) => schedulerErrors.push(args));
    await expect(scheduler.transitionDueAssignments()).resolves.toBe(1);
    expect(schedulerErrors).toEqual([]);
    const rows = await db.query(
      'SELECT internship_assignment_id,assignment_status FROM public.internship_assignment ORDER BY internship_assignment_id',
    );
    expect(
      rows.find((x: any) => Number(x.internship_assignment_id) === due)
        .assignment_status,
    ).toBe('ongoing');
    expect(
      rows.find((x: any) => Number(x.internship_assignment_id) === future)
        .assignment_status,
    ).toBe('pending');
    expect(
      rows.find((x: any) => Number(x.internship_assignment_id) === ongoing)
        .assignment_status,
    ).toBe('completed');
    const history = await db.query(
      `SELECT changed_by_user_account_id FROM public.internship_assignment_status_history WHERE internship_assignment_id=$1 AND new_assignment_status='ongoing'`,
      [due],
    );
    expect(history[0].changed_by_user_account_id).toBeNull();
  });

  test('E2E-SCHED-005 startup catch-up calls the same transition behavior', async () => {
    const referral = await acceptedReferral();
    const due = await fixtures.assignment(referral.referralId, {
      startDate: '2026-08-01',
    });
    const scheduler = env.app.get(AssignmentStartScheduler);
    await scheduler.onModuleInit();
    expect(
      (
        await db.query(
          'SELECT assignment_status FROM public.internship_assignment WHERE internship_assignment_id=$1',
          [due],
        )
      )[0].assignment_status,
    ).toBe('ongoing');
  });

  test('E2E-WORKFLOW-001 referred applicant reaches completed internship through real employer HTTP endpoints', async () => {
    const referral = await fixtures.referral(companyA.companyId, {
      title: 'End-to-End Job',
    });
    await request(env.app.getHttpServer())
      .patch(`/employer/referrals/${referral.referralId}/accept`)
      .set(auth(companyA.token))
      .expect(200);
    await db.query(
      `UPDATE public.application SET student_response='accepted', student_responded_at=CURRENT_TIMESTAMP WHERE application_id=$1`,
      [referral.applicationId],
    );
    const created = await request(env.app.getHttpServer())
      .post(`/employer/referrals/${referral.referralId}/internship-assignment`)
      .set(auth(companyA.token))
      .send({
        workingDays: 'weekdays',
        requiredHours: 8,
        startDate: '2026-08-01',
        startShift: '08:00',
        endShift: '17:00',
      })
      .expect(201);
    const assignmentId = created.body.assignment.internshipAssignmentId;
    await env.app.get(AssignmentStartScheduler).transitionDueAssignments();
    await fixtures.attendance(assignmentId, '2026-08-17', '08:00', '17:00');
    const completed = await request(env.app.getHttpServer())
      .patch(`/employer/internships/${assignmentId}/complete`)
      .set(auth(companyA.token))
      .expect(200);
    expect(completed.body.status).toMatchObject({
      assignmentStatus: 'completed',
      canDelete: true,
    });
    const history = await db.query(
      `SELECT new_assignment_status,changed_by_user_account_id FROM public.internship_assignment_status_history WHERE internship_assignment_id=$1 ORDER BY internship_assignment_status_history_id`,
      [assignmentId],
    );
    expect(history.map((x: any) => x.new_assignment_status)).toEqual([
      'ongoing',
      'completed',
    ]);
    expect(history[0].changed_by_user_account_id).toBeNull();
    expect(Number(history[1].changed_by_user_account_id)).toBe(
      companyA.accountId,
    );
  });
});
