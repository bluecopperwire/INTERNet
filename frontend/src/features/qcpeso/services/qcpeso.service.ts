import { useQCPesoStore } from '../stores/useQCPesoStore';
import { qcpesoApiService } from './qcpeso-api.service';
import { referenceService } from '../../../services/reference.service';
import {
  adaptMonitoredStudent,
  adaptMonitoredCompany,
  adaptPesoApplication,
  adaptPesoReferral,
  adaptPesoIntern,
  adaptPesoDtr,
} from '../adapters/qcpeso.adapters';
import type {
  QCPesoDashboardSummary,
  QCPesoReviewApplicant,
  QCPesoReferral,
  QCPesoInternshipRecord,
  QCPesoAttendanceRecord,
  QCPesoProfile,
  MonitoredStudentUser,
  MonitoredCompanyUser,
  StudentApplication,
  QCPesoOpportunity,
  CreateEmployerPayload,
} from '../types/qcpeso.types';

export const qcpesoService = {
  async getDashboardSummary(): Promise<QCPesoDashboardSummary> {
    const store = useQCPesoStore.getState();
    await store.fetchMetrics();
    return (
      store.metrics || {
        pendingApplications: 0,
        activeEmployers: 0,
        verifiedRequirements: 0,
        availableOpportunities: 0,
      }
    );
  },

  async getRecentApplications(): Promise<QCPesoReviewApplicant[]> {
    const store = useQCPesoStore.getState();
    await store.fetchApplications({ page: 1, limit: 5 });
    return useQCPesoStore.getState().applications;
  },

  async getReviewApplicants(): Promise<QCPesoReviewApplicant[]> {
    const store = useQCPesoStore.getState();
    await store.fetchApplications();
    return useQCPesoStore.getState().applications;
  },

  async getReviewApplicant(id: string): Promise<QCPesoReviewApplicant | null> {
    const raw = await qcpesoApiService.getApplicationDetail(Number(id));
    return adaptPesoApplication(raw);
  },

  async updateReviewApplicantStatus(
    id: string,
    status: QCPesoReviewApplicant['status'],
    remark?: string,
  ): Promise<QCPesoReviewApplicant | null> {
    const apiStatus =
      status === 'Accepted' ? 'approved_for_referral' : 'rejected_for_referral';
    const store = useQCPesoStore.getState();
    const updated = await store.updateApplicationStatus(
      Number(id),
      apiStatus,
      remark,
    );
    return updated;
  },

  async getReferrals(): Promise<QCPesoReferral[]> {
    const store = useQCPesoStore.getState();
    await store.fetchReferrals();
    return useQCPesoStore.getState().referrals;
  },

  async getReferral(id: string): Promise<QCPesoReferral | null> {
    const raw = await qcpesoApiService.getReferralDetail(Number(id));
    return adaptPesoReferral(raw);
  },

  async getInternships(): Promise<QCPesoInternshipRecord[]> {
    const store = useQCPesoStore.getState();
    await store.fetchInterns();
    return useQCPesoStore.getState().interns;
  },

  async getInternshipRecords(): Promise<QCPesoInternshipRecord[]> {
    return this.getInternships();
  },

  async getInternship(id: string): Promise<QCPesoInternshipRecord | null> {
    const raw = await qcpesoApiService.getInternDetail(Number(id));
    return adaptPesoIntern(raw);
  },

  async getAttendanceRecords(params?: any): Promise<QCPesoAttendanceRecord[]> {
    const store = useQCPesoStore.getState();
    await store.fetchAttendance(params);
    return useQCPesoStore.getState().attendanceRecords;
  },

  async getAssignmentAttendance(assignmentId: string | number): Promise<QCPesoAttendanceRecord[]> {
    try {
      const res = await qcpesoApiService.getAttendanceDetail(Number(assignmentId));
      if (res && Array.isArray(res.dtrEntries)) {
        return res.dtrEntries.map(adaptPesoDtr);
      }
      return [];
    } catch {
      return [];
    }
  },

  async getStudentUsers(): Promise<MonitoredStudentUser[]> {
    const store = useQCPesoStore.getState();
    await store.fetchStudents();
    return useQCPesoStore.getState().students;
  },

  async getMonitoredStudents(): Promise<MonitoredStudentUser[]> {
    return this.getStudentUsers();
  },

  async getMonitoredStudent(id: string): Promise<MonitoredStudentUser | null> {
    const raw = await qcpesoApiService.getStudentDetail(Number(id));
    return adaptMonitoredStudent(raw);
  },

  async getCompanyUsers(): Promise<MonitoredCompanyUser[]> {
    const store = useQCPesoStore.getState();
    await store.fetchCompanies();
    return useQCPesoStore.getState().companies;
  },

  async getMonitoredCompanies(): Promise<MonitoredCompanyUser[]> {
    return this.getCompanyUsers();
  },

  async getMonitoredCompany(id: string): Promise<MonitoredCompanyUser | null> {
    const raw = await qcpesoApiService.getEmployerDetail(Number(id));
    return adaptMonitoredCompany(raw);
  },

  async createEmployer(payload: CreateEmployerPayload): Promise<void> {
    const industries = await referenceService.getIndustries();
    const normalize = (v: string) => v.toLowerCase().replace(/\s*\/\s*/g, '/').trim();
    const match = industries.find(
      (item) => normalize(item.industryName) === normalize(payload.industry),
    );
    if (!match) {
      throw new Error(`Unknown industry: ${payload.industry}`);
    }

    const rawWebsite = payload.websiteUrl?.trim() || null;
    let websiteUrl = rawWebsite;
    if (websiteUrl && !/^https?:\/\//i.test(websiteUrl)) {
      websiteUrl = `https://${websiteUrl}`;
    }

    const apiPayload: Record<string, unknown> = {
      accountEmail: payload.loginEmail.trim(),
      initialPassword: payload.password,
      companyName: payload.companyName.trim(),
      companyType: payload.companyType.toLowerCase(),
      industryId: match.industryId,
      description: payload.description.trim(),
      websiteUrl,
      addressLine: payload.addressLine.trim(),
      addressBarangay: payload.barangay.trim(),
      addressDistrict: payload.district?.trim() || null,
      addressCity: payload.city.trim(),
      contactPersonFirstName: payload.contactFirstName.trim(),
      contactPersonMiddleName: payload.contactMiddleName?.trim() || null,
      contactPersonLastName: payload.contactLastName.trim(),
      contactPersonExtensionName: payload.contactSuffix?.trim() || null,
      contactEmail: payload.contactEmail.trim(),
      contactNumber: payload.contactNumber.trim(),
    };

    if (payload.companySize && payload.companySize.trim() !== '') {
      const parsedSize = Number(payload.companySize);
      if (!Number.isNaN(parsedSize) && parsedSize > 0) {
        apiPayload.companySize = parsedSize;
      }
    }
    if (payload.yearEstablished && payload.yearEstablished.trim() !== '') {
      const parsedYear = Number(payload.yearEstablished);
      if (!Number.isNaN(parsedYear) && parsedYear >= 1800) {
        apiPayload.yearEstablished = parsedYear;
      }
    }

    await qcpesoApiService.createEmployer(apiPayload);
    // Refresh company list cache in store
    const store = useQCPesoStore.getState();
    await store.fetchCompanies();
  },

  async getRecentStudents(): Promise<StudentApplication[]> {
    const apps = await this.getReviewApplicants();
    return apps.map((a) => ({
      id: a.id,
      name: a.studentName,
      school: a.school,
      program: a.program,
      date: a.dateApplied,
      status:
        a.status === 'Accepted'
          ? 'Verified'
          : a.status === 'Rejected'
            ? 'Rejected'
            : 'Pending',
      email: a.email,
      phone: a.phone,
      gwa: 'N/A',
      submittedDocuments: [],
      appliedFor: a.jobTitle,
    }));
  },

  async getQCPesoOpportunity(id: string): Promise<QCPesoOpportunity | null> {
    const apps = await this.getReviewApplicants();
    const match = apps.find((a) => a.opportunityId === id || a.id === id);
    if (!match) return null;
    return {
      id: match.opportunityId,
      title: match.jobTitle,
      company: match.company,
      department: 'Operations',
      workArrangement: 'On-site',
      slots: 5,
      duration: match.requiredHours || 200,
      allowance: 'Provided',
      applicationDeadline: new Date().toISOString().split('T')[0],
      jobDescription: 'Internship position under partner employer.',
      qualifications: 'Currently enrolled student.',
    };
  },

  async getProfile(): Promise<QCPesoProfile> {
    const store = useQCPesoStore.getState();
    await store.fetchProfile();
    return useQCPesoStore.getState().profile!;
  },

  async updateProfile(updates: Partial<QCPesoProfile>): Promise<QCPesoProfile> {
    const store = useQCPesoStore.getState();
    await store.updateProfile(updates);
    return useQCPesoStore.getState().profile!;
  },

  async uploadProfilePicture(file: File): Promise<QCPesoProfile> {
    return useQCPesoStore.getState().uploadProfilePicture(file);
  },
};
