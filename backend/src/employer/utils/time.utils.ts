import { BadRequestException } from '@nestjs/common';

export const MANILA_TIME_ZONE = 'Asia/Manila';

function manilaParts(now: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function currentManilaDate(now = new Date()): string {
  const parts = manilaParts(now);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function normalizeDateOnly(value: unknown, field = 'date'): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    assertValidDate(value, field);
    return value;
  }

  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${field} is not a valid calendar date`);
  }
  const normalized = currentManilaDate(parsed);
  assertValidDate(normalized, field);
  return normalized;
}

export function currentManilaMinutes(now = new Date()): number {
  const parts = manilaParts(now);
  return (
    Number(parts.hour) * 60 + Number(parts.minute) + Number(parts.second) / 60
  );
}

export function assertValidDate(value: string, field = 'date'): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(`${field} must be YYYY-MM-DD`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException(`${field} is not a valid calendar date`);
  }
}

export function timeToMinutes(value: string): number {
  const parts = value.split(':').map(Number);
  return parts[0] * 60 + parts[1] + (parts[2] ?? 0) / 60;
}

export function assertValidTime(value: string, field: string): void {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/.test(value)) {
    throw new BadRequestException(`${field} must be HH:mm`);
  }
}

export function assertDateRange(
  startDate: string,
  expectedEndDate?: string | null,
): void {
  assertValidDate(startDate, 'startDate');
  if (expectedEndDate) {
    assertValidDate(expectedEndDate, 'expectedEndDate');
    if (expectedEndDate < startDate) {
      throw new BadRequestException(
        'expectedEndDate must be on or after startDate',
      );
    }
  }
}

export function assertShiftOrder(startShift: string, endShift: string): void {
  assertValidTime(startShift, 'startShift');
  assertValidTime(endShift, 'endShift');
  if (timeToMinutes(endShift) <= timeToMinutes(startShift)) {
    throw new BadRequestException('endShift must be later than startShift');
  }
}

export function manilaDateTimeToIso(date: string, time: string): string {
  assertValidDate(date, 'interviewDate');
  assertValidTime(time, 'interviewTime');
  return new Date(`${date}T${time}:00+08:00`).toISOString();
}

export function isScheduledWorkday(date: string, workingDays: string): boolean {
  assertValidDate(date);
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  if (workingDays === 'weekdays') return day >= 1 && day <= 5;
  if (workingDays === 'weekends') return day === 0 || day === 6;
  return false;
}

export function hasShiftEnded(
  date: string,
  endShift: string,
  now = new Date(),
): boolean {
  const today = currentManilaDate(now);
  if (date < today) return true;
  if (date > today) return false;
  return currentManilaMinutes(now) >= timeToMinutes(endShift);
}

export function enumerateDates(start: string, end: string): string[] {
  assertValidDate(start);
  assertValidDate(end);
  if (end < start) return [];
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
