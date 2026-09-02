import { useEmployerStore } from '../stores/useEmployerStore';
import { employerApiService } from './employer-api.service';
import {
  adaptEmployerOpportunity,
  adaptEmployerReferral,
  adaptEmployerInternship,
} from '../adapters/employer.adapters';
import type {
  Opportunity,
  Applicant,
  CompanyProfile,
  EmployerDashboardSummary,
  EmployerNotification,
  EmployerAttendanceRecord,
  EmployerInternshipDetails,
  InternshipAssignment,
} from '../types/employer.types';
import { assignmentCandidateResponse } from '../../workflow/status-mappings';
import type {
  CreateOpportunityRequest,
  UpdateOpportunityRequest,
  WorkArrangement,
  EmployerAssignmentCandidateDto,
} from '../../../types/api';
import { formatTableDate, todayDateOnly } from '../../../utils/date-only';

function mapWorkArrangement(arrangement?: string): WorkArrangement {
  if (arrangement === 'Remote' || arrangement === 'remote') return 'remote';
  if (arrangement === 'Hybrid' || arrangement === 'hybrid') return 'hybrid';
  return 'onsite';
}

function mapAllowance(allowance?: string | number | null): string | null {
  if (!allowance) return null;
  const trimmed = String(allowance).trim();
  if (
    !trimmed ||
    trimmed.toLowerCase() === 'none' ||
    trimmed.toLowerCase() === 'n/a'
  ) {
    return null;
  }
  return trimmed;
}

export function mapInterviewSchedulePayload(details: {
  date: string;
  time: string;
  mode: 'online' | 'in-person';
  meetingUrl?: string;
  location?: string;
  remarks: string;
}) {
  return {
    interviewDate: details.date,
    interviewTime: details.time,
    interviewMode: details.mode === 'online' ? 'online' : 'physical',
    onlineMeetingUrl: details.mode === 'online' ? details.meetingUrl : null,
    physicalLocation: details.mode === 'in-person' ? details.location : null,
    remark: details.remarks.trim() || null,
  } as const;
}

export function isOpportunityDeadlineExpired(
  applicationDeadline: string,
): boolean {
  if (!applicationDeadline) return false;
  return applicationDeadline < todayDateOnly();
}

