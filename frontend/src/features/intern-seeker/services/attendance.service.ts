import { MOCK_ATTENDANCE_RECORDS, MOCK_HOLIDAYS, MOCK_TODAY_ATTENDANCE } from '../mocks/attendance.mock'
import type { AttendanceMonth, AttendanceRecord, AttendanceSummary, Holiday, TodayAttendance } from '../types/attendance.types'

const belongsToMonth = (record: AttendanceRecord, year: number, month: number) => {
  const [recordYear, recordMonth] = record.date.split('-').map(Number)
  return recordYear === year && recordMonth === month + 1
}

const getSummary = (records: AttendanceRecord[]): AttendanceSummary => {
  const daysPresent = records.filter(({ status }) => status === 'present' || status === 'late').length
  const absences = records.filter(({ status }) => status === 'absent').length
  const lateArrivals = records.filter(({ status }) => status === 'late').length
  const expectedDays = daysPresent + absences

  return {
    daysPresent,
    absences,
    lateArrivals,
    attendanceRate: expectedDays ? Math.round((daysPresent / expectedDays) * 100) : 0,
  }
}

export interface AttendanceService {
  getToday(): Promise<TodayAttendance>
  getMonth(year: number, month: number): Promise<AttendanceMonth>
  getUpcomingHolidays(fromDate: string): Promise<Holiday[]>
  checkIn(): Promise<TodayAttendance>
}

export const attendanceService: AttendanceService = {
  async getToday() {
    return structuredClone(MOCK_TODAY_ATTENDANCE)
  },
  async getMonth(year, month) {
    const records = MOCK_ATTENDANCE_RECORDS.filter((record) => belongsToMonth(record, year, month))
    return { year, month, records: structuredClone(records), summary: getSummary(records) }
  },
  async getUpcomingHolidays(fromDate) {
    return structuredClone(MOCK_HOLIDAYS.filter((holiday) => holiday.date >= fromDate))
  },
  async checkIn() {
    return { ...structuredClone(MOCK_TODAY_ATTENDANCE), status: 'checked-in', checkedInAt: '9:00 AM' }
  },
}
