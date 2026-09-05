import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('QC PESO Phase 5 workflow contracts', () => {
  const page = read('./pages/InternManagementPages.tsx')
  const sharedHistory = read('../../components/AttendanceHistoryView.tsx')
  const attendanceStyles = read('../employer/pages/AttendanceMonitoringPage.module.css')
  const internshipStyles = read('../employer/pages/MonitorInternshipPage.module.css')

  it('has dedicated finalization and all-status history workflows', () => {
    for (const label of ['Awaiting Finalization', 'Completed Internships', 'Withdrawn Internships', 'Cancelled Internships']) expect(page).toContain(label)
    expect(page).toContain("const PAGE_SIZES = [5, 10, 15]")
    expect(page).toContain("['pending', 'ongoing', 'complete_company', 'complete_student', 'withdrawn', 'cancelled', 'finalized']")
    expect(page).toContain('Finalize Internship')
    expect(page).toMatch(/>Close<\/button>/)
    const finalizeActions = page.slice(page.indexOf('detailStyles.modalActions'))
    expect(finalizeActions.indexOf('>Close</button>')).toBeLessThan(finalizeActions.indexOf('>Finalize Internship</button>'))
  })

  it('uses two-digit minimum formatting for all QC PESO summary cards', () => {
    expect(page).toContain("String(value).padStart(2, '0')")
  })

  it('uses concise and grouped filters with finalized-only history deletion', () => {
    expect(page).not.toContain('All Statuses')
    expect(page).toContain("statuses={['active', 'closed', ...ALL_STATUSES]}")
    expect(page).toContain("row.assignmentStatus === 'finalized'")
    expect(page).toContain('internshipStyles.rowActions')
    expect(page).toContain('internshipStyles.deleteButton')
    expect(page).toContain('ConfirmDeleteModal')
    expect(page).not.toContain('window.confirm')
    expect(internshipStyles).toContain('.deleteButton')
  })

  it('uses the exact internship and attendance column contracts', () => {
    expect(page).toContain('<th>Student Name</th><th>Company</th><th>Job Title</th><th>Program / Strand</th><th>Status</th><th>Action</th>')
    expect(page).toContain('<th>Student Name</th><th>Company</th><th>Job Title</th><th>Program / Strand</th><th>Status</th><th>Action</th>')
    expect(page).toContain('AttendanceHistoryView')
    expect(sharedHistory).toContain('<th>Date</th><th>Clock In Time</th><th>Clock Out Time</th><th>Rendered Time</th><th>Attendance Status</th>')
  })

  it('uses full-width summaries and readable horizontally scrollable tables', () => {
    expect(page).toContain('attendanceStyles.threeCards')
    expect(page).toContain('internshipStyles.historySummaryGrid')
    expect(page).toContain('wideStudentName')
    expect(page).toContain('attendanceStyles.qcpesoAttendanceTable')
    expect(page).not.toMatch(/<strong>\{row\.studentFullName\}<\/strong>/)
    expect(attendanceStyles).toMatch(/\.statusPill\s*\{[^}]*white-space:\s*nowrap/s)
    expect(attendanceStyles).toContain('.qcpesoAttendanceTable')
    expect(internshipStyles).toContain('.qcpesoInternshipTable')
    expect(internshipStyles).toContain('.wideStudentNameTable')
  })

  it('shows status-specific QC review content and minute-based totals', () => {
    for (const text of ['Student Withdrawal Remark', 'Company Cancellation Remark', 'Company Review of the Student', 'Student Review of the Company']) expect(page).toContain(text)
    expect(page).toContain("${Number(value || 0).toLocaleString()} minutes")
  })
})
