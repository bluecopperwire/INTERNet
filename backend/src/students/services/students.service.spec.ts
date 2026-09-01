/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import type { DataSource, QueryRunner, Repository } from 'typeorm';
import type { Student } from '../entities/student.entity';
import type { ProfilePictureStorageService } from '../../storage/profile-picture-storage.service';
import { StudentsService } from './students.service';

type Attempt = {
  application_id: number;
  application_status: string;
  student_response: string;
  company_response: string | null;
};

const completeStudent = {
  studentId: 7,
  firstName: 'Test',
  lastName: 'Student',
  sex: 'female',
  birthDate: new Date('2004-01-01'),
  contactNumber: '09170000000',
  contactEmail: 'student@example.test',
  addressLine: '1 Test Street',
  addressBarangay: 'Test Barangay',
  addressCity: 'Quezon City',
} as unknown as Student;

function applicationService(options: {
  attempts?: Attempt[];
  opportunityStatus?: string;
  deadline?: string;
  insertError?: unknown;
} = {}) {
  const attempts = options.attempts ?? [];
  const topLevelQuery = jest.fn(async (sql: string) => {
    if (sql.includes('student_academic_information')) {
      return [{ school_name: 'Test University', year_level: '4', strand_program: 'BS IT' }];
    }
    if (sql.includes('internship_preference')) {
      return [{ required_hours: 400, available_days: 'weekdays', start_date: '2099-01-01', preferred_company_type: 'private' }];
    }
    if (sql.includes('student_preferred_industry')) return [{ industry_id: 1 }];
    if (sql.includes('student_requirement_submission')) {
      return [
        { requirement_type_name: 'curriculum_vitae_resume' },
        { requirement_type_name: 'proof_of_residency' },
        { requirement_type_name: 'latest_credentials' },
        { requirement_type_name: 'letter_of_intent' },
      ];
    }
    return [];
  });

  const transactionQuery = jest.fn(async (sql: string) => {
    if (sql.includes('set_config') || sql.includes('pg_advisory_xact_lock')) return [];
    if (sql.includes('FROM public.opportunity')) {
      return [{
        opportunity_id: 9,
        title: 'Test Internship',
        opportunity_status: options.opportunityStatus ?? 'open',
        application_deadline: options.deadline ?? '2099-12-31T23:59:59.000Z',
      }];
    }
    if (sql.includes('FROM public.application a')) return attempts;
    if (sql.includes('INSERT INTO public.application')) {
      if (options.insertError) throw options.insertError;
      return [{
        application_id: 101,
        student_id: 7,
        opportunity_id: 9,
        application_status: 'submitted',
        student_response: 'pending',
        submitted_at: '2026-09-01T00:00:00.000Z',
        updated_at: '2026-09-01T00:00:00.000Z',
        remark: null,
      }];
    }
    return [];
  });
  const runner = {
    isTransactionActive: true,
    query: transactionQuery,
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
  } as unknown as QueryRunner;
  const dataSource = {
    query: topLevelQuery,
    createQueryRunner: jest.fn(() => runner),
  } as unknown as DataSource;
  const studentRepo = {
    findOne: jest.fn().mockResolvedValue(completeStudent),
  } as unknown as Repository<Student>;
  const service = new StudentsService(
    studentRepo,
    dataSource,
    {} as ProfilePictureStorageService,
  );
  return { service, runner, transactionQuery, attempts };
}

describe('StudentsService application reapplication', () => {
  const allowedAttempts: Array<[string, Attempt]> = [
    ['withdrawn', { application_id: 1, application_status: 'withdrawn', student_response: 'pending', company_response: null }],
    ['QC rejected', { application_id: 2, application_status: 'rejected_for_referral', student_response: 'pending', company_response: null }],
    ['company rejected', { application_id: 3, application_status: 'closed', student_response: 'pending', company_response: 'rejected' }],
    ['student declined', { application_id: 4, application_status: 'closed', student_response: 'declined', company_response: 'accepted' }],
  ];

  it.each(allowedAttempts)('creates a fresh submitted attempt after %s', async (_label, previous) => {
    const { service, transactionQuery, attempts } = applicationService({ attempts: [previous] });

    await expect(
      service.createStudentApplication(7, { opportunityId: 9 }, { userAccountId: 70 }),
    ).resolves.toMatchObject({
      applicationId: 101,
      applicationStatus: 'submitted',
      studentResponse: 'pending',
    });

    expect(transactionQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.application'),
      [7, 9, null],
    );
    expect(attempts).toEqual([previous]);
    expect(
      transactionQuery.mock.calls.some(([sql]) =>
        /^\s*(UPDATE|DELETE)\b/.test(String(sql)),
      ),
    ).toBe(false);
  });

  it.each(['submitted', 'under_review', 'approved_for_referral'])(
    'blocks a second active attempt while %s exists',
    async (applicationStatus) => {
      const { service, runner } = applicationService({
        attempts: [{ application_id: 5, application_status: applicationStatus, student_response: 'pending', company_response: null }],
      });
      await expect(service.createStudentApplication(7, { opportunityId: 9 }, {})).rejects.toBeInstanceOf(ConflictException);
      expect(runner.rollbackTransaction).toHaveBeenCalled();
    },
  );

  it.each([
    ['expired', { application_id: 6, application_status: 'expired', student_response: 'pending', company_response: null }],
    ['student accepted', { application_id: 7, application_status: 'closed', student_response: 'accepted', company_response: 'accepted' }],
  ] as const)('blocks reapplication after %s', async (_label, previous) => {
    const { service } = applicationService({ attempts: [previous] });
    await expect(service.createStudentApplication(7, { opportunityId: 9 }, {})).rejects.toBeInstanceOf(ConflictException);
  });

  it.each(['closed', 'archived'])('blocks an opportunity that is %s', async (opportunityStatus) => {
    const { service } = applicationService({ opportunityStatus });
    await expect(service.createStudentApplication(7, { opportunityId: 9 }, {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks a passed deadline', async () => {
    const { service } = applicationService({ deadline: '2000-01-01T00:00:00.000Z' });
    await expect(service.createStudentApplication(7, { opportunityId: 9 }, {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('translates the active-only unique index race into a workflow conflict', async () => {
    const { service } = applicationService({
      insertError: { code: '23505', constraint: 'uq_application_active_student_opportunity' },
    });
    await expect(service.createStudentApplication(7, { opportunityId: 9 }, {})).rejects.toThrow(
      'You already have an active application for this opportunity.',
    );
  });
});
