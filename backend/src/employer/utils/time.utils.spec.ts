import {
  currentManilaDate,
  normalizeDateOnly,
} from './time.utils';

describe('date-only timezone utilities', () => {
  it('restores the Manila calendar date from the previous UTC day', () => {
    expect(normalizeDateOnly('2004-05-16T16:00:00.000Z')).toBe('2004-05-17');
  });

  it('preserves plain date-only values across repeated normalization', () => {
    const first = normalizeDateOnly('2004-05-17');
    expect(normalizeDateOnly(first)).toBe('2004-05-17');
  });

  it('uses Manila boundaries when deriving the current calendar date', () => {
    expect(currentManilaDate(new Date('2026-08-30T16:00:00.000Z'))).toBe(
      '2026-08-31',
    );
  });
});
