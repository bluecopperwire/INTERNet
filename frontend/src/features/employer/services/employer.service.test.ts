import { describe, expect, it } from 'vitest';
import {
  canWithdrawCandidate,
  mapAssignmentCandidate,
  mapStudentResponse,
} from './employer.service';

describe('assignment candidate mapping', () => {
  it.each([
    ['pending', 'Pending Response'],
    ['accepted', 'Accepted'],
    ['declined', 'Declined'],
    [null, 'Unknown'],
    ['unexpected', 'Unknown'],
  ] as const)('maps %s safely', (value, expected) => {
    expect(mapStudentResponse(value)).toBe(expected);
  });

  it('uses the backend candidate fields without fallbacks', () => {
    const candidate = mapAssignmentCandidate({
      referralId: 11,
      applicationId: 12,
      studentId: 13,
      studentFullName: 'Student Example',
      opportunityId: 14,
      jobTitle: 'Backend Intern',
      companyName: 'INTERNet Labs',
      acceptanceDate: '2026-08-27T00:00:00.000Z',
      studentResponse: 'pending',
      studentRespondedAt: null,
      internshipAssignmentId: null,
    });

    expect(candidate).toMatchObject({
      id: '11',
      applicantId: '12',
      referralId: 11,
      internshipAssignmentId: null,
      company: 'INTERNet Labs',
      jobTitle: 'Backend Intern',
      studentResponse: 'Pending Response',
    });
  });

  it('allows withdrawal only for a pending, unassigned candidate', () => {
    expect(canWithdrawCandidate({ studentResponse: 'Pending Response', internshipAssignmentId: null })).toBe(true);
    expect(canWithdrawCandidate({ studentResponse: 'Accepted', internshipAssignmentId: null })).toBe(false);
    expect(canWithdrawCandidate({ studentResponse: 'Declined', internshipAssignmentId: null })).toBe(false);
    expect(canWithdrawCandidate({ studentResponse: 'Unknown', internshipAssignmentId: null })).toBe(false);
    expect(canWithdrawCandidate({ studentResponse: 'Pending Response', internshipAssignmentId: 99 })).toBe(false);
  });
});
