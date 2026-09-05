/* eslint-disable @typescript-eslint/require-await */
import { ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { DataSource, QueryRunner } from 'typeorm';
import { AssignmentRemarkDto, CreateAssignmentDto } from '../dto';
import { EmployerInternshipService } from './employer-internship.service';
import type { EmployerCompanyResolver } from './company-resolver.service';
import { currentManilaDate } from '../utils/time.utils';

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

    const sql = query.mock.calls
      .map(([statement]) => String(statement))
      .join('\n');
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
          workingDays: [1, 2, 3, 4, 5],
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
      workingDays: [1, 2, 3, 4, 5],
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

  it.each([
    [[], 'empty'],
    [[1, 1], 'duplicate'],
    [[-1, 1], 'below range'],
    [[1, 7], 'above range'],
  ])('rejects %s working-day selections (%s)', async (workingDays) => {
    const dto = plainToInstance(CreateAssignmentDto, {
      workingDays,
      requiredHours: 200,
      startDate: '2099-09-01',
      startShift: '08:00',
      endShift: '17:00',
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('keeps Company duration input to whole hours', async () => {
    const dto = plainToInstance(CreateAssignmentDto, {
      workingDays: [1, 3, 4, 6],
      requiredHours: 200.5,
      startDate: '2099-09-01',
      startShift: '08:00',
      endShift: '17:00',
    });
    expect((await validate(dto)).map((error) => error.property)).toContain(
      'requiredHours',
    );
  });

  it('starts a Manila-today assignment in the creation transaction', async () => {
    const assignment = {
      internship_assignment_id: 99,
      assignment_status: 'ongoing',
      required_minutes: 12_000,
      working_days: [1, 3, 4, 6],
      start_date: currentManilaDate(),
      expected_end_date: null,
      end_date: null,
      ended_at: null,
      start_shift: '08:00:00',
      end_shift: '17:00:00',
      student_id: 1,
      student_full_name: 'Same Day Student',
      job_title: 'Developer',
      company_name: 'Test Company',
    };
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('set_config')) return [];
      if (sql.includes('SELECT r.referral_id')) {
        return [
          {
            referral_id: 2,
            referral_status: 'closed',
            application_status: 'closed',
            company_response: 'accepted',
            student_response: 'accepted',
          },
        ];
      }
      if (sql.includes('WHERE referral_id = $1')) return [];
      if (sql.includes('INSERT INTO public.internship_assignment')) {
        return [{ internship_assignment_id: 99 }];
      }
      if (sql.includes('SELECT ia.*')) return [assignment];
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
    const dataSource = {
      query,
      createQueryRunner: jest.fn(() => runner),
    } as unknown as DataSource;
    const service = new EmployerInternshipService(dataSource, resolver);

    await service.createAssignment(50, 2, {
      workingDays: [1, 3, 4, 6],
      requiredHours: 200,
      startDate: currentManilaDate(),
      startShift: '08:00',
      endShift: '17:00',
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SET assignment_status = 'ongoing'"),
      [99],
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
      working_days: [1, 2, 3, 4, 5],
      required_minutes: 24_000,
    });
    const service = new EmployerInternshipService(dataSource, resolver);
    await expect(
      service.update(50, 8, { requiredHours: 450 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns the intern profile and academic fields needed by Company details', async () => {
    const { dataSource, query } = makeTransactionDataSource({
      internship_assignment_id: 8,
      assignment_status: 'ongoing',
      start_date: '2026-09-01',
      expected_end_date: '2026-09-30',
      end_date: null,
      ended_at: null,
      start_shift: '08:00:00',
      end_shift: '17:00:00',
      working_days: [1, 2, 3, 4, 5],
      required_minutes: 24_000,
      student_id: 1,
      student_full_name: 'Intern Example',
      student_contact_email: 'intern@example.com',
      student_contact_number: '09171234567',
      student_address: 'Batasan Hills, Quezon City',
      student_photo_file_path: 'uploads/students/intern.png',
      student_profile_updated_at: '2026-08-20T00:00:00.000Z',
      school_name: 'Quezon City University',
      year_level: 'fourth_year_college',
      strand_program: 'BS Information Technology',
      job_title: 'Developer Intern',
      company_name: 'Test Company',
    });
    const service = new EmployerInternshipService(dataSource, resolver);

    const result = await service.getById(50, 8);

    expect(result.intern).toMatchObject({
      studentFullName: 'Intern Example',
      studentContactEmail: 'intern@example.com',
      studentContactNumber: '09171234567',
      studentAddress: 'Batasan Hills, Quezon City',
      studentPhotoFilePath: 'uploads/students/intern.png',
      schoolName: 'Quezon City University',
      yearLevel: 'fourth_year_college',
      strandProgram: 'BS Information Technology',
    });
    const sql = query.mock.calls.map(([value]) => String(value)).join('\n');
    expect(sql).toContain('s.contact_email AS student_contact_email');
    expect(sql).toContain(
      'sai.school_name, sai.year_level, sai.strand_program',
    );
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
      working_days: [1, 2, 3, 4, 5],
      required_minutes: 24_000,
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
      [
        8,
        [1, 2, 3, 4, 5],
        27_000,
        '2099-09-01',
        '2099-09-30',
        '08:00',
        '17:00',
      ],
    );
  });

  it('requires sufficient recomputed rendered hours before completion', async () => {
    const { dataSource } = makeTransactionDataSource({
      internship_assignment_id: 8,
      assignment_status: 'ongoing',
      start_shift: '08:00:00',
      end_shift: '17:00:00',
      required_minutes: 24_000,
    });
    const service = new EmployerInternshipService(dataSource, resolver);
    await expect(
      service.complete(50, 8, { remark: 'Strong performance.' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('completes an eligible ongoing assignment with remark and operational end', async () => {
    let assignmentStatus = 'ongoing';
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('set_config')) return [];
      if (sql.includes("SET assignment_status = 'complete_company'")) {
        assignmentStatus = 'complete_company';
        return [];
      }
      if (sql.includes('SELECT ia.*')) {
        return [
          {
            internship_assignment_id: 8,
            assignment_status: assignmentStatus,
            required_minutes: 600,
            working_days: [1, 2, 3, 4, 5],
            start_date: '2026-08-01',
            expected_end_date: null,
            end_date: assignmentStatus === 'ongoing' ? null : '2026-09-04',
            ended_at: assignmentStatus === 'ongoing' ? null : new Date(),
            start_shift: '08:00:00',
            end_shift: '17:00:00',
            student_id: 1,
            student_full_name: 'Eligible Student',
            strand_program: 'STEM',
            job_title: 'Developer',
            company_name: 'Test Company',
            company_completion_remark: 'Excellent work.',
          },
        ];
      }
      if (sql.includes('attendance_record')) {
        return [{ internship_assignment_id: 8, rendered_minutes: 600 }];
      }
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
    const service = new EmployerInternshipService(
      {
        query,
        createQueryRunner: jest.fn(() => runner),
      } as unknown as DataSource,
      resolver,
    );

    const result = await service.complete(50, 8, {
      remark: '  Excellent work.  ',
    });

    expect(result.status.assignmentStatus).toBe('complete_company');
    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(
        /assignment_status = 'complete_company'[\s\S]*company_completion_remark = \$2[\s\S]*ended_at = CURRENT_TIMESTAMP[\s\S]*end_date/,
      ),
      [8, 'Excellent work.'],
    );
  });

  it('cancels only through the scoped lifecycle update and preserves the reason', async () => {
    const { dataSource, query } = makeTransactionDataSource({
      internship_assignment_id: 8,
      assignment_status: 'ongoing',
      required_minutes: 600,
      working_days: [1, 2, 3, 4, 5],
      start_date: '2026-08-01',
      expected_end_date: null,
      end_date: null,
      ended_at: null,
      start_shift: '08:00:00',
      end_shift: '17:00:00',
      student_id: 1,
      student_full_name: 'Cancelled Student',
      strand_program: 'STEM',
      job_title: 'Developer',
      company_name: 'Test Company',
    });
    const service = new EmployerInternshipService(dataSource, resolver);

    await service.cancel(50, 8, { remark: '  Placement ended early.  ' });

    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(
        /assignment_status = 'cancelled'[\s\S]*company_cancellation_remark = \$2[\s\S]*ended_at = CURRENT_TIMESTAMP[\s\S]*end_date/,
      ),
      [8, 'Placement ended early.'],
    );
  });

  it('rejects blank and whitespace-only Company transition remarks', async () => {
    for (const remark of ['', '   ']) {
      const dto = plainToInstance(AssignmentRemarkDto, { remark });
      expect((await validate(dto)).map((error) => error.property)).toContain(
        'remark',
      );
    }
  });

  it('calculates mutually exclusive Manage Internship summary cards', async () => {
    const assignments = [
      {
        internship_assignment_id: 1,
        assignment_status: 'pending',
        required_minutes: 600,
        student_id: 1,
        student_full_name: 'Pending Student',
        strand_program: 'STEM',
        job_title: 'Developer',
      },
      {
        internship_assignment_id: 2,
        assignment_status: 'ongoing',
        required_minutes: 600,
        student_id: 2,
        student_full_name: 'Ongoing Student',
        strand_program: 'ABM',
        job_title: 'Designer',
      },
      {
        internship_assignment_id: 3,
        assignment_status: 'ongoing',
        required_minutes: 600,
        student_id: 3,
        student_full_name: 'Awaiting Student',
        strand_program: 'ICT',
        job_title: 'Analyst',
      },
    ];
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT ia.*')) return assignments;
      if (sql.includes('attendance_record')) {
        return [
          { internship_assignment_id: 2, rendered_minutes: 300 },
          { internship_assignment_id: 3, rendered_minutes: 600 },
        ];
      }
      return [];
    });
    const service = new EmployerInternshipService(
      { query } as unknown as DataSource,
      resolver,
    );

    await expect(service.summary(50)).resolves.toEqual({
      activeInternships: 3,
      pendingInternships: 1,
      ongoingInternships: 1,
      awaitingCompletion: 1,
    });
    expect(String(query.mock.calls[0][0])).toContain(
      "ia.assignment_status IN ('pending', 'ongoing')",
    );
  });

  it('keeps all seven visible statuses in Company history and omits Student review fields', async () => {
    const statuses = [
      'pending',
      'ongoing',
      'complete_company',
      'complete_student',
      'withdrawn',
      'cancelled',
      'finalized',
    ];
    const assignments = statuses.map((assignment_status, index) => ({
      internship_assignment_id: index + 1,
      assignment_status,
      required_minutes: 600,
      student_id: index + 1,
      student_full_name: `Student ${index + 1}`,
      strand_program: 'STEM',
      job_title: 'Developer',
    }));
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT ia.*')) return assignments;
      return [];
    });
    const service = new EmployerInternshipService(
      { query } as unknown as DataSource,
      resolver,
    );

    await expect(service.historySummary(50)).resolves.toEqual({
      totalInternships: 7,
      activeInternships: 2,
      closedInternships: 5,
    });
    const result = await service.history(50, { page: 1, limit: 10 });
    expect(result.data.map((row) => row.assignmentStatus)).toEqual(statuses);
    const sql = query.mock.calls.map(([value]) => String(value)).join('\n');
    expect(sql).toContain('iav.employer_hidden_at IS NOT NULL');
    expect(sql).not.toContain('internship_feedback');
    expect(sql).not.toContain('review_rating');
  });
});
