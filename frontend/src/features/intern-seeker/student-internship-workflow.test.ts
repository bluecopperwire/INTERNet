import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('Phase 2 Student internship workflow responsibilities', () => {
  it('orders My Tracking and installs independent current/history routes', () => {
    const tabs = readSource('./components/TrackingTabs.tsx')
    const app = readSource('../../App.tsx')
    const labels = ['Requirements', 'Application Status', 'Internship', 'Attendance', 'Internship History']
    const compactTabs = tabs.replace(/\s+/g, '')
    const positions = labels.map((label) => compactTabs.indexOf(`>${label.replaceAll(' ', '')}<`))
    expect(positions.every((position) => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    const compactApp = app.replace(/\s+/g, '')
    expect(compactApp).toContain('path="internship"element={<InternshipPage/>}')
    expect(compactApp).toContain('path="internship-history"element={<InternshipHistoryPage/>}')
    expect(app).toContain('path="internship-history/:assignmentId"')
    expect(compactApp).toContain('path="internship-details"element={<Navigateto="/intern-seeker/internship"replace/>}')
  })

  it('renders the approved current empty state and Student-friendly details', () => {
    const details = readSource('./components/StudentInternshipDetails.tsx')
    expect(details).toContain('No active internship')
    expect(details).toContain('No Active Internship')
    expect(details).toContain('No active internship yet')
    expect(details).toContain('There is currently no active internship to track.')
    expect(details).toContain('{assignment.jobTitle} at {assignment.companyName}')
    expect(details).toMatch(/hasEnded\s*\?\s*["']End Date["']\s*:\s*["']Expected End Date["']/)
    expect(details).toMatch(/["']Required Hours["']\s*,\s*formatMinutes\(assignment\.requiredMinutes\)/)
    expect(details).not.toContain('Target Hours')
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
  })

  it('uses exact history columns, server pagination, and no Delete action', () => {
    const page = readSource('./pages/InternshipHistoryPage.tsx')
    const headings = [...page.matchAll(/<th>([^<]+)<\/th>/g)].map((match) => match[1])
    expect(headings).toEqual(['Company', 'Job Title', 'Status', 'Action'])
    expect(page).toContain('const PAGE_SIZES = [5, 10, 15]')
    expect(page).toMatch(/getInternshipHistory\(\s*studentId,\s*page,\s*limit,?\s*\)/)
    expect(page).toContain('No internship history yet')
    expect(page).not.toContain('Delete')
  })

  it('removes Attendance coupling and provides a no-current empty state', () => {
    const attendance = readSource('./pages/AttendancePage.tsx')
    expect(attendance).not.toContain('View Internship Details')
    expect(attendance).not.toContain('/intern-seeker/internship-details')
    expect(attendance).toContain('No active internship yet')
    expect(attendance).toContain('There is currently no active internship to track.')
  })

  it('disables Apply with a finalization explanation while backend remains authoritative', () => {
    const opportunity = readSource('./components/OpportunityDetail.tsx')
    expect(opportunity).toContain('getCurrentInternship(studentId)')
    expect(opportunity).toContain('disabled={isCheckingInternship || hasCurrentInternship}')
    expect(opportunity.replace(/\s+/g, ' ')).toContain('You may apply again after QC PESO finalizes your current internship.')
  })
})
