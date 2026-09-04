export const AVAILABILITY_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

const LEGACY_SCHEDULES: Record<string, number[]> = {
  weekdays: [1, 2, 3, 4, 5],
  weekends: [0, 6],
  flexible: [0, 1, 2, 3, 4, 5, 6],
}

export function normalizeAvailabilityDays(value: unknown): number[] {
  if (typeof value === 'string') {
    return [...(LEGACY_SCHEDULES[value.trim().toLowerCase()] ?? [])]
  }
  if (!Array.isArray(value)) return []

  return [...new Set(value.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
    .sort((a, b) => a - b)
}

export function formatAvailabilityDays(value: unknown, fallback = 'Not provided'): string {
  const label = normalizeAvailabilityDays(value)
    .map((day) => AVAILABILITY_DAYS[day])
    .join(', ')
  return label || fallback
}
