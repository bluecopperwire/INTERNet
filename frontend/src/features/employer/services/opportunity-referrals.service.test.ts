import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getOpportunityReferrals } = vi.hoisted(() => ({
  getOpportunityReferrals: vi.fn(),
}));

vi.mock('./employer-api.service', () => ({
  employerApiService: { getOpportunityReferrals },
}));

import { employerService } from './employer.service';

describe('opportunity referral history', () => {
  beforeEach(() => getOpportunityReferrals.mockReset());

  it('uses the opportunity-scoped history endpoint and loads every page', async () => {
    const referral = {
      referralId: 8,
      applicationId: 18,
      studentId: 28,
      studentFullName: 'Student Example',
      opportunityId: 42,
      opportunityTitle: 'Software Intern',
      strandProgram: 'BSIT',
      submittedAt: '2026-08-01T00:00:00.000Z',
      referredAt: '2026-08-02T00:00:00.000Z',
      referralStatus: 'closed',
      applicationStatus: 'closed',
      companyResponse: 'accepted',
      studentResponse: 'accepted',
    };
    getOpportunityReferrals
      .mockResolvedValueOnce({ data: [referral], meta: { page: 1, limit: 100, total: 2, totalPages: 2 } })
      .mockResolvedValueOnce({ data: [{ ...referral, referralId: 9 }], meta: { page: 2, limit: 100, total: 2, totalPages: 2 } });

    const result = await employerService.getApplicantsForOpportunity('42');

    expect(getOpportunityReferrals).toHaveBeenNthCalledWith(1, 42, { view: 'history', page: 1, limit: 100 });
    expect(getOpportunityReferrals).toHaveBeenNthCalledWith(2, 42, { view: 'history', page: 2, limit: 100 });
    expect(result).toHaveLength(2);
    expect(result[0].historyStatus).toBe('Offer Accepted (Student)');
  });

  it('propagates request failures so the modal can leave loading and show an error', async () => {
    getOpportunityReferrals.mockRejectedValueOnce(new Error('network failed'));
    await expect(employerService.getApplicantsForOpportunity('42')).rejects.toThrow('network failed');
  });
});
