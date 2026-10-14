import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DataSource, QueryRunner } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { QcInternshipWorkflowService } from './qc-internship-workflow.service';
import { QcAssignmentStatusFilter } from '../dto/peso-dashboard.dto';

describe('QcInternshipWorkflowService Phase 5', () => {
  it('limits finalization to the three eligible states and reads final history from status history', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const service = new QcInternshipWorkflowService({
      query,
    } as unknown as DataSource);
    await service.finalizationList({ page: 1, limit: 10 });
    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain('internship_assignment_status_history');
    expect(sql).toContain("new_assignment_status = 'finalized'");
    expect(sql).toContain('previous_assignment_status');
    expect(sql).toContain('qc_peso_hidden_at');
    expect(sql).toContain('student_photo_file_path');
    expect(sql).toContain('profile_contact_email');
    expect(sql).toContain('sai.school_name');
    expect(sql).toContain('sai.year_level');
    expect(sql).toContain('ua.account_code AS student_account_code');
  });

  it('uses historical ongoing dates, actual ended_at and exact selected-date attendance without writes', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const service = new QcInternshipWorkflowService({
      query,
    } as unknown as DataSource);
    await service.attendance({ date: '2026-09-04', page: 1, limit: 10 });
    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain('internship_assignment_status_history');
    expect(sql).toContain("AT TIME ZONE 'Asia/Manila'");
    expect(sql).toContain('ia.ended_at');
    expect(sql).toContain('ar.attendance_date = $1::date');
    expect(sql).toContain('ua.account_code AS student_account_code');
    expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE)\b/i);
  });

  it('finalizes only an eligible locked assignment while setting the QC actor', async () => {
    const query = jest.fn((sql: string) => {
      if (sql.includes('set_config')) return [];
      if (sql.includes('FOR UPDATE')) {
        return [
          {
            internship_assignment_id: 8,
            assignment_status: 'complete_student',
          },
        ];
      }
      if (sql.includes("assignment_status = 'finalized'")) {
        return [{ internshipAssignmentId: 8, assignmentStatus: 'finalized' }];
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
    const service = new QcInternshipWorkflowService({
      createQueryRunner: jest.fn(() => runner),
    } as unknown as DataSource);

    await expect(service.finalize(44, 8)).resolves.toMatchObject({
      assignmentStatus: 'finalized',
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('finalized_by_user_account_id = $2'),
      [8, 44],
    );
  });

  it('rejects finalization from an ineligible lifecycle state', async () => {
    const query = jest.fn((sql: string) =>
      sql.includes('FOR UPDATE')
        ? [{ internship_assignment_id: 8, assignment_status: 'ongoing' }]
        : [],
    );
    const runner = {
      isTransactionActive: true,
      query,
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    } as unknown as QueryRunner;
    const service = new QcInternshipWorkflowService({
      createQueryRunner: jest.fn(() => runner),
    } as unknown as DataSource);
    await expect(service.finalize(44, 8)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('soft-hides only finalized history for QC without deleting workflow data', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ internship_assignment_id: 8 }])
      .mockResolvedValueOnce([]);
    const service = new QcInternshipWorkflowService({
      query,
    } as unknown as DataSource);

    await expect(service.hideFinalized(44, 8)).resolves.toEqual({
      internshipAssignmentId: 8,
      hidden: true,
    });
    expect(String(query.mock.calls[0][0])).toContain(
      "assignment_status = 'finalized'",
    );
    expect(String(query.mock.calls[1][0])).toContain(
      'INSERT INTO public.internship_assignment_visibility',
    );
    expect(String(query.mock.calls[1][0])).not.toMatch(/DELETE\s+FROM/i);
  });

  it('groups internship history into active and closed lifecycle states', async () => {
    const assignments = [
      'pending',
      'ongoing',
      'complete_company',
      'complete_student',
      'withdrawn',
      'cancelled',
      'finalized',
    ].map((assignment_status, index) => ({
      internship_assignment_id: index + 1,
      assignment_status,
      student_account_code: `2026-STU-${String(index + 1).padStart(5, '0')}`,
      required_minutes: 600,
      total_rendered_minutes: 0,
    }));
    const service = new QcInternshipWorkflowService({
      query: jest.fn().mockResolvedValue(assignments),
    } as unknown as DataSource);

    const active = await service.history({
      page: 1,
      limit: 10,
      status: QcAssignmentStatusFilter.ACTIVE,
    });
    expect(active.data.map((row) => row.assignmentStatus)).toEqual([
      'pending',
      'ongoing',
    ]);
    expect(active.data[0].studentAccountCode).toBe('2026-STU-00001');

    const closed = await service.history({
      page: 1,
      limit: 10,
      status: QcAssignmentStatusFilter.CLOSED,
    });
    expect(closed.data.map((row) => row.assignmentStatus)).toEqual([
      'complete_company',
      'complete_student',
      'withdrawn',
      'cancelled',
      'finalized',
    ]);
  });

  it('returns the academic profile and both completion reviews for finalization details', async () => {
    const service = new QcInternshipWorkflowService({
      query: jest.fn().mockResolvedValue([
        {
          internship_assignment_id: 8,
          assignment_status: 'complete_student',
          student_full_name: 'Jay Park',
          strand_program: 'Computer Science',
          school_name: 'Quezon City University',
          year_level: 'fourth_year_college',
          required_minutes: 600,
          total_rendered_minutes: 600,
          company_completion_remark: 'Excellent performance.',
          student_company_review_rating: 5,
          student_company_review_remark: 'Excellent training experience.',
          reviewed_at: '2026-09-05T10:00:00+08:00',
        },
      ]),
    } as unknown as DataSource);

    await expect(service.finalizationDetail(8)).resolves.toMatchObject({
      intern: {
        schoolName: 'Quezon City University',
        yearLevel: 'fourth_year_college',
        strandProgram: 'Computer Science',
      },
      remarks: {
        companyReviewOfStudent: 'Excellent performance.',
        studentReviewOfCompany: {
          rating: 5,
          remark: 'Excellent training experience.',
        },
      },
    });
  });

  it('never selects the Student Company review from an Employer workflow query', () => {
    const source = readFileSync(
      join(__dirname, '../../employer/services/employer-internship.service.ts'),
      'utf8',
    );
    expect(source).not.toContain('student_company_review_rating');
    expect(source).not.toContain('student_company_review_remark');
  });
});
