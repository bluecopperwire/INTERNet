export type AttendanceDayStatus = 'present' | 'absent' | 'late'

export interface AttendanceRecord {
  date: string
  status: AttendanceDayStatus
  checkIn?: string
  checkOut?: string
}

export interface TodayAttendance {
  date: string
  status: 'not-checked-in' | 'checked-in' | 'checked-out'
  companyName: string
  workingDays: string
  shiftStart: string
  shiftEnd: string
  checkedInAt?: string
  checkedOutAt?: string
}

export interface InternshipDetails {
  companyName: string
  jobTitle: string
  workingDays: string
  requiredHours: number
  startDate: string
  expectedEndDate: string
  shiftStart: string
  shiftEnd: string
  status: 'Pending' | 'Ongoing' | 'Completed' | 'Withdrawn' | 'Cancelled'
  targetHours: number
  renderedHours: number
  remainingHours: number
}

export interface AttendanceSummary {
  daysPresent: number
  absences: number
  lateArrivals: number
  attendanceRate: number
}

export interface AttendanceMonth {
  year: number
  month: number
  records: AttendanceRecord[]
  summary: AttendanceSummary
}
