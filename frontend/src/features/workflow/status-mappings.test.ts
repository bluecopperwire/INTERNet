import { describe, expect, it } from 'vitest'
import {
  applicationDisplayStatus,
  assignmentCandidateResponse,
  isTerminalApplication,
  isTerminalReferral,
  referralDisplayStatus,
} from './status-mappings'

describe('contextual workflow status mappings', () => {
  it.each([
    ['withdrawn', 'Withdrawn'],
    ['expired', 'Expired'],
    ['rejected_for_referral', 'Rejected'],
    ['submitted', 'For Review'],
    ['under_review', 'Under Review'],
  ] as const)('maps application %s distinctly to %s', (applicationStatus, expected) => {
    expect(applicationDisplayStatus({ applicationStatus })).toBe(expected)
  })

  it.each([
    ['withdrawn', 'Withdrawn'],
    ['expired', 'Expired'],
  ] as const)('gives referral lifecycle %s precedence over response aliases', (referralStatus, expected) => {
    expect(referralDisplayStatus({
      referralStatus,
      companyResponse: 'accepted',
      studentResponse: 'accepted',
    })).toBe(expected)
  })

  it('keeps rejected, withdrawn, and expired as separate filterable display values', () => {
    const values = [
      applicationDisplayStatus({ applicationStatus: 'rejected_for_referral' }),
      applicationDisplayStatus({ applicationStatus: 'withdrawn' }),
      applicationDisplayStatus({ applicationStatus: 'expired' }),
    ]
    expect(values).toEqual(['Rejected', 'Withdrawn', 'Expired'])
    expect(values.filter((status) => status === 'Rejected')).toEqual(['Rejected'])
  })

  it.each([
    ['pending', 'Pending'],
    ['accepted', 'Accepted'],
    ['declined', 'Rejected'],
  ] as const)('maps assignment-candidate student response %s to %s', (response, expected) => {
    expect(assignmentCandidateResponse(response)).toBe(expected)
  })

  it('limits hide eligibility to terminal application and referral states', () => {
    expect(['rejected_for_referral', 'closed', 'withdrawn', 'expired'].every(isTerminalApplication)).toBe(true)
    expect(['submitted', 'under_review', 'approved_for_referral'].some(isTerminalApplication)).toBe(false)
    expect(['closed', 'withdrawn', 'expired'].every(isTerminalReferral)).toBe(true)
    expect(['sent', 'under_review'].some(isTerminalReferral)).toBe(false)
  })
})
