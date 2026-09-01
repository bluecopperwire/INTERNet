import { describe, expect, it } from 'vitest';
import {
  mapInterviewSchedulePayload,
  mapAssignmentCandidate,
  mapStudentResponse,
} from './employer.service';

describe('assignment candidate mapping', () => {
  it.each([
    ['pending', 'Pending'],
    ['accepted', 'Accepted'],
    ['declined', 'Rejected'],
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
      studentResponse: 'accepted',
      studentRespondedAt: '2026-08-28T00:00:00.000Z',
      internshipAssignmentId: null,
    });

    expect(candidate).toMatchObject({
      id: '11',
      applicantId: '12',
      referralId: 11,
      internshipAssignmentId: null,
      company: 'INTERNet Labs',
      jobTitle: 'Backend Intern',
      studentResponse: 'Accepted',
      acceptanceDate: new Date('2026-08-28T00:00:00.000Z').toLocaleDateString(),
    });
  });
});

describe('interview schedule payload mapping', () => {
  it('sends the online URL and clears the physical location', () => {
    expect(mapInterviewSchedulePayload({
      date: '2026-09-20', time: '10:00', mode: 'online',
      meetingUrl: 'https://meet.example.test/interview',
      location: 'stale location', remarks: ' Prepare ',
    })).toEqual({
      interviewDate: '2026-09-20', interviewTime: '10:00', interviewMode: 'online',
      onlineMeetingUrl: 'https://meet.example.test/interview',
      physicalLocation: null, remark: 'Prepare',
    });
  });

  it('sends the physical location and clears the online URL', () => {
    expect(mapInterviewSchedulePayload({
      date: '2026-09-21', time: '11:00', mode: 'in-person',
      meetingUrl: 'https://stale.example.test', location: 'Room 3', remarks: '',
    })).toEqual({
      interviewDate: '2026-09-21', interviewTime: '11:00', interviewMode: 'physical',
      onlineMeetingUrl: null, physicalLocation: 'Room 3', remark: null,
    });
  });
});
