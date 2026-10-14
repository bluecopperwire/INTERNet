import { describe, expect, it } from 'vitest'
import {
  APPLICATION_CLOSED_STATUSES,
  APPLICATION_ONGOING_STATUSES,
  applicationDisplayStatus,
  applicationHistoryStatus,
  assignmentCandidateResponse,
  isTerminalApplication,
  isTerminalReferral,
  referralDisplayStatus,
  referralHistoryStatus,
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

describe('workflow history status mappings', () => {
  it.each([
    [{ applicationStatus: 'submitted' }, 'For Review (QC PESO)'],
    [{ applicationStatus: 'under_review' }, 'Under Review (QC PESO)'],
    [{ applicationStatus: 'rejected_for_referral' }, 'Rejected (QC PESO)'],
    [{ applicationStatus: 'approved_for_referral', referralStatus: 'sent', companyResponse: 'pending', studentResponse: 'pending' }, 'For Review (Employer)'],
    [{ applicationStatus: 'approved_for_referral', referralStatus: 'under_review', companyResponse: 'pending', studentResponse: 'pending' }, 'Under Review (Employer)'],
    [{ applicationStatus: 'approved_for_referral', referralStatus: 'under_review', companyResponse: 'for_interview', studentResponse: 'pending' }, 'For Interview (Employer)'],
    [{ applicationStatus: 'closed', referralStatus: 'closed', companyResponse: 'rejected' }, 'Rejected (Employer)'],
    [{ applicationStatus: 'approved_for_referral', referralStatus: 'under_review', companyResponse: 'accepted', studentResponse: 'pending' }, 'Offer Received (Student)'],
    [{ applicationStatus: 'closed', referralStatus: 'closed', companyResponse: 'accepted', studentResponse: 'declined' }, 'Offer Declined (Student)'],
    [{ applicationStatus: 'closed', referralStatus: 'closed', companyResponse: 'accepted', studentResponse: 'accepted' }, 'Offer Accepted (Student)'],
    [{ applicationStatus: 'withdrawn', referralStatus: 'withdrawn', companyResponse: 'for_interview' }, 'Withdrawn (Student)'],
    [{ applicationStatus: 'expired', referralStatus: 'expired', companyResponse: 'accepted', studentResponse: 'pending' }, 'Expired (Employer)'],
  ] as const)('maps application history %# to %s', (input, expected) => {
    expect(applicationHistoryStatus(input)).toBe(expected)
  })

  it('gives terminal application/referral lifecycle states precedence over retained responses', () => {
    expect(referralHistoryStatus({
      applicationStatus: 'withdrawn',
      referralStatus: 'withdrawn',
      companyResponse: 'accepted',
      studentResponse: 'pending',
    })).toBe('Withdrawn (Student)')
    expect(referralHistoryStatus({
      applicationStatus: 'expired',
      referralStatus: 'expired',
      companyResponse: 'for_interview',
      studentResponse: 'pending',
    })).toBe('Expired (Employer)')
  })

  it('defines business-level ongoing and closed groups exactly', () => {
    expect(APPLICATION_ONGOING_STATUSES).toEqual([
      'For Review (QC PESO)', 'Under Review (QC PESO)', 'For Review (Employer)',
      'Under Review (Employer)', 'For Interview (Employer)', 'Offer Received (Student)',
    ])
    expect(APPLICATION_CLOSED_STATUSES).toEqual([
      'Rejected (QC PESO)', 'Rejected (Employer)', 'Offer Declined (Student)',
      'Offer Accepted (Student)', 'Withdrawn (Student)', 'Expired (Employer)',
    ])
  })
})
