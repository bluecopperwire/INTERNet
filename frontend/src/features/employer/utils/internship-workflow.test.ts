import { readFileSync } from 'node:fs';
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

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

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

  it('renders student names like the other values in Company tables', () => {
    for (const page of ['AttendanceMonitoringPage.tsx', 'MonitorInternshipPage.tsx', 'InternshipHistoryPage.tsx']) {
      const source = readSource(`../pages/${page}`);
      expect(source).not.toMatch(/<strong>\{(?:row|internship)\.studentFullName\}<\/strong>/);
    }
  });

  it('renders Company internship-history statuses as state-colored tags', () => {
    const source = readSource('../pages/InternshipHistoryPage.tsx');
    const styles = readSource('../pages/MonitorInternshipPage.module.css');
    expect(source).toContain("styles[row.assignmentStatus.replaceAll('_', '')]");
    for (const statusClass of ['pending', 'ongoing', 'completecompany', 'completestudent', 'withdrawn', 'cancelled', 'finalized']) {
      expect(styles).toContain(`.${statusClass}`);
    }
  });

  it('offers grouped history filters and finalized-only row deletion', () => {
    const source = readSource('../pages/InternshipHistoryPage.tsx');
    const styles = readSource('../pages/MonitorInternshipPage.module.css');
    expect(source).toContain('<option value="">All</option><option value="active">Active</option><option value="closed">Closed</option>');
    expect(source).toContain("row.assignmentStatus === 'finalized'");
    expect(source).toContain('styles.rowActions');
    expect(source).toContain('styles.deleteButton');
    expect(source).toContain('ConfirmDeleteModal');
    expect(styles).toContain('.deleteButton');
  });

  it('uses the Student details layout with only Company-appropriate controls', () => {
    const details = readSource('../pages/MonitorInternshipDetailsPage.tsx');
    for (const heading of ['Internship Details', 'Intern Information', 'Assignment Information', 'Schedule Information', 'Status Information']) {
      expect(details).toContain(heading);
    }
    for (const label of ['Full Name', 'Program / Strand', 'Year Level', 'School', 'Company', 'Job Title', 'Required Hours', 'Working Days', 'Start Date', 'Expected End Date', 'Shift Start', 'Shift End', 'Status', 'Rendered Hours', 'Remaining Hours']) {
      expect(details).toContain(label);
    }
    expect(details).toContain('AttendanceProfileSummary');
    expect(details).toContain('Cancel Internship');
    expect(details).toContain('Edit Details');
    expect(details).toContain('Mark Internship as Complete');
    expect(details).toContain('disabled={!details.status.canComplete || saving}');
    expect(details).toContain('Company Review of the Student');
    expect(details).not.toContain('Internship Completion Remark');
    expect(details).not.toContain('Internship Cancellation Remark');
    expect(details).not.toContain('Withdraw Internship');
    expect(details).not.toContain('Review Company');
  });

  it('keeps Company history read-only and displays lifecycle outcome remarks', () => {
    const details = readSource('../pages/InternshipHistoryDetailsPage.tsx');
    for (const heading of ['Internship Details', 'Intern Information', 'Assignment Information', 'Schedule Information', 'Status Information']) {
      expect(details).toContain(heading);
    }
    for (const label of ['Full Name', 'Program / Strand', 'Year Level', 'School', 'Company', 'Job Title', 'Required Hours', 'Working Days', 'Start Date', 'Expected End Date', 'Shift Start', 'Shift End', 'Status', 'Rendered Hours', 'Remaining Hours']) {
      expect(details).toContain(label);
    }
    expect(details).toContain('AttendanceProfileSummary');
    expect(details).toContain('Internship Withdrawal Remark');
    expect(details).toContain('studentWithdrawalRemark');
    expect(details).toContain('Internship Cancellation Remark');
    expect(details).toContain('Internship Completion Remark');
    expect(details).toContain('View Attendance History');
    expect(details).toContain('studentPageStyles.attendanceButton');
    expect(details).not.toContain('Clock3');
    expect(details).toContain('details.status.canDelete');
    expect(details).toContain('className={styles.deleteRecordButton}');
    expect(details).not.toContain('<Trash2');
    expect(readSource('../pages/MonitorInternshipDetailsPage.module.css')).toMatch(/\.companyActions \.deleteRecordButton\s*\{[^}]*font-size:\s*inherit/s);
    expect(details).not.toContain('Mark Internship as Complete');
    expect(details).not.toContain('Cancel Internship');
    expect(details).not.toContain('Edit Details');
  });
});
