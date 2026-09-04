import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { formatAttendanceDate, formatAttendanceDuration, formatAttendanceWholeHours } from './utils/attendance-format'

const readSource = (path: string) => readFileSync(path, 'utf8')

describe('cross-role attendance history presentation', () => {
  it('uses the requested shared date, duration, and summary formats', () => {
    expect(formatAttendanceDate('2026-09-03')).toBe('Sep 3, 2026')
    expect(formatAttendanceDuration(470)).toBe('7 hours, 50 minutes')
    expect(formatAttendanceDuration(60)).toBe('1 hour, 0 minutes')
    expect(formatAttendanceWholeHours(555)).toBe(9)
    expect(formatAttendanceWholeHours((200 * 60) + 59)).toBe(200)
  })

  it('uses one shared layout and profile summary for every role', () => {
    const student = readSource('src/features/intern-seeker/pages/AttendanceHistoryPage.tsx')
    const employer = readSource('src/features/employer/pages/AttendanceInternshipDetailsPage.tsx')
    const qcpesoFile = readSource('src/features/qcpeso/pages/InternManagementPages.tsx')
    const qcpeso = qcpesoFile.slice(qcpesoFile.indexOf('export function QCPesoAttendanceDetailsPage'))
    const sharedView = readSource('src/components/AttendanceHistoryView.tsx')
    const profileSummary = readSource('src/components/AttendanceProfileSummary.tsx')

    for (const page of [student, employer, qcpeso]) {
      expect(page).toContain('AttendanceHistoryView')
    }
    expect(sharedView).toContain('formatAttendanceWholeHours')
    expect(sharedView).toContain('formatAttendanceDate')
    expect(sharedView).toContain('formatAttendanceDuration')
    expect(sharedView.indexOf('Attendance date')).toBeLessThan(sharedView.indexOf('Attendance status'))
    expect(profileSummary).toContain('INTERN AS')
  })

  it('preserves source-aware back destinations for every entry point', () => {
    const sources = [
      readSource('src/features/intern-seeker/pages/AttendancePage.tsx'),
      readSource('src/features/intern-seeker/pages/InternshipHistoryDetailsPage.tsx'),
      readSource('src/features/employer/pages/AttendanceMonitoringPage.tsx'),
      readSource('src/features/employer/pages/InternshipHistoryDetailsPage.tsx'),
      readSource('src/features/qcpeso/pages/InternManagementPages.tsx'),
    ]
    const destinationPages = [
      readSource('src/features/intern-seeker/pages/AttendanceHistoryPage.tsx'),
      readSource('src/features/employer/pages/AttendanceInternshipDetailsPage.tsx'),
      readSource('src/features/qcpeso/pages/InternManagementPages.tsx'),
    ]

    for (const source of sources) expect(source).toContain('attendanceHistoryBackPath')
    for (const label of ['Back to Attendance', 'Back to Monitor Attendance', 'Back to Internship Details']) {
      expect(destinationPages.some((source) => source.includes(label))).toBe(true)
    }
  })
})
