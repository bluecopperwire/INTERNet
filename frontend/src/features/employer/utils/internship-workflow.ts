import type { AssignmentStatus } from '../../../types/api';

export const COMPANY_PAGE_SIZES = [5, 10, 15] as const;
export const MANAGE_INTERNSHIP_COLUMNS = [
  'Student Name',
  'Job Title',
  'Program / Strand',
  'Remaining Hours',
  'Status',
  'Action',
] as const;
export const INTERNSHIP_HISTORY_COLUMNS = [
  'Student Name',
  'Job Title',
  'Program / Strand',
  'Status',
  'Action',
] as const;
export const ATTENDANCE_MONITOR_COLUMNS = [
  'Student Name',
  'Job Title',
  'Program / Strand',
  'Status',
  'Action',
] as const;
export const ATTENDANCE_HISTORY_COLUMNS = [
  'Date',
  'Clock In Time',
  'Clock Out Time',
  'Rendered Time',
  'Attendance Status',
] as const;

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function formatMinutes(minutes: number): string {
  const safeMinutes = Math.max(0, Math.trunc(Number(minutes) || 0));
  return `${Math.floor(safeMinutes / 60)} hours, ${safeMinutes % 60} minutes`;
}

export function formatClockTime(value: string | null | undefined): string {
  if (!value) return '-';
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '-';
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

export function formatWorkingDays(days: readonly number[]): string {
  return days.map((day) => WEEKDAYS[day]).filter(Boolean).join(', ');
}

export function assignmentStatusLabel(status: AssignmentStatus): string {
  return {
    pending: 'Pending',
    ongoing: 'Ongoing',
    complete_company: 'Complete (Company)',
    complete_student: 'Complete (Student)',
    withdrawn: 'Withdrawn',
    cancelled: 'Cancelled',
    finalized: 'Finalized',
  }[status];
}

export function attendanceStatusLabel(
  status: 'pending' | 'present' | 'absent' | 'incomplete',
): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
