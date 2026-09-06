import { timeToMinutes } from './time.utils';

export interface DerivedHours {
  renderedMinutes: number;
  renderedHours: number;
}

export function roundHours(value: number): number {
  return Number(value.toFixed(2));
}

export function rawRenderedHours(
  timeIn: string,
  timeOut: string | null,
): number {
  return rawRenderedMinutes(timeIn, timeOut) / 60;
}

export function rawRenderedMinutes(
  timeIn: string,
  timeOut: string | null,
): number {
  if (!timeOut) return 0;
  const grossMinutes = Math.max(
    timeToMinutes(timeOut) - timeToMinutes(timeIn),
    0,
  );
  return Math.max(Math.round(grossMinutes) - 60, 0);
}

export function deriveRenderedHours(
  timeIn: string | null,
  timeOut: string | null,
): DerivedHours {
  if (!timeIn || !timeOut) {
    return {
      renderedMinutes: 0,
      renderedHours: 0,
    };
  }

  const renderedMinutes = rawRenderedMinutes(timeIn, timeOut);
  return {
    renderedMinutes,
    renderedHours: roundHours(renderedMinutes / 60),
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

export function remainingMinutes(
  requiredMinutes: number,
  renderedMinutes: number,
): number {
  return Math.max(requiredMinutes - renderedMinutes, 0);
}

export function remainingHours(
  requiredHours: number,
  renderedHours: number,
): number {
  return roundHours(Math.max(requiredHours - renderedHours, 0));
}
