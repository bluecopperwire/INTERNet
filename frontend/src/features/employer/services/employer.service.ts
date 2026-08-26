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

  async saveOpportunity(opp: any): Promise<void> {
    const store = useEmployerStore.getState();
    if (opp.id) {
      await store.updateOpportunity(Number(opp.id), opp);
    } else {
      await store.createOpportunity(opp);
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

  async deleteInternshipDetails(_applicantId: string): Promise<void> {
    // Record deletion not supported by backend schema; remains for audit history
    return Promise.resolve();
  },

  async getInternshipAssignments(): Promise<InternshipAssignment[]> {
    const res = await employerApiService.getAssignmentCandidates();
    return res.data.map((c: any) => ({
      id: String(c.referralId || c.applicationId),
      applicantId: String(c.referralId || c.applicationId),
      studentName: c.studentFullName,
      company: 'Company',
      jobTitle: c.opportunityTitle,
      acceptanceDate: new Date(c.submittedAt || Date.now()).toLocaleDateString(),
      studentResponse: c.studentResponse === 'accepted' ? 'Accepted' : 'Pending Response',
      workingDays: 'Weekdays',
      requiredHours: 200,
      startDate: new Date().toLocaleDateString(),
      expectedEndDate: new Date().toLocaleDateString(),
      shiftStartTime: '08:00 AM',
      shiftEndTime: '05:00 PM',
    }));
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