export function formatOpportunityDeadline(applicationDeadline: string): string {
  const [year, month, day] = applicationDeadline.split('-').map(Number);
  if (!year || !month || !day) return applicationDeadline;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

export function mapStudentResponse(
  response: unknown,
): 'Pending' | 'Accepted' | 'Rejected' | 'Unknown' {
  return assignmentCandidateResponse(response as any);
}

function formatAcceptanceDate(value: string | null): string {
  if (!value) return 'Not recorded';
  return formatTableDate(value) || 'Invalid date';
}

export function mapAssignmentCandidate(
  c: EmployerAssignmentCandidateDto,
): InternshipAssignment {
  return {
    id: String(c.referralId),
    applicantId: String(c.applicationId),
    referralId: c.referralId,
    internshipAssignmentId: c.internshipAssignmentId,
    studentName: c.studentFullName,
    strandProgram: c.strandProgram || 'N/A',
    company: c.companyName,
    jobTitle: c.jobTitle,
    acceptanceDate: formatAcceptanceDate(c.studentRespondedAt),
    studentResponse: mapStudentResponse(c.studentResponse),
    workingDays: 'Weekdays',
    requiredHours: 200,
    startDate: new Date().toLocaleDateString(),
    expectedEndDate: new Date().toLocaleDateString(),
    shiftStartTime: '08:00 AM',
    shiftEndTime: '05:00 PM',
  };
}

export const employerService = {
  async getDashboardSummary(): Promise<EmployerDashboardSummary> {
    const store = useEmployerStore.getState();
    await store.fetchDashboard();
    return (
      store.summary || {
        companyName: 'Company',
        activeOpportunities: 0,
        totalApplicants: 0,
        acceptedPercentage: 0,
        rejectedPercentage: 0,
        pendingReviews: 0,
        acceptanceRate: 0,
      }
    );
  },

  async getRecentApplicants(limit = 4): Promise<Applicant[]> {
    const store = useEmployerStore.getState();
    await store.fetchReferrals({ view: 'review', page: 1, limit });
    return useEmployerStore.getState().referrals;
  },

  async getCompanyProfile(): Promise<CompanyProfile> {
    const store = useEmployerStore.getState();
    await store.fetchProfile();
    return useEmployerStore.getState().profile!;
  },

  async updateCompanyProfile(
    updated: Partial<CompanyProfile>,
  ): Promise<CompanyProfile> {
    const store = useEmployerStore.getState();
    await store.updateProfile(updated);
    return useEmployerStore.getState().profile!;
  },

  async uploadCompanyProfilePicture(file: File): Promise<CompanyProfile> {
    const store = useEmployerStore.getState();
    await store.uploadLogo(file);
    return useEmployerStore.getState().profile!;
  },

  async getOpportunities(): Promise<Opportunity[]> {
    const store = useEmployerStore.getState();
    await store.fetchOpportunities();
    return useEmployerStore.getState().opportunities;
  },

  async getOpportunityById(id: string): Promise<Opportunity | undefined> {
    const opp = await employerApiService.getOpportunity(Number(id));
    return adaptEmployerOpportunity(opp);
  },

  async saveOpportunity(opp: Partial<Opportunity>): Promise<void> {
    const store = useEmployerStore.getState();
    if (opp.id) {
      const updatePayload: UpdateOpportunityRequest = {};
      if (opp.title !== undefined) updatePayload.title = opp.title.trim();
      if (opp.department !== undefined)
        updatePayload.department = opp.department.trim();
      if (opp.workArrangement !== undefined) {
        updatePayload.workArrangement = mapWorkArrangement(opp.workArrangement);
      }
      if (opp.duration !== undefined)
        updatePayload.minimumRequiredHours = Number(opp.duration);
      if (opp.slots !== undefined)
        updatePayload.offeredSlots = Number(opp.slots);
      if (opp.allowance !== undefined)
        updatePayload.allowance = mapAllowance(opp.allowance);
      if (opp.jobDescription !== undefined)
        updatePayload.description = opp.jobDescription.trim();
      if (opp.qualifications !== undefined) {
        const q = opp.qualifications.trim();
        updatePayload.qualification =
          q && q.toLowerCase() !== 'none specified' ? q : null;
      }
      if (opp.applicationDeadline !== undefined) {
        updatePayload.applicationDeadline = opp.applicationDeadline;
      }
      await store.updateOpportunity(Number(opp.id), updatePayload);
    } else {
      const createPayload: CreateOpportunityRequest = {
        title: (opp.title || '').trim(),
        department: (opp.department || '').trim(),
        workArrangement: mapWorkArrangement(opp.workArrangement),
        minimumRequiredHours: Number(opp.duration || 0),
        offeredSlots: Number(opp.slots || 0),
        allowance: mapAllowance(opp.allowance),
        description: (opp.jobDescription || '').trim(),
        qualification: opp.qualifications?.trim()
          ? opp.qualifications.trim()
          : null,
        applicationDeadline: opp.applicationDeadline || '',
      };
      await store.createOpportunity(createPayload);
    }
  },

  async deleteOpportunity(id: string): Promise<void> {
    const store = useEmployerStore.getState();
    await store.archiveOpportunity(Number(id));
  },

  async getAllApplicants(): Promise<Applicant[]> {
    const records: Applicant[] = [];
    let page = 1;
    do {
      const result = await employerApiService.getReferrals({ view: 'review', page, limit: 100 });
      records.push(...result.data.map(adaptEmployerReferral));
      if (page >= result.meta.totalPages) break;
      page++;
    } while (true);
    return records;
  },

  async closeOpportunity(id: string): Promise<void> {
    await useEmployerStore.getState().closeOpportunity(Number(id));
  },

  async reopenOpportunity(id: string): Promise<void> {
    await useEmployerStore.getState().reopenOpportunity(Number(id));
  },

  async getReferralHistory(): Promise<Applicant[]> {
    const records: Applicant[] = [];
    let page = 1;
    do {
      const result = await employerApiService.getReferrals({ view: 'history', page, limit: 100 });
      records.push(...result.data.map(adaptEmployerReferral));
      if (page >= result.meta.totalPages) break;
      page++;
    } while (true);
    return records;
  },

  async getApplicantById(id: string): Promise<Applicant | undefined> {
    const raw = await employerApiService.getReferral(Number(id));
    return adaptEmployerReferral(raw);
  },

  async markApplicantUnderReview(id: string): Promise<void> {
    await employerApiService.markReferralUnderReview(Number(id));
  },

  async scheduleInterview(
    id: string,
    details: { date: string; time: string; mode: 'online' | 'in-person'; meetingUrl?: string; location?: string; remarks: string },
  ): Promise<void> {
    await useEmployerStore.getState().scheduleInterview(
      Number(id),
      mapInterviewSchedulePayload(details),
    );
  },

  async updateApplicantStatus(
    id: string,
    status: Applicant['status'],
    rejectionRemark?: string,
  ): Promise<void> {
    const store = useEmployerStore.getState();
    if (status === 'Accepted') {
      await store.acceptReferral(Number(id), rejectionRemark);
    } else if (status === 'Rejected') {
      await store.rejectReferral(Number(id), rejectionRemark);
    }
  },

  async deleteReferral(referralId: string): Promise<void> {
    await employerApiService.hideReferral(Number(referralId));
  },

  async getApplicantsForOpportunity(
    opportunityId: string,
  ): Promise<Applicant[]> {
    const records: Applicant[] = [];
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages) {
      const result = await employerApiService.getOpportunityReferrals(Number(opportunityId), {
        view: 'history',
        page,
        limit: 100,
      });
      records.push(...result.data.map(adaptEmployerReferral));
      totalPages = result.meta.totalPages;
      page++;
    }
    return records;
  },

  async getAttendanceRecords(): Promise<EmployerAttendanceRecord[]> {
    const store = useEmployerStore.getState();
    await store.fetchAttendance();
    return useEmployerStore.getState().attendanceRecords;
  },

  async getAllInternshipDetails(): Promise<EmployerInternshipDetails[]> {
    const store = useEmployerStore.getState();
    await store.fetchInternships();
    return useEmployerStore.getState().internships;
  },

  async getInternshipDetails(
    applicantId: string,
  ): Promise<EmployerInternshipDetails | undefined> {
    const raw = await employerApiService.getInternship(Number(applicantId));
    if (raw) return adaptEmployerInternship(raw);
    return useEmployerStore
      .getState()
      .internships.find((i) => i.applicantId === applicantId);
  },

  async updateInternshipDetails(
    applicantId: string,
    updates: Partial<EmployerInternshipDetails>,
  ): Promise<EmployerInternshipDetails | undefined> {
    const assignmentId = Number(applicantId);
    let updated;
    if (updates.status === 'Completed') {
      updated = await employerApiService.completeInternship(assignmentId);
    } else if (updates.status === 'Cancelled') {
      updated = await employerApiService.cancelInternship(assignmentId);
    } else {
      updated = await employerApiService.updateInternship(assignmentId, {
        workingDays: updates.workingDays,
        requiredHours: updates.requiredHours,
        startDate: updates.startDate,
        expectedEndDate: updates.expectedEndDate || null,
        startShift: updates.shiftStartTime,
        endShift: updates.shiftEndTime,
      });
    }
    await useEmployerStore.getState().fetchInternships();
    return adaptEmployerInternship(updated);
  },

  async deleteInternshipDetails(applicantId: string): Promise<void> {
    const store = useEmployerStore.getState();
    await store.deleteInternship(Number(applicantId));
  },

  async getInternshipAssignments(): Promise<InternshipAssignment[]> {
    const res = await employerApiService.getAssignmentCandidates();
    return res.data.map(mapAssignmentCandidate);
  },

  async createInternshipAssignment(referralId: number, payload: {
    workingDays: string
    requiredHours: number
    startDate: string
    expectedEndDate?: string | null
    startShift: string
    endShift: string
  }): Promise<unknown> {
    return employerApiService.createInternshipAssignment(referralId, payload)
  },

  async getInternshipAssignmentById(
    id: string,
  ): Promise<InternshipAssignment | undefined> {
    const list = await this.getInternshipAssignments();
    return list.find((a) => a.id === id);
  },

  async getNotifications(): Promise<EmployerNotification[]> {
    return [];
  },

  async markAllNotificationsAsRead(): Promise<void> {
    return Promise.resolve();
  },
};
