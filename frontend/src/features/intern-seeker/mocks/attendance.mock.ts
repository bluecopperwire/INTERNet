import type { AttendanceRecord, InternshipDetails, TodayAttendance } from '../types/attendance.types'

const presentDays = [3, 4, 5, 6, 7, 11, 12, 13, 14, 17, 18, 19, 20, 21, 24, 25, 26, 27]

export const MOCK_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  ...presentDays.map((day): AttendanceRecord => ({
    date: `2026-08-${String(day).padStart(2, '0')}`,
    status: day === 6 || day === 18 ? 'late' : 'present',
    checkIn: day === 6 || day === 18 ? '9:14 AM' : '8:55 AM',
    checkOut: '6:00 PM',
  })),
  { date: '2026-08-28', status: 'absent' },
]

export const MOCK_TODAY_ATTENDANCE: TodayAttendance = {
  date: '2026-08-10',
  status: 'not-checked-in',
  companyName: 'ABC Company',
  workingDays: 'Weekdays',
  shiftStart: '9:00 AM',
  shiftEnd: '6:00 PM',
}

export const MOCK_INTERNSHIP_DETAILS: InternshipDetails = {
  assignmentId: 1,
  companyName: 'ABC Company',
  jobTitle: 'IT Intern',
  workingDays: 'Weekdays',
  requiredHours: 200,
  startDate: 'August 10, 2026',
  expectedEndDate: 'September 18, 2026',
  shiftStart: '9:00 AM',
  shiftEnd: '6:00 PM',
  status: 'Ongoing',
  targetHours: 200,
  renderedHours: 0,
  remainingHours: 200,
}
