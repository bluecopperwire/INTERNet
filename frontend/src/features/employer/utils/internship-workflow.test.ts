import { describe, expect, it } from 'vitest';
import {
  assignmentStatusLabel,
  attendanceStatusLabel,
  formatClockTime,
  formatMinutes,
  formatWorkingDays,
  ATTENDANCE_HISTORY_COLUMNS,
  ATTENDANCE_MONITOR_COLUMNS,
  COMPANY_PAGE_SIZES,
  INTERNSHIP_HISTORY_COLUMNS,
  MANAGE_INTERNSHIP_COLUMNS,
} from './internship-workflow';

describe('Company internship workflow display helpers', () => {
  it('formats minute-backed durations without decimal arithmetic', () => {
    expect(formatMinutes(125)).toBe('2 hours, 5 minutes');
    expect(formatMinutes(-15)).toBe('0 hours, 0 minutes');
  });

  it('maps all seven persisted assignment statuses without collapsing completion', () => {
    expect(assignmentStatusLabel('complete_company')).toBe('Complete (Company)');
    expect(assignmentStatusLabel('complete_student')).toBe('Complete (Student)');
    expect(assignmentStatusLabel('withdrawn')).toBe('Withdrawn');
    expect(assignmentStatusLabel('finalized')).toBe('Finalized');
  });

  it('supports exact weekday combinations and attendance states', () => {
    expect(formatWorkingDays([1, 3, 6])).toBe('Monday, Wednesday, Saturday');
    expect(attendanceStatusLabel('pending')).toBe('Pending');
    expect(attendanceStatusLabel('incomplete')).toBe('Incomplete');
    expect(formatClockTime('13:05:00')).toBe('1:05 PM');
    expect(formatClockTime(null)).toBe('-');
  });

  it('locks the four Company tables and pagination to the Phase 4 contract', () => {
    expect(COMPANY_PAGE_SIZES).toEqual([5, 10, 15]);
    expect(MANAGE_INTERNSHIP_COLUMNS).toEqual(['Student Name', 'Job Title', 'Program / Strand', 'Remaining Hours', 'Status', 'Action']);
    expect(INTERNSHIP_HISTORY_COLUMNS).toEqual(['Student Name', 'Job Title', 'Program / Strand', 'Status', 'Action']);
    expect(ATTENDANCE_MONITOR_COLUMNS).toEqual(['Student Name', 'Job Title', 'Program / Strand', 'Status', 'Action']);
    expect(ATTENDANCE_HISTORY_COLUMNS).toEqual(['Date', 'Clock In Time', 'Clock Out Time', 'Rendered Time', 'Attendance Status']);
  });
});
