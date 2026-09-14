import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('Phase 2 Student internship workflow responsibilities', () => {
  it('orders My Tracking and installs independent current/history routes', () => {
    const tabs = readSource('./components/TrackingTabs.tsx')
    const app = readSource('../../App.tsx')
    const labels = ['My Requirements', 'My Applications', 'My Internship', 'My Attendance', 'My Internship History']
    const compactTabs = tabs.replace(/\s+/g, '')
    const positions = labels.map((label) => compactTabs.indexOf(`>${label.replaceAll(' ', '')}<`))
    expect(positions.every((position) => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    const compactApp = app.replace(/\s+/g, '')
    expect(compactApp).toContain('path="internship"element={<InternshipPage/>}')
    expect(compactApp).toContain('path="internship-history"element={<InternshipHistoryPage/>}')
    expect(app).toContain('path="internship-history/:assignmentId"')
    expect(app.indexOf('path="internship-history/:assignmentId"')).toBeLessThan(app.indexOf('<Route element={<TrackingLayout />}>'))
    expect(compactApp).toContain('path="internship-details"element={<Navigateto="/intern-seeker/internship"replace/>}')
  })

  it('renders the approved current empty state and Student-friendly details', () => {
    const details = readSource('./components/StudentInternshipDetails.tsx')
    expect(details).toContain('No active internship')
    expect(details).toContain('No Active Internship')
    expect(details).toContain('No active internship yet')
    expect(details).toContain('There is currently no active internship to track.')
    expect(details).toContain('displayValue(assignment.jobTitle)')
    expect(details).toContain('displayValue(assignment.companyName)')
    expect(details).toMatch(/hasEnded\s*\?\s*["']End Date["']\s*:\s*["']Expected End Date["']/)
    expect(details).toMatch(/["']Required Hours["']\s*,\s*formatMinutes\(assignment\.requiredMinutes\)/)
    expect(details).not.toContain('Target Hours')
  })

  it('uses the reference details layout with the requested internship sections', () => {
    const details = readSource('./components/StudentInternshipDetails.tsx')
    const profileSummary = readSource('../../components/AttendanceProfileSummary.tsx')
    for (const heading of ['Internship Details', 'Intern Information', 'Assignment Information', 'Schedule Information', 'Status Information']) {
      expect(details).toContain(heading)
    }
    for (const label of [
      'Full Name',
      'Program / Strand',
      'Year Level',
      'School',
      'Company',
      'Job Title',
      'Required Hours',
      'Working Days',
      'Start Date',
      'Expected End Date',
      'Shift Start',
      'Shift End',
      'Status',
      'Rendered Hours',
      'Remaining Hours',
    ]) {
      expect(details).toContain(label)
    }
    expect(details).toContain('AttendanceProfileSummary')
    expect(profileSummary).toContain('INTERN AS')
    expect(profileSummary).not.toContain('APPLIED FOR')
    expect(profileSummary).not.toContain('Applied on')
  })

  it('shows only company completion or cancellation remarks as outcome cards', () => {
    const details = readSource('./components/StudentInternshipDetails.tsx')
    expect(details).toContain('Internship Completion Remark')
    expect(details).toContain('Internship Cancellation Remark')
    expect(details).not.toContain('Student Withdrawal Remark')
    expect(details).toContain('assignment.endDate ?? assignment.endedAt')
  })

  it('keeps a finalized assignment labeled Finalized even when an earlier outcome remark exists', () => {
    const details = readSource('./components/StudentInternshipDetails.tsx')
    expect(details).toContain('const statusLabel = studentAssignmentStatus(assignment.assignmentStatus)')
    expect(details).not.toContain('resolveStudentFacingStatus')
  })

  it('guides the Student through Company completion review and QC PESO finalization', () => {
    const page = readSource('./pages/InternshipPage.tsx')
    expect(page).toContain("complete_company: 'Internship marked as complete. Review the training establishment (company) to proceed with internship finalization.'")
    expect(page).toContain("complete_student: 'Training establishment already reviewed. Please wait for QC PESO to finalize your internship.'")
    expect(page).toContain('CircleAlert')
    expect(page.indexOf('styles.completionNotice')).toBeLessThan(page.indexOf('<StudentInternshipDetails assignment={assignment}'))
  })

  it('keeps workflow actions status-aware with required modal inputs', () => {
    const details = readSource('./components/StudentInternshipDetails.tsx')
    expect(details).toMatch(/assignment\.assignmentStatus === ["']complete_company["']/)
    expect(details.replace(/\s+/g, '')).toMatch(/\[['"]pending['"],['"]ongoing['"]\]\.includes/)
    expect(details).toContain('Reason for Withdrawal')
    expect(details).toContain('[1, 2, 3, 4, 5]')
    expect(details).toContain('Submit Review')
    expect(details).toContain('Withdraw Internship')
    expect(details).toMatch(/>\s*Close\s*<\/button>/)
    const withdrawalDialog = details.slice(details.indexOf("modal === 'withdraw'"), details.indexOf("modal === 'review'"))
    expect(withdrawalDialog.indexOf('Close')).toBeLessThan(withdrawalDialog.lastIndexOf('Withdraw Internship'))
    const reviewDialog = details.slice(details.indexOf("modal === 'review'"))
    expect(reviewDialog.indexOf('Close')).toBeLessThan(reviewDialog.indexOf('Submit Review'))
  })

  it('uses exact history columns, server pagination, and no Delete action', () => {
    const page = readSource('./pages/InternshipHistoryPage.tsx')
    const headings = [...page.matchAll(/<th>([^<]+)<\/th>/g)].map((match) => match[1])
    expect(headings).toEqual(['Company', 'Job Title', 'Status', 'Action'])
    expect(page).toContain('const PAGE_SIZES = [5, 10, 15]')
    expect(page).toContain('studentApiService.getInternshipHistory(studentId, page, limit, {')
    expect(page).toContain('placeholder="Search company or job title..."')
    expect(page).toContain('All Statuses')
    expect(page).toContain('No internship history found')
    expect(page).toContain('<Eye size={15} />View')
    expect(page).not.toContain('Delete')
  })

  it('removes Attendance coupling and provides a no-current empty state', () => {
    const attendance = readSource('./pages/AttendancePage.tsx')
    expect(attendance).not.toContain('View Internship Details')
    expect(attendance).not.toContain('/intern-seeker/internship-details')
    expect(attendance).toContain('No active internship yet')
    expect(attendance).toContain('There is currently no active internship to track.')
  })

  it('reuses the My Internship feedback design for Attendance errors', () => {
    const attendance = readSource('./pages/AttendancePage.tsx')
    expect(attendance).toContain("import internshipStyles from './StudentInternshipPages.module.css'")
    expect(attendance).toContain('className={internshipStyles.feedback} role="alert"')
    expect(attendance).not.toContain('className={styles.error}')
  })

  it('keeps Apply clickable and shows blocked eligibility as an error toast', () => {
    const opportunity = readSource('./components/OpportunityDetail.tsx')
    expect(opportunity).toContain('getApplicationEligibility(studentId)')
    expect(opportunity).toContain('disabled={isCheckingEligibility}')
    expect(opportunity).toContain('showErrorToast(applicationBlockMessage ?? APPLICATION_BLOCKED_FALLBACK)')
    expect(opportunity).not.toContain('styles.applyBlockedMessage')
  })
})
