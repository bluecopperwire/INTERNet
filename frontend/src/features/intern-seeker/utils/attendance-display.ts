import type { AssignmentStatus, StudentAttendanceResponse } from '../../../types/api'
import { formatAttendanceHours } from '../../../utils/attendance-format'

export function buildCalendarDays(data: StudentAttendanceResponse, month: Date) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstWeekday = new Date(year, monthIndex, 1).getDay()
  const count = new Date(year, monthIndex + 1, 0).getDate()
  const records = new Map(data.records.map((record) => [record.date, record.status]))
  const assignment = data.assignment!
  const terminalDate = assignment.endDate ?? null
  return [
    ...Array.from({ length: firstWeekday }, (_, index) => ({ key: `empty-${index}`, day: null, date: '', status: undefined })),
    ...Array.from({ length: count }, (_, index) => {
      const day = index + 1
      const date = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const isWorkday = date >= assignment.startDate && (!terminalDate || date <= terminalDate) && assignment.workingDays.includes(new Date(`${date}T00:00:00Z`).getUTCDay())
      const persisted = records.get(date)
      const status = persisted === 'present' ? 'present' : persisted === 'absent' ? 'absent' : persisted === 'incomplete' ? 'incomplete' : isWorkday ? 'workday' : undefined
      return { key: date, day, date, status }
    }),
  ]
}

export function getTodayTag(status: AssignmentStatus, isWorkday: boolean, today: StudentAttendanceResponse['today']) {
  if (status !== 'ongoing') return 'Not Available'
  if (!isWorkday) return 'No Work Day'
  if (today?.attendanceStatus === 'present' && today.timeIn && today.timeOut) return 'Clocked Out'
  if (today?.attendanceStatus === 'present' && today.timeIn) return 'Clocked In'
  return 'Not Clocked In'
}

export function formatSummaryHours(minutes: number): string {
  return formatAttendanceHours(minutes)
}
