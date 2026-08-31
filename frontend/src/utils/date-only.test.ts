import { describe, expect, it } from 'vitest'
import {
  birthdateMaximum,
  formatDateOnly,
  isValidDateOnly,
  opportunityDeadlineMinimum,
  shiftDateOnly,
  todayDateOnly,
  toDateOnly,
} from './date-only'

describe('date-only utilities', () => {
  it('preserves a plain database date without invoking UTC conversion', () => {
    expect(toDateOnly('2004-05-17')).toBe('2004-05-17')
  })

  it('restores the Manila calendar date from a previous-day UTC timestamp', () => {
    expect(toDateOnly('2004-05-16T16:00:00.000Z')).toBe('2004-05-17')
    expect(toDateOnly(new Date('2026-08-30T16:00:00.000Z'))).toBe('2026-08-31')
  })

  it('does not drift after repeated adapter-style round trips', () => {
    const firstRead = toDateOnly('2004-05-16T16:00:00.000Z')
    const firstSave = toDateOnly(firstRead)
    const secondRead = toDateOnly(firstSave)
    expect([firstRead, firstSave, secondRead]).toEqual(['2004-05-17', '2004-05-17', '2004-05-17'])
  })

  it('calculates Manila-based input boundaries', () => {
    const now = new Date('2026-08-31T04:00:00.000Z')
    expect(todayDateOnly(now)).toBe('2026-08-31')
    expect(birthdateMaximum(now)).toBe('2026-08-30')
    expect(opportunityDeadlineMinimum(now)).toBe('2026-09-01')
  })

  it('validates and shifts date-only values without local timezone drift', () => {
    expect(isValidDateOnly('2024-02-29')).toBe(true)
    expect(isValidDateOnly('2023-02-29')).toBe(false)
    expect(shiftDateOnly('2024-02-29', 1)).toBe('2024-03-01')
    expect(formatDateOnly('2004-05-16T16:00:00.000Z')).toBe('May 17, 2004')
  })
})
