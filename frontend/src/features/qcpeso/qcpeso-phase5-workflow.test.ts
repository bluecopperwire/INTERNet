import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('QC PESO Phase 5 workflow contracts', () => {
  const page = read('./pages/InternManagementPages.tsx')
  const sharedHistory = read('../../components/AttendanceHistoryView.tsx')

  it('has dedicated finalization and all-status history workflows', () => {
    for (const label of ['Awaiting Finalization', 'Completed Internships', 'Withdrawal Internships', 'Cancelled Internships']) expect(page).toContain(label)
    expect(page).toContain("const PAGE_SIZES = [5, 10, 15]")
    expect(page).toContain("['pending', 'ongoing', 'complete_company', 'complete_student', 'withdrawn', 'cancelled', 'finalized']")
    expect(page).toContain('Finalize Internship')
    expect(page).toMatch(/>Close<\/button>/)
  })

  it('uses the exact internship and attendance column contracts', () => {
    expect(page).toContain('<th>Student Name</th><th>Company</th><th>Job Title</th><th>Program / Strand</th><th>Status</th><th>Action</th>')
    expect(page).toContain('<th>Student Name</th><th>Company</th><th>Job Title</th><th>Program / Strand</th><th>Status</th><th>Action</th>')
    expect(page).toContain('AttendanceHistoryView')
    expect(sharedHistory).toContain('<th>Date</th><th>Clock In Time</th><th>Clock Out Time</th><th>Rendered Time</th><th>Attendance Status</th>')
  })

  it('shows status-specific QC review content and minute-based totals', () => {
    for (const text of ['Student Withdrawal Remark', 'Company Cancellation Remark', 'Company Review of the Student', 'Student Review of the Company']) expect(page).toContain(text)
    expect(page).toContain("${Number(value || 0).toLocaleString()} minutes")
  })
})
