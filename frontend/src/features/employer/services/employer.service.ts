import { useEmployerStore } from '../stores/useEmployerStore';
import { employerApiService } from './employer-api.service';
import { adaptEmployerOpportunity, adaptEmployerReferral, adaptEmployerInternship } from '../adapters/employer.adapters';
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
import type {
  CreateOpportunityRequest,
  UpdateOpportunityRequest,
  WorkArrangement,
  EmployerAssignmentCandidateDto,
} from '../../../types/api';

function mapWorkArrangement(arrangement?: string): WorkArrangement {
  if (arrangement === 'Remote' || arrangement === 'remote') return 'remote';
  if (arrangement === 'Hybrid' || arrangement === 'hybrid') return 'hybrid';
  return 'onsite';
}

function mapAllowance(allowance?: string | number | null): string | null {
  if (!allowance) return null;
  const trimmed = String(allowance).trim();
  if (!trimmed || trimmed.toLowerCase() === 'none' || trimmed.toLowerCase() === 'n/a') {
    return null;
  }
  return trimmed;
}

export function isOpportunityDeadlineExpired(applicationDeadline: string): boolean {
  if (!applicationDeadline) return false;
  const deadline = new Date(`${applicationDeadline}T00:00:00`);
  if (Number.isNaN(deadline.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today >= deadline;
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
): 'Pending Response' | 'Accepted' | 'Declined' | 'Unknown' {
  if (response === 'pending') return 'Pending Response';
  if (response === 'accepted') return 'Accepted';
  if (response === 'declined') return 'Declined';
  return 'Unknown';
}

export function canWithdrawCandidate(candidate: {
  studentResponse?: 'Pending Response' | 'Accepted' | 'Declined' | 'Unknown';
  internshipAssignmentId?: number | null;
  isWithdrawing?: boolean;
}): boolean {
  return candidate.studentResponse === 'Pending Response'
    && candidate.internshipAssignmentId === null
    && !candidate.isWithdrawing;
}

function formatAcceptanceDate(value: string | null): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString();
}

export function mapAssignmentCandidate(c: EmployerAssignmentCandidateDto): InternshipAssignment {
  return {
    id: String(c.referralId),
    applicantId: String(c.applicationId),
    referralId: c.referralId,
    internshipAssignmentId: c.internshipAssignmentId,
    studentName: c.studentFullName,
    company: c.companyName,
    jobTitle: c.jobTitle,
    acceptanceDate: formatAcceptanceDate(c.acceptanceDate),
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
    await store.fetchReferrals({ page: 1, limit });
    return useEmployerStore.getState().referrals;
  },

  async getCompanyProfile(): Promise<CompanyProfile> {
    const store = useEmployerStore.getState();
    await store.fetchProfile();
    return useEmployerStore.getState().profile!;
  },

  async updateCompanyProfile(updated: Partial<CompanyProfile>): Promise<CompanyProfile> {
    const store = useEmployerStore.getState();
    await store.updateProfile(updated);
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
      if (opp.department !== undefined) updatePayload.department = opp.department.trim();
      if (opp.workArrangement !== undefined) {
        updatePayload.workArrangement = mapWorkArrangement(opp.workArrangement);
      }
      if (opp.duration !== undefined) updatePayload.minimumRequiredHours = Number(opp.duration);
      if (opp.slots !== undefined) updatePayload.offeredSlots = Number(opp.slots);
      if (opp.allowance !== undefined) updatePayload.allowance = mapAllowance(opp.allowance);
      if (opp.jobDescription !== undefined) updatePayload.description = opp.jobDescription.trim();
      if (opp.qualifications !== undefined) {
        const q = opp.qualifications.trim();
        updatePayload.qualification = q && q.toLowerCase() !== 'none specified' ? q : null;
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
        qualification: opp.qualifications?.trim() ? opp.qualifications.trim() : null,
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
    const store = useEmployerStore.getState();
    await store.fetchReferrals();
    return useEmployerStore.getState().referrals;
  },

  async getApplicantById(id: string): Promise<Applicant | undefined> {
    const raw = await employerApiService.getReferral(Number(id));
    return adaptEmployerReferral(raw);
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

  async withdrawAcceptance(referralId: string): Promise<void> {
    const store = useEmployerStore.getState();
    await store.withdrawAcceptance(Number(referralId));
  },

  async getApplicantsForOpportunity(opportunityId: string): Promise<Applicant[]> {
    const res = await employerApiService.getReferrals({ opportunityId: Number(opportunityId) });
    return res.data.map(adaptEmployerReferral);
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

  async getInternshipDetails(applicantId: string): Promise<EmployerInternshipDetails | undefined> {
    const raw = await employerApiService.getInternship(Number(applicantId));
    if (raw) return adaptEmployerInternship(raw);
    return useEmployerStore.getState().internships.find((i) => i.applicantId === applicantId);
  },

  async updateInternshipDetails(
    applicantId: string,
    updates: Partial<EmployerInternshipDetails>,
  ): Promise<EmployerInternshipDetails | undefined> {
    await employerApiService.updateInternship(Number(applicantId), updates);
    const store = useEmployerStore.getState();
    await store.fetchInternships();
    return useEmployerStore.getState().internships.find((i) => i.applicantId === applicantId);
  },

  async deleteInternshipDetails(applicantId: string): Promise<void> {
    const store = useEmployerStore.getState();
    await store.deleteInternship(Number(applicantId));
  },

  async getInternshipAssignments(): Promise<InternshipAssignment[]> {
    const res = await employerApiService.getAssignmentCandidates();
    return res.data.map(mapAssignmentCandidate);
  },

  async getInternshipAssignmentById(id: string): Promise<InternshipAssignment | undefined> {
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
