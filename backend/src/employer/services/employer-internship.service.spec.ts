/* eslint-disable @typescript-eslint/require-await */
import { ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { DataSource, QueryRunner } from 'typeorm';
import { CreateAssignmentDto, EmployerWorkingDays } from '../dto';
import { EmployerInternshipService } from './employer-internship.service';
import type { EmployerCompanyResolver } from './company-resolver.service';

function makeTransactionDataSource(row: Record<string, unknown>) {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('set_config')) return [];
    if (sql.includes('SELECT r.referral_id')) return [row];
    if (sql.includes('SELECT ia.*')) return [row];
    if (sql.includes('attendance_record')) return [];
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
  return {
    query,
    dataSource: {
      query,
      createQueryRunner: jest.fn(() => runner),
    } as unknown as DataSource,
  };
}

const resolver = {
  resolve: jest.fn().mockResolvedValue({ companyId: 5, userAccountId: 50 }),
} as unknown as EmployerCompanyResolver;

describe('EmployerInternshipService', () => {
  it('limits Create Assignment candidates to the accepted-offer workflow', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '0' }])
      .mockResolvedValueOnce([]);
    const service = new EmployerInternshipService(
      { query } as unknown as DataSource,
      resolver,
    );

    await service.listCandidates(50, { page: 1, limit: 10 });

    const sql = query.mock.calls.map(([statement]) => String(statement)).join('\n');
    expect(sql).toContain("r.company_response = 'accepted'");
    expect(sql).toContain("a.student_response = 'accepted'");
    expect(sql).toContain("a.application_status = 'closed'");
    expect(sql).toContain("r.referral_status = 'closed'");
    expect(sql).toContain('existing_assignment.referral_id = r.referral_id');
    expect(sql).toContain('rv.employer_hidden_at IS NOT NULL');
  });

  it.each([
    ['pending', 'accepted'],
    ['accepted', 'pending'],
    ['accepted', 'declined'],
  ])(
    'requires employer accepted and student accepted (got %s/%s)',
    async (companyResponse, studentResponse) => {
      const { dataSource } = makeTransactionDataSource({
        referral_id: 2,
        referral_status: 'closed',
        application_status: 'closed',
        company_response: companyResponse,
        student_response: studentResponse,
      });
      const service = new EmployerInternshipService(dataSource, resolver);
      await expect(
        service.createAssignment(50, 2, {
          workingDays: EmployerWorkingDays.WEEKDAYS,
          requiredHours: 400,
          startDate: '2026-09-01',
          startShift: '08:00',
          endShift: '17:00',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    },
  );

  it('rejects company/job-title assignment input through whitelist validation', async () => {
    const dto = plainToInstance(CreateAssignmentDto, {
      workingDays: 'weekdays',
      requiredHours: 400,
      startDate: '2026-09-01',
      startShift: '08:00',
      endShift: '17:00',
      companyName: 'Injected Company',
      jobTitle: 'Injected Job',
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['companyName', 'jobTitle']),
    );
  });

  it('allows assignment editing only while pending', async () => {
    const { dataSource } = makeTransactionDataSource({
      internship_assignment_id: 8,
      assignment_status: 'ongoing',
      start_date: '2026-09-01',
      expected_end_date: null,
      start_shift: '08:00:00',
      end_shift: '17:00:00',
      working_days: 'weekdays',
      required_hours: 400,
    });
    const service = new EmployerInternshipService(dataSource, resolver);
    await expect(
      service.update(50, 8, { requiredHours: 450 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('merges native PostgreSQL Date values during a pending partial edit', async () => {
    const { dataSource, query } = makeTransactionDataSource({
      internship_assignment_id: 8,
      assignment_status: 'pending',
      start_date: new Date('2099-08-31T16:00:00.000Z'),
      expected_end_date: new Date('2099-09-29T16:00:00.000Z'),
      end_date: null,
      start_shift: '08:00:00',
      end_shift: '17:00:00',
      working_days: 'weekdays',
      required_hours: 400,
      student_id: 1,
      student_full_name: 'Pending Student',
      job_title: 'Developer',
      company_name: 'Test Company',
    });
    const service = new EmployerInternshipService(dataSource, resolver);

    await expect(
      service.update(50, 8, { requiredHours: 450 }),
    ).resolves.toBeDefined();

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE public.internship_assignment'),
      [8, 'weekdays', 450, '2099-09-01', '2099-09-30', '08:00', '17:00'],
    );
  });

  it('requires sufficient recomputed rendered hours before completion', async () => {
    const { dataSource } = makeTransactionDataSource({
      internship_assignment_id: 8,
      assignment_status: 'ongoing',
      start_shift: '08:00:00',
      end_shift: '17:00:00',
      required_hours: 400,
    });
    const service = new EmployerInternshipService(dataSource, resolver);
    await expect(service.complete(50, 8)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
