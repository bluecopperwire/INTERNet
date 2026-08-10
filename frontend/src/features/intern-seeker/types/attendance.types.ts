export type AttendanceDayStatus = 'present' | 'absent' | 'late' | 'holiday'

export interface AttendanceRecord {
  date: string
  status: AttendanceDayStatus
  checkIn?: string
  checkOut?: string
}

export interface TodayAttendance {
  date: string
  status: 'not-checked-in' | 'checked-in' | 'checked-out'
  scheduleStart: string
  scheduleEnd: string
  location: string
  checkedInAt?: string
  checkedOutAt?: string
}

export interface AttendanceSummary {
  daysPresent: number
  absences: number
  lateArrivals: number
  attendanceRate: number
}

export interface Holiday {
  id: string
  name: string
  date: string
}

export interface AttendanceMonth {
  year: number
  month: number
  records: AttendanceRecord[]
  summary: AttendanceSummary
}
