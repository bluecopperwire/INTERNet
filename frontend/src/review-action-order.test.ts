import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(path, 'utf8')

describe('active review action order', () => {
  it('orders QC PESO applicant actions as View, Reject, Refer', () => {
    const source = readSource('src/features/qcpeso/pages/ApplicantManagementPages.tsx')
    const actions = source.slice(
      source.indexOf('{!readOnly && (', source.indexOf('export function ReviewApplicantDetailsPage')),
      source.indexOf('{readOnly && (', source.indexOf('export function ReviewApplicantDetailsPage')),
    )

    expect(actions.indexOf('View Opportunity')).toBeLessThan(actions.indexOf('Reject Applicant'))
    expect(actions.indexOf('Reject Applicant')).toBeLessThan(actions.indexOf('Refer Applicant'))
    expect(actions).toContain("isUpdating ? 'Referring...' : 'Refer Applicant'")
  })

  it('orders Company referral actions as Schedule, Reject, Accept', () => {
    const source = readSource('src/features/employer/pages/ReviewApplicantPage.tsx')
    const actions = source.slice(source.indexOf('{hasWorkflowActions && ('), source.indexOf('</section>', source.indexOf('{hasWorkflowActions && (')))

    expect(actions.indexOf('Schedule Interview')).toBeLessThan(actions.indexOf('Reject Referral'))
    expect(actions.indexOf('Reject Referral')).toBeLessThan(actions.indexOf('Accept Referral'))
  })
})
