/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method */
import { ConflictException } from '@nestjs/common';
import type { DataSource, QueryRunner } from 'typeorm';
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
      jest.spyOn(service, 'getById').mockResolvedValue({ accepted: true });

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

  it('schedules as under_review + for_interview and upserts one interview', async () => {
    const { dataSource, query } = transactionMocks({
      referral_id: 4,
      referral_status: 'sent',
      company_response: 'pending',
    });
    const service = new EmployerReferralService(dataSource, resolver);
    jest.spyOn(service, 'getById').mockResolvedValue({ interview: {} });

    await service.scheduleInterview(70, 4, {
      interviewDate: '2099-01-02',
      interviewTime: '09:30',
      interviewMode: 'online' as const,
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
    jest.spyOn(service, 'getById').mockResolvedValue({ rejected: true });

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
        interviewMode: 'physical' as const,
        physicalLocation: 'Office',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(runner.rollbackTransaction).toHaveBeenCalled();
  });
});
