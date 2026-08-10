import type { AttendanceRecord, Holiday, TodayAttendance } from '../types/attendance.types'

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
  scheduleStart: '9:00 AM',
  scheduleEnd: '6:00 PM',
  location: 'Tech Hub Office, Floor 5',
}

export const MOCK_HOLIDAYS: Holiday[] = [
  { id: 'holiday-1', name: 'National Heroes Day', date: '2026-08-31' },
  { id: 'holiday-2', name: 'Bonifacio Day', date: '2026-11-30' },
  { id: 'holiday-3', name: 'Christmas Day', date: '2026-12-25' },
]
