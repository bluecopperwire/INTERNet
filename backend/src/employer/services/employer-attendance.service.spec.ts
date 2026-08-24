/* eslint-disable @typescript-eslint/unbound-method */
import type { DataSource } from 'typeorm';
import { EmployerAttendanceService } from './employer-attendance.service';
import type { EmployerCompanyResolver } from './company-resolver.service';
import { currentManilaDate, isScheduledWorkday } from '../utils/time.utils';

function attendanceRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    internship_assignment_id: 1,
    start_date: '2025-01-01',
    assignment_status: 'ongoing',
    actual_terminal_date: null,
    expected_end_date: null,
    working_days: 'weekdays',
    start_shift: '08:00:00',
    end_shift: '17:00:00',
    student_id: 1,
    student_full_name: 'Test Student',
    job_title: 'Developer',
    attendance_record_id: 11,
    time_in: '08:00:00',
    time_in_status: 'on_time',
    time_out: '17:00:00',
    ...overrides,
  };
}

function attendanceServiceWithRows(rows: Array<Record<string, unknown>>) {
  const query = jest.fn().mockResolvedValue(rows);
  const dataSource = { query } as unknown as DataSource;
  const resolver = {
    resolve: jest.fn().mockResolvedValue({ companyId: 9, userAccountId: 99 }),
  } as unknown as EmployerCompanyResolver;
  return {
    service: new EmployerAttendanceService(dataSource, resolver),
    query,
  };
}

