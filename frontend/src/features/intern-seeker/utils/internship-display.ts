import type { AssignmentStatus } from '../../../types/api'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function studentAssignmentStatus(status: AssignmentStatus): string {
  if (status === 'complete_company' || status === 'complete_student') {
    return 'Completed'
  }
  const labels: Record<AssignmentStatus, string> = {
    pending: 'Pending',
    ongoing: 'Ongoing',
    complete_company: 'Completed',
    complete_student: 'Completed',
    withdrawn: 'Withdrawn',
    cancelled: 'Cancelled',
    finalized: 'Finalized',
  }
  return labels[status]
}

export function formatWorkingDays(days: number[]): string {
  return days
    .map((day) => DAY_NAMES[day])
    .filter(Boolean)
    .join(', ')
}

export function formatMinutes(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safeMinutes / 60)
  const remainder = safeMinutes % 60
  if (remainder === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
  if (hours === 0) return `${remainder} ${remainder === 1 ? 'minute' : 'minutes'}`
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}, ${remainder} ${remainder === 1 ? 'minute' : 'minutes'}`
}

export function formatAssignmentDate(value?: string | null): string {
  if (!value) return 'Not specified'
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const parsed = new Date(dateOnly ? `${value}T00:00:00+08:00` : value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}

export function formatShift(value: string): string {
  const [hours, minutes] = value.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}

export const assignmentHasEnded = (status: AssignmentStatus) => !['pending', 'ongoing'].includes(status)
