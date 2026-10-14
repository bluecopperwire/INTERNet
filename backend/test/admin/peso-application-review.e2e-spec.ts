/* eslint-disable @typescript-eslint/no-unsafe-argument */
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { AdminE2eEnvironment } from './support/admin-e2e-environment';
import {
  AdminFixtureFactory,
  type PesoFixture,
} from './support/fixture-factory';

describe('QC PESO application review endpoint', () => {
  const env = new AdminE2eEnvironment();
  let db: DataSource;
  let fixtures: AdminFixtureFactory;
  let peso: PesoFixture;

  const auth = () => ({ Authorization: `Bearer ${peso.token}` });

  beforeAll(async () => {
    await env.start();
    db = env.dataSource;
  });

  beforeEach(async () => {
    await env.resetDatabase();
    fixtures = new AdminFixtureFactory(db);
    await fixtures.seedReference();
    peso = await fixtures.peso('Reviewer', 'active');
  });

  afterAll(async () => env.stop());

  async function createApplication(): Promise<number> {
    const student = await fixtures.student('Applicant', 'active');
    const company = await fixtures.company('Host', 'active');
    const [opportunity] = await db.query(
      `INSERT INTO public.opportunity
        (company_id, title, department, description, qualification, allowance,
         minimum_required_hours, work_arrangement, offered_slots,
         application_deadline, opportunity_status)
       VALUES ($1, $2, 'Engineering', 'Review endpoint test', 'Qualified', NULL,
         400, 'hybrid', 2, CURRENT_TIMESTAMP + INTERVAL '30 days', 'open')
       RETURNING opportunity_id`,
      [company.companyId, `Review test ${Date.now()} ${Math.random()}`],
    );
    const [application] = await db.query(
      `INSERT INTO public.application (student_id, opportunity_id)
       VALUES ($1, $2) RETURNING application_id`,
      [student.studentId, opportunity.opportunity_id],
    );
    return Number(application.application_id);
  }

  it('keeps detail GET read-only for a submitted application', async () => {
    const applicationId = await createApplication();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { body } = await request(env.app.getHttpServer())
        .get(`/dashboard/peso/applications/${applicationId}`)
        .set(auth())
        .expect(200);
      expect(body.application_status).toBe('submitted');
    }

    const history = await db.query(
      `SELECT 1 FROM public.application_status_history
       WHERE application_id = $1 AND new_application_status = 'under_review'`,
      [applicationId],
    );
    expect(history).toHaveLength(0);
  });

  it('changes submitted to under_review once and is idempotent thereafter', async () => {
    const applicationId = await createApplication();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { body } = await request(env.app.getHttpServer())
        .patch(`/dashboard/peso/applications/${applicationId}/review`)
        .set(auth())
        .expect(200);
      expect(body.application_status).toBe('under_review');
    }

    const history = await db.query(
      `SELECT changed_by_user_account_id
       FROM public.application_status_history
       WHERE application_id = $1 AND new_application_status = 'under_review'`,
      [applicationId],
    );
    expect(history).toHaveLength(1);
    expect(Number(history[0].changed_by_user_account_id)).toBe(peso.accountId);
  });

  it.each([
    'approved_for_referral',
    'rejected_for_referral',
    'closed',
    'withdrawn',
    'expired',
  ] as const)(
    'keeps %s viewable while rejecting an invalid review transition',
    async (status) => {
      const applicationId = await createApplication();
      await request(env.app.getHttpServer())
        .patch(`/dashboard/peso/applications/${applicationId}/review`)
        .set(auth())
        .expect(200);

      if (status === 'approved_for_referral' || status === 'closed') {
        await db.query(
          `UPDATE public.application SET application_status = 'approved_for_referral'
         WHERE application_id = $1`,
          [applicationId],
        );
      }
      if (status === 'closed') {
        await db.query(
          `UPDATE public.application SET application_status = 'closed'
         WHERE application_id = $1`,
          [applicationId],
        );
      } else if (status === 'rejected_for_referral') {
        await db.query(
          `UPDATE public.application
         SET application_status = 'rejected_for_referral', remark = 'Not qualified'
         WHERE application_id = $1`,
          [applicationId],
        );
      } else if (!['approved_for_referral', 'closed'].includes(status)) {
        await db.query(
          `UPDATE public.application SET application_status = $2
         WHERE application_id = $1`,
          [applicationId, status],
        );
      }

      const { body } = await request(env.app.getHttpServer())
        .get(`/dashboard/peso/applications/${applicationId}`)
        .set(auth())
        .expect(200);
      expect(body.application_status).toBe(status);

      await request(env.app.getHttpServer())
        .patch(`/dashboard/peso/applications/${applicationId}/review`)
        .set(auth())
        .expect(409);
    },
  );
});
