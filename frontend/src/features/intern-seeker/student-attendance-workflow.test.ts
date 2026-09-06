import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { StudentAttendanceResponse } from '../../types/api'
import { buildCalendarDays, formatSummaryHours, getTodayTag } from './utils/attendance-display'

const attendance = (overrides: Partial<StudentAttendanceResponse['assignment']> = {}): StudentAttendanceResponse => ({
  assignment: {
    internshipAssignmentId: 4, companyName: 'Acme', jobTitle: 'Developer Intern', workingDays: [1, 3, 5], requiredMinutes: 12000, requiredHours: 200, totalRenderedMinutes: 480, totalRenderedHours: 8, remainingMinutes: 11520, remainingHours: 192, startDate: '2026-09-02', expectedEndDate: '2026-09-03', endDate: null, endedAt: null, startShift: '08:00', endShift: '17:00', assignmentStatus: 'ongoing', ...overrides,
  },
  today: null,
  records: [
    { attendanceRecordId: 1, date: '2026-09-04', status: 'present', timeIn: '07:45', timeOut: '18:00', renderedMinutes: 555 },
    { attendanceRecordId: 2, date: '2026-09-07', status: 'absent', timeIn: null, timeOut: null, renderedMinutes: 0 },
    { attendanceRecordId: 3, date: '2026-09-09', status: 'incomplete', timeIn: '08:00', timeOut: null, renderedMinutes: 0 },
  ],
  summary: { daysPresent: 1, daysAbsent: 1, renderedMinutes: 555, remainingMinutes: 11445 },
})

describe('Phase 3 Student Attendance workflow', () => {
  it('derives only the approved Today status tags', () => {
    expect(getTodayTag('pending', true, null)).toBe('Not Available')
    expect(getTodayTag('ongoing', false, null)).toBe('No Work Day')
    expect(getTodayTag('ongoing', true, null)).toBe('Not Clocked In')
    expect(getTodayTag('ongoing', true, { attendanceRecordId: 1, date: '2026-09-04', attendanceStatus: 'present', timeIn: '08:00', timeOut: null, renderedMinutes: 0 })).toBe('Clocked In')
    expect(getTodayTag('ongoing', true, { attendanceRecordId: 1, date: '2026-09-04', attendanceStatus: 'present', timeIn: '08:00', timeOut: '17:00', renderedMinutes: 480 })).toBe('Clocked Out')
    expect(getTodayTag('ongoing', true, { attendanceRecordId: 2, date: '2026-09-04', attendanceStatus: 'absent', timeIn: null, timeOut: null, renderedMinutes: 0 })).toBe('Not Clocked In')
    expect(getTodayTag('ongoing', true, { attendanceRecordId: 3, date: '2026-09-04', attendanceStatus: 'incomplete', timeIn: '08:00', timeOut: null, renderedMinutes: 0 })).toBe('Not Clocked In')
    expect(getTodayTag('complete_company', true, null)).toBe('Not Available')
  })

  it('marks exact workdays and lets Present, Absent, and Incomplete override them', () => {
    const days = buildCalendarDays(attendance(), new Date(2026, 8, 1))
    const byDate = new Map(days.map((day) => [day.date, day.status]))
    expect(byDate.get('2026-09-01')).toBeUndefined()
    expect(byDate.get('2026-09-04')).toBe('present')
    expect(byDate.get('2026-09-07')).toBe('absent')
    expect(byDate.get('2026-09-09')).toBe('incomplete')
    expect(byDate.get('2026-09-11')).toBe('workday')
  })

  it('stops future gray workdays at the actual operational end', () => {
    const days = buildCalendarDays(attendance({ endDate: '2026-09-10', assignmentStatus: 'cancelled' }), new Date(2026, 8, 1))
    const byDate = new Map(days.map((day) => [day.date, day.status]))
    expect(byDate.get('2026-09-02')).toBe('workday')
    expect(byDate.get('2026-09-09')).toBe('incomplete')
    expect(byDate.get('2026-09-11')).toBeUndefined()
  })

  it('keeps future workdays after Expected End gray for a Pending assignment', () => {
    const days = buildCalendarDays(attendance({ assignmentStatus: 'pending' }), new Date(2026, 8, 1))
    const byDate = new Map(days.map((day) => [day.date, day.status]))
    expect(byDate.get('2026-09-11')).toBe('workday')
  })

  it('formats summary hour totals as unitless numbers', () => {
    expect(formatSummaryHours(0)).toBe('0')
    expect(formatSummaryHours(555)).toBe('9.25')
    expect(formatSummaryHours(12000)).toBe('200')
  })

  it('contains the exact summary/history labels, filters, columns, routes, and no legacy Late UI', () => {
    const page = readFileSync('src/features/intern-seeker/pages/AttendancePage.tsx', 'utf8')
    const history = readFileSync('src/features/intern-seeker/pages/AttendanceHistoryPage.tsx', 'utf8')
    const sharedHistory = readFileSync('src/components/AttendanceHistoryView.tsx', 'utf8')
    const styles = readFileSync('src/features/intern-seeker/pages/AttendancePage.module.css', 'utf8')
    const app = readFileSync('src/App.tsx', 'utf8')
    for (const label of ['Days Present', 'Days Absent', 'Rendered Hours', 'Remaining Hours', 'View Attendance History']) expect(page).toContain(label)
    const summarySource = page.slice(page.indexOf('function Summary('), page.indexOf('function AttendanceCalendar('))
    expect(summarySource.match(/\.padStart\(2, '0'\)/g)).toHaveLength(4)
    expect(page.indexOf('Assignment Status')).toBeLessThan(page.indexOf('Attendance Status'))
    expect(page).toContain('styles.statusGroup')
    expect(page).not.toContain('formatMinutes(summary.renderedMinutes)')
    expect(history).toContain('AttendanceHistoryView')
    for (const column of ['Date', 'Clock In Time', 'Clock Out Time', 'Rendered Time', 'Attendance Status']) expect(sharedHistory).toContain(column)
    for (const filter of ['>All<', 'Present', 'Absent', 'Incomplete']) expect(sharedHistory).toContain(filter)
    expect(history).toContain('[5, 10, 15]')
    expect(app).toContain('attendance-history/:assignmentId')
    expect(page).not.toContain('View Internship Details')
    expect(page).not.toContain('Late')
    expect(styles).toMatch(/\.checkOutButton:hover:not\(:disabled\)\s*\{\s*color:\s*#ffffff;/)
    expect(page).toContain('<i className={styles.incompleteDot} />Incomplete')
    expect(styles).toMatch(/\.calendarDay\s*\{[^}]*color:\s*var\(--tracking-purple\);/)
    expect(styles).toMatch(/\.present\s*\{[^}]*background:\s*#22c55e;/)
    expect(styles).toMatch(/\.incomplete\s*\{[^}]*background:\s*var\(--tracking-yellow\);/)
    expect(styles).toMatch(/\.absent\s*\{[^}]*background:\s*#df1c22;/)
    expect(styles).toMatch(/\.present,\s*\.incomplete,\s*\.absent\s*\{\s*color:\s*#ffffff;/)
  })
})
