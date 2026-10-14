/* eslint-disable @typescript-eslint/unbound-method */
import type { DataSource } from 'typeorm';
import type { EmployerCompanyResolver } from './company-resolver.service';
import {
  EmployerAttendanceService,
  HISTORICAL_ONGOING_ASSIGNMENT_PREDICATE,
} from './employer-attendance.service';
import { currentManilaDate, isScheduledWorkday } from '../utils/time.utils';

function monitoringRow(overrides: Record<string, unknown> = {}) {
  return {
    internship_assignment_id: 1,
    working_days: [1, 2, 3, 4, 5],
    student_id: 1,
    student_full_name: 'Test Student',
    strand_program: 'BS Information Technology',
    job_title: 'Developer',
    attendance_record_id: 11,
    time_in: '08:00:00',
    time_out: '17:00:00',
    attendance_status: 'present',
    rendered_minutes: 480,
    ...overrides,
  };
}

const resolver = {
  resolve: jest.fn().mockResolvedValue({ companyId: 9, userAccountId: 99 }),
} as unknown as EmployerCompanyResolver;

describe('EmployerAttendanceService Phase 4 monitoring', () => {
  it('derives Pending and counts only Present/Absent in their summary cards', async () => {
    const rows = [
      monitoringRow(),
      monitoringRow({
        internship_assignment_id: 2,
        student_id: 2,
        attendance_record_id: 12,
        attendance_status: 'absent',
        time_in: null,
        time_out: null,
        rendered_minutes: 0,
      }),
      monitoringRow({
        internship_assignment_id: 3,
        student_id: 3,
        attendance_record_id: 13,
        attendance_status: 'incomplete',
        time_out: null,
        rendered_minutes: 0,
      }),
      monitoringRow({
        internship_assignment_id: 4,
        student_id: 4,
        attendance_record_id: null,
        attendance_status: null,
        time_in: null,
        time_out: null,
        rendered_minutes: null,
      }),
    ];
    const dataSource = {
      query: jest.fn().mockResolvedValue(rows),
    } as unknown as DataSource;
    const service = new EmployerAttendanceService(dataSource, resolver);

    await expect(service.summary(99, { date: '2026-08-17' })).resolves.toEqual({
      ongoingInterns: 4,
      presentInterns: 1,
      absentInterns: 1,
    });
    const pending = await service.list(99, {
      date: '2026-08-17',
      status: 'pending' as never,
      page: 1,
      limit: 5,
    });
    expect(pending.data).toEqual([
      expect.objectContaining({
        internshipAssignmentId: 4,
        status: 'pending',
      }),
    ]);
  });

  it('uses status history, actual operational end, and Employer visibility in the reusable SQL predicate', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const service = new EmployerAttendanceService(
      { query } as unknown as DataSource,
      resolver,
    );

    await service.list(99, { date: '2026-08-17', page: 1, limit: 5 });

    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain('internship_assignment_status_history');
    expect(sql).toContain("new_assignment_status = 'ongoing'");
    expect(sql).toContain('ia.ended_at');
    expect(sql).toContain('ia.start_shift');
    expect(sql).toContain('iav.employer_hidden_at IS NOT NULL');
    expect(sql).not.toContain("ia.assignment_status = 'ongoing'");
    expect(HISTORICAL_ONGOING_ASSIGNMENT_PREDICATE).not.toContain(
      'expected_end_date',
    );
  });

  it('excludes interns not scheduled on the selected weekday', async () => {
    const selectedDate = '2026-08-17';
    const selectedWeekday = new Date(`${selectedDate}T00:00:00Z`).getUTCDay();
    const otherDay = (selectedWeekday + 1) % 7;
    const service = new EmployerAttendanceService(
      {
        query: jest.fn().mockResolvedValue([
          monitoringRow({ working_days: [selectedWeekday] }),
          monitoringRow({
            internship_assignment_id: 2,
            working_days: [otherDay],
          }),
        ]),
      } as unknown as DataSource,
      resolver,
    );

    const result = await service.list(99, {
      date: selectedDate,
      page: 1,
      limit: 5,
    });
    expect(result.meta.total).toBe(1);
  });

  it('returns no future monitoring result and never resolves the Company', async () => {
    const future = '2099-01-01';
    const localResolver = {
      resolve: jest.fn(),
    } as unknown as EmployerCompanyResolver;
    const service = new EmployerAttendanceService(
      { query: jest.fn() } as unknown as DataSource,
      localResolver,
    );

    await expect(service.summary(1, { date: future })).resolves.toEqual({
      ongoingInterns: 0,
      presentInterns: 0,
      absentInterns: 0,
    });
    expect(localResolver.resolve).not.toHaveBeenCalled();
  });

  it('supports current-day exact weekday arrays', () => {
    const today = currentManilaDate();
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    expect(isScheduledWorkday(today, [weekday])).toBe(true);
  });
});

describe('EmployerAttendanceService Phase 4 history', () => {
  it('returns only persisted records, assignment-wide cards, filters, and backend pagination', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          internship_assignment_id: 1,
          required_minutes: 600,
          assignment_status: 'finalized',
          student_id: 1,
          student_full_name: 'History Student',
          student_contact_email: 'history@example.test',
          student_contact_number: '09123456789',
          student_address: 'Batasan Hills, Quezon City',
          student_photo_file_path: 'uploads/history.png',
          student_profile_updated_at: '2026-09-01T00:00:00.000Z',
          strand_program: 'STEM',
          job_title: 'Developer',
          company_name: 'Test Company',
        },
      ])
      .mockResolvedValueOnce([
        {
          attendance_record_id: 1,
          attendance_date: '2026-08-17',
          time_in: '08:00:00',
          time_out: '17:00:00',
          rendered_minutes: 480,
          attendance_status: 'present',
        },
        {
          attendance_record_id: 2,
          attendance_date: '2026-08-18',
          time_in: null,
          time_out: null,
          rendered_minutes: 0,
          attendance_status: 'absent',
        },
        {
          attendance_record_id: 3,
          attendance_date: '2026-08-19',
          time_in: '08:00:00',
          time_out: null,
          rendered_minutes: 0,
          attendance_status: 'incomplete',
        },
      ]);
    const service = new EmployerAttendanceService(
      { query } as unknown as DataSource,
      resolver,
    );

    const result = await service.history(99, 1, {
      status: 'absent' as never,
      page: 1,
      limit: 5,
    });

    expect(result.header).toEqual(
      expect.objectContaining({
        jobTitle: 'Developer',
        companyName: 'Test Company',
        studentContactEmail: 'history@example.test',
        studentContactNumber: '09123456789',
        studentAddress: 'Batasan Hills, Quezon City',
        studentPhotoFilePath: 'uploads/history.png',
        assignmentStatus: 'finalized',
      }),
    );
    expect(result.summary).toEqual({
      daysPresent: 1,
      daysAbsent: 1,
      renderedMinutes: 480,
      remainingMinutes: 120,
    });
    expect(result.history.data).toEqual([
      expect.objectContaining({ attendanceStatus: 'absent' }),
    ]);
    expect(result.history.meta).toEqual(
      expect.objectContaining({ page: 1, limit: 5, total: 1 }),
    );
    const sql = query.mock.calls.map(([value]) => String(value)).join('\n');
    expect(sql).not.toContain('internship_feedback');
    expect(sql).not.toMatch(/INSERT|UPDATE public\.attendance_record/);
    expect(sql).toContain('iav.employer_hidden_at IS NOT NULL');
  });
});
