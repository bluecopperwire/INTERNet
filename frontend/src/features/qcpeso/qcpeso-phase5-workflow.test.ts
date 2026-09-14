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
    expect(finalizeActions.indexOf('>Close</button>')).toBeLessThan(finalizeActions.indexOf("'Finalize Internship'"))
  })

  it('uses two-digit minimum formatting for all QC PESO summary cards', () => {
    expect(page).toContain("String(value).padStart(2, '0')")
  })

  it('shows complete account summaries on both monitor-user pages', () => {
    const monitorUsers = read('./pages/MonitorUsersPage.tsx')
    const service = read('./services/qcpeso.service.ts')

    for (const label of ['Total', 'Active', 'Suspended']) {
      expect(monitorUsers).toContain(`${label} \${isStudents ? 'Students' : 'Employers'}`)
    }
    expect(monitorUsers).toContain("String(value).padStart(2, '0')")
    expect(service).toContain('qcpesoApiService.getStudents({ page, limit: 100 })')
    expect(service).toContain('qcpesoApiService.getEmployers({ page, limit: 100 })')
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

  it('uses the shared internship details layout with QC-only actions and outcome sections', () => {
    for (const text of ['Internship Details', 'Intern Information', 'Assignment Information', 'Schedule Information', 'Status Information']) expect(page).toContain(text)
    for (const text of ['Internship Withdrawal Remark', 'Internship Cancellation Remark', 'Company Review about the Student', 'Student Review about the Company']) expect(page).toContain(text)
    for (const field of ['Full Name', 'Program / Strand', 'Year Level', 'School', 'Company', 'Job Title', 'Required Hours', 'Working Days', 'Start Date', 'End Date', 'Shift Start', 'Shift End', 'Status', 'Rendered Hours', 'Remaining Hours']) expect(page).toContain(field)
    expect(page).toContain('AttendanceProfileSummary')
    expect(page).toContain('studentDetailStyles.detailsShell')
    expect(page).toContain('studentDetailStyles.sectionStack')
    expect(page).toContain('detailStyles.reviewStars')
    expect(page).toContain('Star Rating:')
    expect(page).toContain('Remark:')
    expect(page).toContain("if (effectiveStatus === 'complete_company')")
    expect(page).toContain("if (effectiveStatus === 'complete_student')")
    expect(page).not.toContain("['complete_company', 'complete_student'].includes(effectiveStatus)")
    expect(read('../employer/pages/MonitorInternshipDetailsPage.module.css')).toMatch(/\.reviewRemark\s*\{[^}]*border-top:\s*1px solid #e2e8f0/s)
    expect(page).toContain('Back to Finalize Internships')
    expect(page).toContain('disabled={!data.status.canFinalize || busy}')
    expect(page).toContain('data.status.canDelete')
    expect(page).toContain('className={detailStyles.companyActions}')
    expect(page).toContain('qcpesoApiService.hideFinalizedInternship(assignmentId)')
    expect(page).toContain('className={detailStyles.deleteRecordButton}')
    expect(page).not.toContain('Mark Internship as Complete')
    expect(page).not.toContain('Cancel Internship')
  })
})
