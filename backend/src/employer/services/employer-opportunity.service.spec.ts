/* eslint-disable @typescript-eslint/require-await */
import { ConflictException } from '@nestjs/common';
import type { DataSource, QueryRunner } from 'typeorm';
import { EmployerOpportunityService } from './employer-opportunity.service';
import type { EmployerCompanyResolver } from './company-resolver.service';

function setup(status: string, deadlineDate = '2099-01-01') {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('set_config')) return [];
    if (sql.includes('SELECT o.*'))
      return [
        {
          opportunity_id: 7,
          company_id: 3,
          title: 'Intern',
          department: 'IT',
          work_arrangement: 'onsite',
          minimum_required_hours: 400,
          offered_slots: 2,
          allowance: null,
          description: 'Role',
          qualification: null,
          opportunity_status: status,
          deadline_date: deadlineDate,
          total_applicant_count: '0',
        },
      ];
    if (sql.includes('SELECT a.application_id')) return [];
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
    query,
    createQueryRunner: jest.fn(() => runner),
  } as unknown as DataSource;
  const resolver = {
    resolve: jest.fn().mockResolvedValue({ companyId: 3, userAccountId: 30 }),
  } as unknown as EmployerCompanyResolver;
  return {
    service: new EmployerOpportunityService(dataSource, resolver),
    query,
  };
}

describe('EmployerOpportunityService lifecycle', () => {
  it('closes only open opportunities without expiring workflow records', async () => {
    const { service, query } = setup('open');
    await service.close(30, 7);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("opportunity_status = 'closed'"),
      [7],
    );
    expect(
      query.mock.calls.some(([sql]) =>
        String(sql).includes('UPDATE public.application'),
      ),
    ).toBe(false);
    expect(
      query.mock.calls.some(([sql]) =>
        String(sql).includes('UPDATE public.referral'),
      ),
    ).toBe(false);
  });

  it('rejects closing a closed opportunity', async () => {
    await expect(setup('closed').service.close(30, 7)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('reopens a closed opportunity with a non-past Manila deadline', async () => {
    const { service, query } = setup('closed', '2099-01-01');
    await service.reopen(30, 7);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("opportunity_status = 'open'"),
      [7],
    );
  });

  it('rejects reopening when the Manila deadline has passed', async () => {
    await expect(
      setup('closed', '2000-01-01').service.reopen(30, 7),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows delete/archive only from closed', async () => {
    await expect(setup('open').service.archive(30, 7)).rejects.toBeInstanceOf(
      ConflictException,
    );
    const { service, query } = setup('closed');
    await service.archive(30, 7);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("opportunity_status = 'archived'"),
      [7],
    );
  });
});
