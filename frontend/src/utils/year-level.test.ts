import { describe, expect, it } from 'vitest';
import { formatYearLevel } from './year-level';

describe('formatYearLevel', () => {
  it.each([
    ['grade_11', 'Grade 11'],
    ['grade_12', 'Grade 12'],
    ['first_year_college', 'First Year College'],
    ['fourth_year_college', 'Fourth Year College'],
    ['4th Year', 'Fourth Year College'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatYearLevel(value)).toBe(expected);
  });

  it('humanizes an unknown enum-like value without exposing underscores', () => {
    expect(formatYearLevel('graduate_student')).toBe('Graduate Student');
  });

  it('uses the supplied fallback for an empty value', () => {
    expect(formatYearLevel('', '')).toBe('');
  });
});
