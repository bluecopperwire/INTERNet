import { SelectQueryBuilder } from 'typeorm';
import { DateFilterDto, DatePreset } from '../dto/date-filter.dto';

export function getDateBoundaries(
  preset?: DatePreset,
  startDateStr?: string,
  endDateStr?: string,
): { start: Date; end: Date } | null {
  if (startDateStr && endDateStr) {
    const start = new Date(`${startDateStr}T00:00:00+08:00`);
    const end = new Date(`${endDateStr}T23:59:59.999+08:00`);
    return { start, end };
  }

  if (!preset || preset === DatePreset.ALL) {
    return null;
  }

  // Current date/time in Asia/Manila (UTC+8)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const manilaNow = new Date(utc + 3600000 * 8);

  const year = manilaNow.getFullYear();
  const month = String(manilaNow.getMonth() + 1).padStart(2, '0');
  const day = String(manilaNow.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const end = new Date(`${todayStr}T23:59:59.999+08:00`);

  if (preset === DatePreset.TODAY) {
    const start = new Date(`${todayStr}T00:00:00+08:00`);
    return { start, end };
  }

  if (preset === DatePreset.WEEK) {
    // Rolling 7 days: today - 6 days
    const past = new Date(manilaNow);
    past.setDate(past.getDate() - 6);
    const pYear = past.getFullYear();
    const pMonth = String(past.getMonth() + 1).padStart(2, '0');
    const pDay = String(past.getDate()).padStart(2, '0');
    const start = new Date(`${pYear}-${pMonth}-${pDay}T00:00:00+08:00`);
    return { start, end };
  }

  if (preset === DatePreset.MONTH) {
    // Rolling 30 days: today - 29 days
    const past = new Date(manilaNow);
    past.setDate(past.getDate() - 29);
    const pYear = past.getFullYear();
    const pMonth = String(past.getMonth() + 1).padStart(2, '0');
    const pDay = String(past.getDate()).padStart(2, '0');
    const start = new Date(`${pYear}-${pMonth}-${pDay}T00:00:00+08:00`);
    return { start, end };
  }

  return null;
}

export function applyDateFilter<T extends object>(
  qb: SelectQueryBuilder<T>,
  columnName: string,
  filterDto?: DateFilterDto,
): void {
  if (!filterDto) return;

  const boundaries = getDateBoundaries(
    filterDto.datePreset,
    filterDto.startDate,
    filterDto.endDate,
  );

  if (boundaries) {
    qb.andWhere(
      `${columnName} >= :dateFilterStart AND ${columnName} <= :dateFilterEnd`,
      {
        dateFilterStart: boundaries.start.toISOString(),
        dateFilterEnd: boundaries.end.toISOString(),
      },
    );
  }
}
