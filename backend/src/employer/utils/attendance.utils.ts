import { timeToMinutes } from './time.utils';

export type RenderedHoursStatus =
  'incomplete' | 'undertime' | 'complete' | 'overtime';

export interface DerivedHours {
  renderedHours: number;
  renderedHoursStatus: RenderedHoursStatus;
}

export function roundHours(value: number): number {
  return Number(value.toFixed(2));
}

export function rawRenderedHours(
  timeIn: string,
  timeOut: string | null,
): number {
  if (!timeOut) return 0;
  const grossMinutes = Math.max(
    timeToMinutes(timeOut) - timeToMinutes(timeIn),
    0,
  );
  return Math.max(grossMinutes - 60, 0) / 60;
}

export function deriveRenderedHours(
  timeIn: string,
  timeOut: string | null,
  startShift: string,
  endShift: string,
): DerivedHours {
  if (!timeOut) {
    return { renderedHours: 0, renderedHoursStatus: 'incomplete' };
  }

  const renderedMinutes = rawRenderedHours(timeIn, timeOut) * 60;
  const expectedMinutes = Math.max(
    timeToMinutes(endShift) - timeToMinutes(startShift) - 60,
    0,
  );
  const renderedHoursStatus: RenderedHoursStatus =
    renderedMinutes < expectedMinutes
      ? 'undertime'
      : renderedMinutes > expectedMinutes
        ? 'overtime'
        : 'complete';

  return {
    renderedHours: roundHours(renderedMinutes / 60),
    renderedHoursStatus,
  };
}

export function totalRenderedHours(
  records: Array<{
    time_in: string;
    time_out: string | null;
    start_shift: string;
    end_shift: string;
  }>,
): number {
  return roundHours(
    records.reduce(
      (sum, row) =>
        sum +
        rawRenderedHours(
          String(row.time_in),
          row.time_out === null ? null : String(row.time_out),
        ),
      0,
    ),
  );
}

export function remainingHours(
  requiredHours: number,
  renderedHours: number,
): number {
  return roundHours(Math.max(requiredHours - renderedHours, 0));
}
