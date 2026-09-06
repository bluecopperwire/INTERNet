import { describe, expect, it } from 'vitest'
import { formatAvailabilityDays, normalizeAvailabilityDays } from './availability-days'

describe('availability day helpers', () => {
  it('preserves, sorts, and formats exact availability days', () => {
    expect(normalizeAvailabilityDays([6, 1, 3, 1])).toEqual([1, 3, 6])
    expect(formatAvailabilityDays([1, 3, 6])).toBe('Monday, Wednesday, Saturday')
  })

  it('keeps legacy schedule values readable during rollout', () => {
    expect(normalizeAvailabilityDays('weekdays')).toEqual([1, 2, 3, 4, 5])
    expect(formatAvailabilityDays('weekends')).toBe('Sunday, Saturday')
  })
})
