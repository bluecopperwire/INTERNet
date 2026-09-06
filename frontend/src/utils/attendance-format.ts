export function formatAttendanceHours(minutes: number): string {
  return new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 }).format(Math.max(0, Number(minutes) || 0) / 60)
}

export function formatAttendanceWholeHours(minutes: number): number {
  return Math.floor(Math.max(0, Number(minutes) || 0) / 60)
}

export function formatAttendanceDuration(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0))
  const hours = Math.floor(safeMinutes / 60)
  const remainder = safeMinutes % 60
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}, ${remainder} ${remainder === 1 ? 'minute' : 'minutes'}`
}

export function formatAttendanceDate(value?: string | null): string {
  if (!value) return '-'
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const parsed = new Date(dateOnly ? `${value}T00:00:00+08:00` : value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}
