import type { DataSource } from 'typeorm';
import { AttendanceResolutionScheduler } from './attendance-resolution.scheduler';

describe('AttendanceResolutionScheduler', () => {
  it('converts only previous open Present rows and is rerunnable', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ attendance_record_id: 1 }])
      .mockResolvedValueOnce([]);
    const scheduler = new AttendanceResolutionScheduler({
      query,
    } as unknown as DataSource);
    await expect(
      scheduler.markPreviousOpenRowsIncomplete('2026-09-04'),
    ).resolves.toBe(1);
    await expect(
      scheduler.markPreviousOpenRowsIncomplete('2026-09-04'),
    ).resolves.toBe(0);
    expect(String(query.mock.calls[0][0])).toContain(
      "attendance_status = 'present'",
    );
    expect(String(query.mock.calls[0][0])).toContain(
      'attendance_date < $1::date',
    );
  });

  it('creates due Absent rows idempotently from exact workdays and shift end', async () => {
    const query = jest.fn().mockResolvedValue([{ attendance_record_id: 2 }]);
    const scheduler = new AttendanceResolutionScheduler({
      query,
    } as unknown as DataSource);
    await expect(scheduler.createDueAbsences('2026-09-04', 1020)).resolves.toBe(
      1,
    );
    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain("assignment_status = 'ongoing'");
    expect(sql).toContain('ANY(ia.working_days)');
    expect(sql).toContain('ia.ended_at IS NULL');
    expect(sql).toContain(
      'ON CONFLICT (internship_assignment_id, attendance_date) DO NOTHING',
    );
    expect(query.mock.calls[0][1]).toEqual(['2026-09-04', 1020]);
  });

  it('uses a supplied instant to resolve Manila date and time', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const scheduler = new AttendanceResolutionScheduler({
      query,
    } as unknown as DataSource);
    await scheduler.resolveAttendance(new Date('2026-09-03T16:01:00.000Z'));
    expect(query.mock.calls[0][1]).toEqual(['2026-09-04']);
    expect(query.mock.calls[1][1]).toEqual(['2026-09-04', 1]);
  });
});
