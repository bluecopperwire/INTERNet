/* eslint-disable @typescript-eslint/unbound-method */
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { DataSource, QueryRunner } from 'typeorm';
import { WorkArrangement } from '../dto';
import { EmployerOpportunityService } from './employer-opportunity.service';
import { EmployerReferralService } from './employer-referral.service';
import { EmployerInternshipService } from './employer-internship.service';
import type { EmployerCompanyResolver } from './company-resolver.service';

function resolver(companyId = 31) {
  return {
    resolve: jest.fn().mockResolvedValue({ companyId, userAccountId: 310 }),
  } as unknown as EmployerCompanyResolver;
}

describe('employer scoping and DB migration blockers', () => {
  it('derives company from the authenticated account and scopes opportunity IDs', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([]),
    } as unknown as DataSource;
    const companyResolver = resolver();
    const service = new EmployerOpportunityService(dataSource, companyResolver);

    await expect(service.getById(310, 999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(companyResolver.resolve).toHaveBeenCalledWith(310);
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('o.opportunity_id = $1 AND o.company_id = $2'),
      [999, 31],
    );
  });

  it('returns not found for a referral outside the derived company scope', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([]),
    } as unknown as DataSource;
    const service = new EmployerReferralService(dataSource, resolver());
    await expect(service.getById(310, 777)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('r.referral_id = $1 AND o.company_id = $2'),
      [777, 31],
    );
  });

  it('returns not found for an assignment outside the derived company scope', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([]),
    } as unknown as DataSource;
    const service = new EmployerInternshipService(dataSource, resolver());
    await expect(service.getById(310, 888)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining(
        'ia.internship_assignment_id = $1 AND c.company_id = $2',
      ),
      [888, 31],
    );
  });

  it('creates an opportunity successfully without 503 blocker', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('set_config')) return [];
      if (sql.includes('INSERT INTO public.opportunity'))
        return [{ opportunity_id: 101 }];
      if (sql.includes('SELECT o.*'))
        return [
          {
            opportunity_id: 101,
            company_id: 31,
            title: 'Intern',
            department: 'IT',
            work_arrangement: 'onsite',
            minimum_required_hours: 400,
            offered_slots: 1,
            allowance: 'PHP 500 per day',
            description: 'Role',
            qualification: null,
            application_deadline: '2099-01-01',
            opportunity_status: 'open',
            deadline_date: '2099-01-01',
            total_applicant_count: '0',
          },
        ];
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

    const service = new EmployerOpportunityService(dataSource, resolver());
    const result = await service.create(310, {
      title: 'Intern',
      department: 'IT',
      workArrangement: WorkArrangement.ONSITE,
      minimumRequiredHours: 400,
      offeredSlots: 1,
      allowance: 'PHP 500 per day',
      description: 'Role',
      qualification: null,
      applicationDeadline: '2099-01-01',
    });
    expect(result).toBeDefined();
    expect(result.opportunityId).toBe(101);
  });

  it('updates an opportunity successfully without 503 blocker', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('set_config')) return [];
      if (sql.includes('UPDATE public.opportunity')) return [];
      if (sql.includes('SELECT o.*'))
        return [
          {
            opportunity_id: 1,
            company_id: 31,
            title: 'Updated',
            department: 'IT',
            work_arrangement: 'onsite',
            minimum_required_hours: 400,
            offered_slots: 1,
            allowance: 'PHP 500 per day',
            description: 'Role',
            qualification: null,
            application_deadline: '2099-01-01',
            opportunity_status: 'open',
            deadline_date: '2099-01-01',
            total_applicant_count: '0',
          },
        ];
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

    const service = new EmployerOpportunityService(dataSource, resolver());
    const result = await service.update(310, 1, { title: 'Updated' });
    expect(result).toBeDefined();
    expect(result.title).toBe('Updated');
  });

  it('does not allow the ordinary rejection path to reverse acceptance', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('set_config')) return [];
      if (sql.includes('SELECT r.referral_id'))
        return [
          {
            referral_id: 2,
            company_id: 31,
            company_response: 'accepted',
            student_response: 'pending',
            referral_status: 'under_review',
          },
        ];
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

    const service = new EmployerReferralService(dataSource, resolver());
    await expect(service.reject(310, 2, {
      remark: 'The internship slot was withdrawn.',
    })).rejects.toThrow('Only pending or for_interview referrals can be rejected.');
  });

  it('soft deletes terminal internship without 503 blocker', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('set_config')) return [];
      if (sql.includes('SELECT ia.*'))
        return [
          {
            internship_assignment_id: 3,
            company_id: 31,
            assignment_status: 'completed',
          },
        ];
      if (sql.includes('UPDATE public.internship_assignment')) return [];
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

    const service = new EmployerInternshipService(dataSource, resolver());
    const result = await service.softDelete(310, 3);
    expect(result).toEqual({ deleted: true, internshipAssignmentId: 3 });
  });
});