describe('EmployerAttendanceService', () => {
  it('classifies on-time, late, and missing scheduled past rows exclusively', async () => {
    const { service } = attendanceServiceWithRows([
      attendanceRow({
        internship_assignment_id: 1,
        assignment_status: 'completed',
        actual_terminal_date: '2026-08-20',
        student_full_name: 'Present Student',
      }),
      attendanceRow({
        internship_assignment_id: 2,
        assignment_status: 'cancelled',
        actual_terminal_date: '2026-08-20',
        student_id: 2,
        student_full_name: 'Late Student',
        job_title: 'Designer',
        attendance_record_id: 12,
        time_in: '08:11:00',
        time_in_status: 'late',
      }),
      attendanceRow({
        internship_assignment_id: 3,
        assignment_status: 'withdrawn',
        actual_terminal_date: '2026-08-20',
        student_id: 3,
        student_full_name: 'Absent Student',
        job_title: 'Analyst',
        attendance_record_id: null,
        time_in: null,
        time_in_status: null,
        time_out: null,
      }),
    ]);

    const result = await service.summary(99, { date: '2026-08-17' });

    expect(result).toEqual({
      totalActive: 3,
      present: 1,
      late: 1,
      absent: 1,
    });
    expect(result.totalActive).toBe(
      result.present + result.late + result.absent,
    );
  });

  it.each([
    ['completed', '2025-01-15', '2025-01-13', true],
    ['completed', '2025-01-15', '2025-01-16', false],
    ['cancelled', '2025-01-15', '2025-01-13', true],
    ['cancelled', '2025-01-15', '2025-01-16', false],
    ['withdrawn', '2025-01-15', '2025-01-13', true],
    ['withdrawn', '2025-01-15', '2025-01-16', false],
    ['completed', '2025-01-15', '2025-01-15', true],
    ['cancelled', '2025-01-15', '2025-01-15', true],
    ['withdrawn', '2025-01-15', '2025-01-15', true],
  ])(
    'applies current %s assignment with terminal date %s correctly on %s',
    async (assignmentStatus, terminalDate, selectedDate, included) => {
      const { service } = attendanceServiceWithRows([
        attendanceRow({
          assignment_status: assignmentStatus,
          actual_terminal_date: terminalDate,
        }),
      ]);
      const result = await service.summary(99, { date: selectedDate });
      expect(result.totalActive).toBe(included ? 1 : 0);
    },
  );

  it('does not use expected_end_date as a historical terminal boundary', async () => {
    const { service, query } = attendanceServiceWithRows([
      attendanceRow({
        assignment_status: 'ongoing',
        expected_end_date: '2025-01-01',
        actual_terminal_date: null,
      }),
    ]);
    const result = await service.summary(99, { date: '2025-01-06' });
    expect(result.totalActive).toBe(1);
    expect(String(query.mock.calls[0][0])).not.toContain(
      'COALESCE(ia.end_date, ia.expected_end_date)',
    );
  });

  it('requires current ongoing status for the current Manila date', async () => {
    const today = currentManilaDate();
    const workingDays = isScheduledWorkday(today, 'weekdays')
      ? 'weekdays'
      : 'weekends';
    const { service } = attendanceServiceWithRows([
      attendanceRow({
        start_date: today,
        assignment_status: 'completed',
        actual_terminal_date: today,
        working_days: workingDays,
      }),
      attendanceRow({
        internship_assignment_id: 2,
        student_id: 2,
        start_date: today,
        assignment_status: 'ongoing',
        working_days: workingDays,
      }),
    ]);
    const result = await service.summary(99, { date: today });
    expect(result.totalActive).toBe(1);
  });

  it('returns no future-date attendance or absences', async () => {
    const dataSource = { query: jest.fn() } as unknown as DataSource;
    const resolver = {
      resolve: jest.fn(),
    } as unknown as EmployerCompanyResolver;
    const service = new EmployerAttendanceService(dataSource, resolver);
    const result = await service.summary(1, { date: '2099-01-01' });
    expect(result).toEqual({ totalActive: 0, present: 0, late: 0, absent: 0 });
    expect(resolver.resolve).not.toHaveBeenCalled();
  });

  it('does not stop virtual absence history at expected_end_date', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          internship_assignment_id: 1,
          start_date: new Date('2026-08-16T16:00:00.000Z'),
          expected_end_date: new Date('2026-08-17T16:00:00.000Z'),
          end_date: null,
          assignment_status: 'ongoing',
          actual_terminal_date: null,
          working_days: 'weekdays',
          start_shift: '08:00:00',
          end_shift: '17:00:00',
          required_hours: 400,
          student_id: 1,
          student_full_name: 'History Student',
          job_title: 'Developer',
        },
      ])
      .mockResolvedValueOnce([]);
    const dataSource = { query } as unknown as DataSource;
    const resolver = {
      resolve: jest.fn().mockResolvedValue({ companyId: 9, userAccountId: 99 }),
    } as unknown as EmployerCompanyResolver;
    const service = new EmployerAttendanceService(dataSource, resolver);

    const result = await service.history(99, 1);

    expect(result.history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ date: '2026-08-19', timeIn: null }),
      ]),
    );
    expect(String(query.mock.calls[0][0])).toContain(
      "AT TIME ZONE 'Asia/Manila'",
    );
    expect(String(query.mock.calls[0][0])).toContain(
      'ia.start_date::text AS start_date',
    );
  });

  it('normalizes native Date terminal bounds and includes the terminal workday', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          internship_assignment_id: 1,
          start_date: new Date('2026-08-16T16:00:00.000Z'),
          assignment_status: 'cancelled',
          actual_terminal_date: new Date('2026-08-19T16:00:00.000Z'),
          working_days: 'weekdays',
          start_shift: '08:00:00',
          end_shift: '17:00:00',
          required_hours: 400,
          student_id: 1,
          student_full_name: 'History Student',
          job_title: 'Developer',
        },
      ])
      .mockResolvedValueOnce([]);
    const dataSource = { query } as unknown as DataSource;
    const resolver = {
      resolve: jest.fn().mockResolvedValue({ companyId: 9, userAccountId: 99 }),
    } as unknown as EmployerCompanyResolver;
    const service = new EmployerAttendanceService(dataSource, resolver);

    const result = await service.history(99, 1);

    expect(result.history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ date: '2026-08-20', timeIn: null }),
      ]),
    );
    expect(result.history).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ date: '2026-08-21' })]),
    );
  });
});
