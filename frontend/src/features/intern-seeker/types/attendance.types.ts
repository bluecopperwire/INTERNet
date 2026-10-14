export type AttendanceDayStatus = 'present' | 'absent' | 'incomplete'

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
  assignmentId: number
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
  daysAbsent: number
  renderedMinutes: number
  remainingMinutes: number
}

export interface AttendanceMonth {
  year: number
  month: number
  records: AttendanceRecord[]
  summary: AttendanceSummary
}
