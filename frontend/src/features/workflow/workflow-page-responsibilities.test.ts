import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readSource = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

function section(source: string, start: string, end: string): string {
  return source.slice(source.indexOf(start), source.indexOf(end))
}

function headings(source: string): string[] {
  return [...source.matchAll(/<th>([^<]+)<\/th>/g)].map((match) => match[1])
}

describe('workflow page responsibility boundaries', () => {
  it('keeps QC PESO Review Applicants as the exact active decision queue', () => {
    const source = readSource('../qcpeso/pages/ApplicantManagementPages.tsx')
    const queue = section(source, 'export function ReviewApplicantsPage', 'export function ApplicationsHistoryPage')
    expect(headings(queue)).toEqual([
      'Student Name', 'Company', 'Job Title', 'Program / Strand', 'Application Date', 'Action',
    ])
    expect(queue).toContain("['submitted', 'under_review']")
    expect(queue).toContain('<Eye size={16} />Review')
    expect(queue).not.toContain('Delete</button>')
  })

  it('exposes Applications History and redirects both legacy Track Referrals routes', () => {
    const pageSource = readSource('../qcpeso/pages/ApplicantManagementPages.tsx')
    const history = section(pageSource, 'export function ApplicationsHistoryPage', 'function DocumentList')
    const app = readSource('../../App.tsx')
    const sidebar = readSource('../qcpeso/components/QCPesoSidebar.tsx')
    expect(sidebar).toContain('Applications History')
    expect(sidebar).not.toContain('Track Referrals')
    expect(app).toContain('path="manage-applicants/history"')
    expect(app).toContain('path="manage-applicants/referrals" element={<Navigate to="/qcpeso/manage-applicants/history" replace />}')
    expect(app).toContain('path="manage-applicants/referrals/:id" element={<Navigate to="/qcpeso/manage-applicants/history" replace />}')
    expect(headings(history)).toEqual([
      'Student Name', 'Company', 'Job Title', 'Program / Strand',
      'Application Date', 'Referral Date', 'Status', 'Action',
    ])
    expect(history).toContain('APPLICATION_ONGOING_STATUSES.includes')
    expect(history).toContain('APPLICATION_CLOSED_STATUSES.includes')
    expect(history).toContain('<Eye size={16} />View')
    expect(pageSource).toContain('return <ReviewApplicantDetailsPage readOnly />')
  })

  it('keeps employer Review Referrals to the exact queue columns and statuses', () => {
    const source = readSource('../employer/pages/ApplicantsPage.tsx')
    const queue = section(source, 'export function ApplicantsPage', 'export function ReferralsHistoryPage')
    expect(headings(queue)).toEqual([
      'Student Name', 'Job Title', 'Program / Strand', 'Application Date',
      'Referral Date', 'Status', 'Action',
    ])
    expect(queue).toContain("['All', 'For Review', 'Under Review', 'For Interview']")
    expect(queue).toContain('<span>Review</span>')
    expect(queue).not.toContain('Delete</button>')
  })

  it('keeps Referrals History read-only except terminal scoped deletion', () => {
    const listSource = readSource('../employer/pages/ApplicantsPage.tsx')
    const history = listSource.slice(listSource.indexOf('export function ReferralsHistoryPage'))
    const details = readSource('../employer/pages/ReviewApplicantPage.tsx')
    expect(headings(history)).toEqual([
      'Student Name', 'Job Title', 'Program / Strand', 'Application Date',
      'Referral Date', 'Status', 'Action',
    ])
    expect(history).toContain('REFERRAL_ONGOING_STATUSES.includes')
    expect(history).toContain('REFERRAL_CLOSED_STATUSES.includes')
    expect(history).toContain('referral.canHide &&')
    expect(details).toContain('return <ReviewApplicantPage readOnly />')
    expect(details).toContain('readOnly && isTerminalReferral(applicant.referralStatus)')
  })

  it('keeps Create Internship Assignment to the exact actionable columns', () => {
    const source = readSource('../employer/pages/InternshipWorkflowPages.tsx')
    const queue = section(source, 'export function CreateInternshipAssignmentPage', 'export function ReviewInternshipAssignmentPage')
    expect(headings(queue)).toEqual([
      'Student Name', 'Job Title', 'Acceptance Date', 'Action',
    ])
    expect(queue).toContain('Create Internship Assignment</button>')
    expect(queue).not.toContain('Student Response')
    expect(queue).not.toContain('Delete</button>')
  })

  it('removes every frontend acceptance-reversal call and control', () => {
    const api = readSource('../employer/services/employer-api.service.ts')
    const service = readSource('../employer/services/employer.service.ts')
    const review = readSource('../employer/pages/ReviewApplicantPage.tsx')
    const assignment = readSource('../employer/pages/InternshipWorkflowPages.tsx')
    for (const source of [api, service, review, assignment]) {
      expect(source).not.toMatch(/withdrawAcceptance|withdraw-acceptance|Withdraw Acceptance|Change to Rejected/)
    }
  })
})
