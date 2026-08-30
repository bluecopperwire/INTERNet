import { deriveRenderedHours, remainingHours } from './attendance.utils';
import { hasShiftEnded, isScheduledWorkday } from './time.utils';

describe('employer attendance derivation', () => {
  it.each([
    ['08:00', '17:00', 8, 'complete'],
    ['08:11', '17:00', 7.82, 'undertime'],
    ['08:00', '16:00', 7, 'undertime'],
    ['08:00', '18:00', 9, 'overtime'],
  ])(
    'deducts a one-hour break for %s-%s',
    (timeIn, timeOut, expectedHours, expectedStatus) => {
      expect(deriveRenderedHours(timeIn, timeOut, '08:00', '17:00')).toEqual({
        renderedHours: expectedHours,
        renderedHoursStatus: expectedStatus,
      });
    },
  );

  it('marks an open attendance row incomplete', () => {
    expect(deriveRenderedHours('08:00', null, '08:00', '17:00')).toEqual({
      renderedHours: 0,
      renderedHoursStatus: 'incomplete',
    });
  });

  it('clamps remaining hours to zero', () => {
    expect(remainingHours(400, 405.5)).toBe(0);
  });

  it('applies weekdays and weekends without flexible absence logic', () => {
    expect(isScheduledWorkday('2026-08-24', 'weekdays')).toBe(true);
    expect(isScheduledWorkday('2026-08-24', 'weekends')).toBe(false);
    expect(isScheduledWorkday('2026-08-23', 'weekends')).toBe(true);
    expect(isScheduledWorkday('2026-08-23', 'flexible')).toBe(false);
  });

  it('does not consider the current shift ended before end time', () => {
    const beforeEnd = new Date('2026-08-24T08:59:00.000Z'); // 16:59 Manila
    expect(hasShiftEnded('2026-08-24', '17:00', beforeEnd)).toBe(false);
  });

  it('considers the current shift ended at or after end time', () => {
    const afterEnd = new Date('2026-08-24T09:01:00.000Z'); // 17:01 Manila
    expect(hasShiftEnded('2026-08-24', '17:00', afterEnd)).toBe(true);
  });
});
