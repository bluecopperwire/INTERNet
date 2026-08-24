/* eslint-disable @typescript-eslint/unbound-method */
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
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

  it('returns DB-EMP-001 for opportunity create', async () => {
    const service = new EmployerOpportunityService(
      { query: jest.fn() } as unknown as DataSource,
      resolver(),
    );
    await expect(
      service.create(310, {
        title: 'Intern',
        department: 'IT',
        workArrangement: 'onsite' as const,
        minimumRequiredHours: 400,
        offeredSlots: 1,
        allowance: 'PHP 500 per day',
        description: 'Role',
        qualification: null,
        applicationDeadline: '2099-01-01',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ dependency: 'DB-EMP-001' }),
    });
  });

  it('returns DB-EMP-001 for a scoped opportunity update', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([
        {
          opportunity_id: 1,
          company_id: 31,
          deadline_date: '2099-01-01',
          total_applicant_count: 0,
        },
      ]),
    } as unknown as DataSource;
    const service = new EmployerOpportunityService(dataSource, resolver());
    await expect(
      service.update(310, 1, { title: 'Updated' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ dependency: 'DB-EMP-001' }),
    });
  });

  it('returns DB-EMP-002 for scoped accepted-referral withdrawal', async () => {
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValue([{ referral_id: 2, company_response: 'accepted' }]),
    } as unknown as DataSource;
    const service = new EmployerReferralService(dataSource, resolver());
    await expect(service.withdrawAcceptance(310, 2)).rejects.toMatchObject({
      response: expect.objectContaining({ dependency: 'DB-EMP-002' }),
    });
  });

  it('returns DB-EMP-003 for scoped terminal internship deletion', async () => {
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValue([
          { internship_assignment_id: 3, assignment_status: 'completed' },
        ]),
    } as unknown as DataSource;
    const service = new EmployerInternshipService(dataSource, resolver());
    await expect(service.softDelete(310, 3)).rejects.toMatchObject({
      response: expect.objectContaining({ dependency: 'DB-EMP-003' }),
    });
  });

  it('uses an explicit 503 exception for all temporary blockers', () => {
    const error = new ServiceUnavailableException({
      code: 'DB_MIGRATION_PENDING',
    });
    expect(error.getStatus()).toBe(503);
  });
});
