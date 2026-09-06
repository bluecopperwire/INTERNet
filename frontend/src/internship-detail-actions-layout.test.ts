import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(path, 'utf8')

describe('cross-role internship detail actions', () => {
  it('uses the Application History action dimensions and spacing', () => {
    const applicationStyles = readSource('src/features/employer/pages/ReviewApplicantPage.module.css')
    const companyStyles = readSource('src/features/employer/pages/MonitorInternshipDetailsPage.module.css')
    const studentDetailStyles = readSource('src/features/intern-seeker/components/StudentInternshipDetails.module.css')
    const studentPageStyles = readSource('src/features/intern-seeker/pages/StudentInternshipPages.module.css')

    for (const styles of [applicationStyles, companyStyles, studentDetailStyles]) {
      expect(styles).toMatch(/gap:\s*10px/)
      expect(styles).toMatch(/margin:\s*18px auto 0|margin-top:\s*18px/)
    }
    for (const styles of [applicationStyles, companyStyles, studentDetailStyles, studentPageStyles]) {
      expect(styles).toMatch(/min-height:\s*44px/)
      expect(styles).toMatch(/padding:\s*10px 18px/)
      expect(styles).toMatch(/border-radius:\s*7px/)
      expect(styles).toMatch(/font-size:\s*14px/)
      expect(styles).toMatch(/font-weight:\s*600/)
    }
  })

  it('groups multi-button history actions in one detached action area', () => {
    const companyHistory = readSource('src/features/employer/pages/InternshipHistoryDetailsPage.tsx')
    const qcpesoPages = readSource('src/features/qcpeso/pages/InternManagementPages.tsx')
    const companyActions = companyHistory.slice(companyHistory.indexOf('<footer className={styles.companyActions}>'), companyHistory.indexOf('</footer>', companyHistory.indexOf('<footer className={styles.companyActions}>')))
    const qcpesoHistoryActions = qcpesoPages.slice(qcpesoPages.indexOf('{history && ('), qcpesoPages.indexOf('{!history && ('))

    for (const actions of [companyActions, qcpesoHistoryActions]) {
      expect(actions).toContain('View Attendance History')
      expect(actions).toContain('Delete')
    }
  })

  it('keeps Student active-internship actions detached from the mother card', () => {
    const studentDetails = readSource('src/features/intern-seeker/components/StudentInternshipDetails.tsx')
    expect(studentDetails.indexOf('</section>')).toBeLessThan(studentDetails.indexOf('className={styles.workflowActions}'))
  })
})
