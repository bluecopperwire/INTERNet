export const MANILA_TIME_ZONE = 'Asia/Manila'

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function partsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function isValidDateOnly(value: string) {
  const match = DATE_ONLY_PATTERN.exec(value)
  if (!match) return false
  const [, year, month, day] = match
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return parsed.toISOString().slice(0, 10) === value
}

/**
 * Converts API date values into the calendar date intended in Manila.
 * Plain YYYY-MM-DD values are never passed through JavaScript's UTC parser.
 */
export function toDateOnly(value: unknown, timeZone = MANILA_TIME_ZONE) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (isValidDateOnly(trimmed)) return trimmed
    if (!trimmed) return ''
    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? '' : partsInTimeZone(parsed, timeZone)
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return partsInTimeZone(value, timeZone)
  }

  return ''
}

export function todayDateOnly(now = new Date()) {
  return partsInTimeZone(now, MANILA_TIME_ZONE)
}

export function shiftDateOnly(value: string, days: number) {
  if (!isValidDateOnly(value)) return ''
  const shifted = new Date(`${value}T00:00:00.000Z`)
  shifted.setUTCDate(shifted.getUTCDate() + days)
  return shifted.toISOString().slice(0, 10)
}

export function birthdateMaximum(now = new Date()) {
  return shiftDateOnly(todayDateOnly(now), -1)
}

export function opportunityDeadlineMinimum(now = new Date()) {
  return shiftDateOnly(todayDateOnly(now), 1)
}

export function formatDateOnly(value: unknown, options?: Intl.DateTimeFormatOptions) {
  const dateOnly = toDateOnly(value)
  if (!dateOnly) return ''
  const [year, month, day] = dateOnly.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', options ?? {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}
