/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method */
import { ConflictException } from '@nestjs/common';
import type { DataSource, QueryRunner } from 'typeorm';
import { InterviewMode, ReferralListView } from '../dto';
import { EmployerReferralService } from './employer-referral.service';
import type { EmployerCompanyResolver } from './company-resolver.service';

function transactionMocks(referral: Record<string, unknown>) {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('set_config')) return [];
    if (sql.includes('SELECT r.referral_id')) return [referral];
    return [];
  });
  const runner = {
    isTransactionActive: true,
    query,
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
  } as unknown as QueryRunner;
  const dataSource = {
    createQueryRunner: jest.fn(() => runner),
  } as unknown as DataSource;
  return { dataSource, runner, query };
}

const resolver = {
  resolve: jest.fn().mockResolvedValue({ companyId: 7, userAccountId: 70 }),
} as unknown as EmployerCompanyResolver;

describe('EmployerReferralService workflows', () => {
  it('keeps all non-hidden lifecycle states in employer referral history', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '2' }])
      .mockResolvedValueOnce([
        {
          referral_id: 10,
          referral_status: 'withdrawn',
          company_response: 'accepted',
          application_id: 20,
          application_status: 'withdrawn',
          student_response: 'pending',
        },
        {
          referral_id: 11,
          referral_status: 'expired',
          company_response: 'pending',
          application_id: 21,
          application_status: 'expired',
          student_response: 'pending',
        },
      ]);
    const service = new EmployerReferralService(
      { query } as unknown as DataSource,
      resolver,
    );

    const result = await service.list(70, { page: 1, limit: 10 });

    expect(result.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ referralId: 10, referralStatus: 'withdrawn' }),
        expect.objectContaining({ referralId: 11, referralStatus: 'expired' }),
      ]),
    );
    const sql = query.mock.calls.map(([statement]) => String(statement)).join('\n');
    expect(sql).not.toContain("r.referral_status IN ('sent', 'under_review')");
    expect(sql).toContain('rv.employer_hidden_at IS NOT NULL');
  });

  it.each(['pending', 'for_interview'])(
    'accepts a %s employer response and keeps the referral under review',
    async (companyResponse) => {
      const { dataSource, query } = transactionMocks({
        referral_id: 4,
        referral_status:
          companyResponse === 'pending' ? 'sent' : 'under_review',
        company_response: companyResponse,
      });
      const service = new EmployerReferralService(dataSource, resolver);
      jest.spyOn(service, 'getById').mockResolvedValue({ accepted: true } as any);

      await expect(service.accept(70, 4)).resolves.toEqual({ accepted: true });

      const statements = query.mock.calls.map(([sql]) => String(sql));
      expect(
        statements.some((sql) =>
          sql.includes("referral_status = 'under_review'"),
        ),
      ).toBe(companyResponse === 'pending');
      expect(
        statements.some((sql) => sql.includes("company_response = 'accepted'")),
      ).toBe(true);
    },
  );

  it('enforces the employer review queue in both count and data queries', async () => {
    const query = jest.fn().mockResolvedValueOnce([{ total: '0' }]).mockResolvedValueOnce([]);
    const service = new EmployerReferralService(
      { query } as unknown as DataSource,
      resolver,
    );

    await service.list(70, {
      page: 1,
      limit: 10,
      view: ReferralListView.REVIEW,
    });

    for (const [sql] of query.mock.calls) {
      expect(String(sql)).toContain("r.referral_status = 'sent'");
      expect(String(sql)).toContain("r.referral_status = 'under_review'");
      expect(String(sql)).toContain("r.company_response IN ('pending', 'for_interview')");
    }
  });

  it('schedules as under_review + for_interview and upserts one interview', async () => {
    const { dataSource, query } = transactionMocks({
      referral_id: 4,
      referral_status: 'sent',
      company_response: 'pending',
    });
    const service = new EmployerReferralService(dataSource, resolver);
    jest.spyOn(service, 'getById').mockResolvedValue({ interview: {} } as any);

    await service.scheduleInterview(70, 4, {
      interviewDate: '2099-01-02',
      interviewTime: '09:30',
      interviewMode: InterviewMode.ONLINE,
      onlineMeetingUrl: 'https://example.com/meeting',
    });

    const statements = query.mock.calls.map(([sql]) => String(sql));
    expect(
      statements.some((sql) =>
        sql.includes("referral_status = 'under_review'"),
      ),
    ).toBe(true);
    expect(
      statements.some((sql) =>
        sql.includes("company_response = 'for_interview'"),
      ),
    ).toBe(true);
    expect(
      statements.some((sql) =>
        sql.includes('ON CONFLICT (referral_id) DO UPDATE'),
      ),
    ).toBe(true);
  });

  it('rejects through the valid under_review intermediate state and closes', async () => {
    const { dataSource, query } = transactionMocks({
      referral_id: 4,
      referral_status: 'sent',
      company_response: 'pending',
    });
    const service = new EmployerReferralService(dataSource, resolver);
    jest.spyOn(service, 'getById').mockResolvedValue({ rejected: true } as any);

    await service.reject(70, 4, { remark: 'Not selected' });

    const statements = query.mock.calls.map(([sql]) => String(sql));
    expect(
      statements.some((sql) =>
        sql.includes("referral_status = 'under_review'"),
      ),
    ).toBe(true);
    expect(
      statements.some(
        (sql) =>
          sql.includes("referral_status = 'closed'") &&
          sql.includes("company_response = 'rejected'"),
      ),
    ).toBe(true);
  });

  it('does not reschedule a terminal employer response', async () => {
    const { dataSource, runner } = transactionMocks({
      referral_id: 4,
      referral_status: 'under_review',
      company_response: 'accepted',
    });
    const service = new EmployerReferralService(dataSource, resolver);

    await expect(
      service.scheduleInterview(70, 4, {
        interviewDate: '2099-01-02',
        interviewTime: '09:30',
        interviewMode: InterviewMode.PHYSICAL,
        physicalLocation: 'Office',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(runner.rollbackTransaction).toHaveBeenCalled();
  });
});
