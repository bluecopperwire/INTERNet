import { api } from "../../../services/api";
import type {
  PesoStudentMetricsDto,
  PesoReferralDto,
  PesoInternSummaryDto,
  PesoDtrEntryDto,
  PaginatedResponse,
  DashboardApplicationDto,
} from "../../../types/api";

export const qcpesoApiService = {
  async getDashboardMetrics(): Promise<PesoStudentMetricsDto> {
    const response = await api.get<PesoStudentMetricsDto>(
      "/dashboard/peso/students/metrics",
    );
    return response.data;
  },

  async getApplications(
    params?: any,
  ): Promise<PaginatedResponse<DashboardApplicationDto>> {
    const response = await api.get<PaginatedResponse<DashboardApplicationDto>>(
      "/dashboard/peso/applications",
      { params },
    );
    return response.data;
  },

  async getApplicationDetail(applicationId: number): Promise<any> {
    const response = await api.get(
      `/dashboard/peso/applications/${applicationId}`,
    );
    return response.data;
  },

  async markApplicationUnderReview(applicationId: number): Promise<any> {
    const response = await api.patch(
      `/dashboard/peso/applications/${applicationId}/review`,
      {},
    );
    return response.data;
  },

  async updateApplicationStatus(
    applicationId: number,
    status: "approved_for_referral" | "rejected_for_referral",
    remark?: string,
  ): Promise<any> {
    const response = await api.patch(
      `/dashboard/peso/applications/${applicationId}/status`,
      { status, remark },
    );
    return response.data;
  },

  async hideApplication(applicationId: number): Promise<void> {
    await api.delete(`/dashboard/peso/applications/${applicationId}`);
  },

  async getEmployers(params?: any): Promise<PaginatedResponse<any>> {
    const response = await api.get<PaginatedResponse<any>>(
      "/dashboard/peso/employers",
      { params },
    );
    return response.data;
  },

  async getEmployerDetail(companyId: number): Promise<any> {
    const response = await api.get(`/dashboard/peso/employers/${companyId}`);
    return response.data;
  },

  async createEmployer(payload: any): Promise<any> {
    const response = await api.post("/dashboard/peso/employers", payload);
    return response.data;
  },

  async getReferrals(
    params?: any,
  ): Promise<PaginatedResponse<PesoReferralDto>> {
    const response = await api.get<PaginatedResponse<PesoReferralDto>>(
      "/dashboard/peso/referrals",
      { params },
    );
    return response.data;
  },

  async getReferralDetail(referralId: number): Promise<any> {
    const response = await api.get(`/dashboard/peso/referrals/${referralId}`);
    return response.data;
  },

  async hideReferral(referralId: number): Promise<void> {
    await api.delete(`/dashboard/peso/referrals/${referralId}`);
  },

  async getInterns(
    params?: any,
  ): Promise<PaginatedResponse<PesoInternSummaryDto>> {
    const response = await api.get<PaginatedResponse<PesoInternSummaryDto>>(
      "/dashboard/peso/interns",
      { params },
    );
    return response.data;
  },

  async getInternDetail(internshipAssignmentId: number): Promise<any> {
    const response = await api.get(
      `/dashboard/peso/interns/${internshipAssignmentId}`,
    );
    return response.data;
  },

  async getAttendance(
    params?: any,
  ): Promise<PaginatedResponse<PesoDtrEntryDto>> {
    const response = await api.get<PaginatedResponse<PesoDtrEntryDto>>(
      "/dashboard/peso/attendance",
      { params },
    );
    return response.data;
  },

  async getAttendanceDetail(assignmentId: number, params?: any): Promise<any> {
    const response = await api.get(
      `/dashboard/peso/attendance/assignments/${assignmentId}`,
      { params },
    );
    return response.data;
  },

  async getStudents(params?: any): Promise<PaginatedResponse<any>> {
    const response = await api.get<PaginatedResponse<any>>(
      "/dashboard/peso/students",
      { params },
    );
    return response.data;
  },

  async getStudentDetail(studentId: number): Promise<any> {
    const response = await api.get(`/dashboard/peso/students/${studentId}`);
    return response.data;
  },

  async getOwnProfile(): Promise<any> {
    const response = await api.get("/users/peso/profile");
    return response.data;
  },

  async updateOwnProfile(payload: any): Promise<any> {
    const response = await api.patch("/users/peso/profile", payload);
    return response.data;
  },

  async uploadProfilePicture(file: File): Promise<Record<string, unknown>> {
    const formData = new FormData();
    formData.append("image", file);
    const response = await api.put("/users/peso/profile/image", formData);
    return response.data;
  },
};
