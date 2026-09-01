import { api } from '../../../services/api';
import type {
  EmployerDashboardMetricsDto,
  EmployerOpportunityDto,
  CreateOpportunityRequest,
  UpdateOpportunityRequest,
  EmployerReferralListItemDto,
  EmployerAttendanceItemDto,
  EmployerInternshipListItemDto,
  EmployerAssignmentCandidateDto,
  PaginatedResponse,
} from '../../../types/api';

export const employerApiService = {
  async getMetrics(): Promise<EmployerDashboardMetricsDto> {
    const response = await api.get<EmployerDashboardMetricsDto>(
      '/dashboard/employer/metrics',
    );
    return response.data;
  },

  async getProfile(): Promise<any> {
    const response = await api.get('/employer/profile');
    return response.data;
  },

  async updateProfile(payload: any): Promise<any> {
    const response = await api.patch('/employer/profile', payload);
    return response.data;
  },

  async uploadLogo(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.put('/employer/profile/image', formData);
    return response.data;
  },

  async getOpportunities(params?: any): Promise<PaginatedResponse<EmployerOpportunityDto>> {
    const response = await api.get<PaginatedResponse<EmployerOpportunityDto>>(
      '/employer/opportunities',
      { params },
    );
    return response.data;
  },

  async getOpportunity(id: number): Promise<EmployerOpportunityDto> {
    const response = await api.get<EmployerOpportunityDto>(
      `/employer/opportunities/${id}`,
    );
    return response.data;
  },

  async createOpportunity(payload: CreateOpportunityRequest): Promise<EmployerOpportunityDto> {
    const response = await api.post<EmployerOpportunityDto>(
      '/employer/opportunities',
      payload,
    );
    return response.data;
  },

  async updateOpportunity(
    id: number,
    payload: UpdateOpportunityRequest,
  ): Promise<EmployerOpportunityDto> {
    const response = await api.patch<EmployerOpportunityDto>(
      `/employer/opportunities/${id}`,
      payload,
    );
    return response.data;
  },

  async closeOpportunity(id: number): Promise<EmployerOpportunityDto> {
    const response = await api.patch<EmployerOpportunityDto>(
      `/employer/opportunities/${id}/close`,
      {},
    );
    return response.data;
  },

  async archiveOpportunity(id: number): Promise<void> {
    await api.delete(`/employer/opportunities/${id}`);
  },

  async getReferrals(params?: any): Promise<PaginatedResponse<EmployerReferralListItemDto>> {
    const response = await api.get<PaginatedResponse<EmployerReferralListItemDto>>(
      '/employer/referrals',
      { params },
    );
    return response.data;
  },

  async getReferral(referralId: number): Promise<any> {
    const response = await api.get(`/employer/referrals/${referralId}`);
    return response.data;
  },

  async markReferralUnderReview(referralId: number): Promise<any> {
    const response = await api.patch(`/employer/referrals/${referralId}/review`, {});
    return response.data;
  },

  async acceptReferral(referralId: number, remark?: string): Promise<any> {
    const response = await api.patch(`/employer/referrals/${referralId}/accept`, {
      remark,
    });
    return response.data;
  },

  async rejectReferral(referralId: number, remark?: string): Promise<any> {
    const response = await api.patch(`/employer/referrals/${referralId}/reject`, {
      remark,
    });
    return response.data;
  },

  async withdrawAcceptance(referralId: number, remark: string): Promise<any> {
    const response = await api.patch(
      `/employer/referrals/${referralId}/withdraw-acceptance`,
      { remark },
    );
    return response.data;
  },

  async scheduleInterview(referralId: number, payload: any): Promise<any> {
    const response = await api.put(
      `/employer/referrals/${referralId}/interview`,
      payload,
    );
    return response.data;
  },

  async hideReferral(referralId: number): Promise<void> {
    await api.delete(`/employer/referrals/${referralId}`);
  },

  async getAssignmentCandidates(params?: { page?: number; limit?: number; search?: string; studentResponse?: 'pending' | 'accepted' | 'declined' }): Promise<PaginatedResponse<EmployerAssignmentCandidateDto>> {
    const response = await api.get<PaginatedResponse<EmployerAssignmentCandidateDto>>(
      '/employer/internship-assignment-candidates',
      { params },
    );
    return response.data;
  },

  async createInternshipAssignment(referralId: number, payload: any): Promise<any> {
    const response = await api.post(
      `/employer/referrals/${referralId}/internship-assignment`,
      payload,
    );
    return response.data;
  },

  async getInternships(params?: any): Promise<PaginatedResponse<EmployerInternshipListItemDto>> {
    const response = await api.get<PaginatedResponse<EmployerInternshipListItemDto>>(
      '/employer/internships',
      { params },
    );
    return response.data;
  },

  async getInternship(assignmentId: number): Promise<any> {
    const response = await api.get(`/employer/internships/${assignmentId}`);
    return response.data;
  },

  async updateInternship(assignmentId: number, payload: any): Promise<any> {
    const response = await api.patch(
      `/employer/internships/${assignmentId}`,
      payload,
    );
    return response.data;
  },

  async cancelInternship(assignmentId: number): Promise<any> {
    const response = await api.patch(
      `/employer/internships/${assignmentId}/cancel`,
      {},
    );
    return response.data;
  },

  async completeInternship(assignmentId: number): Promise<any> {
    const response = await api.patch(
      `/employer/internships/${assignmentId}/complete`,
      {},
    );
    return response.data;
  },

  async deleteInternship(
    assignmentId: number,
  ): Promise<{ deleted: boolean; internshipAssignmentId: number }> {
    const response = await api.delete<{
      deleted: boolean;
      internshipAssignmentId: number;
    }>(`/employer/internships/${assignmentId}`);
    return response.data;
  },

  async getAttendance(params?: any): Promise<PaginatedResponse<EmployerAttendanceItemDto>> {
    const response = await api.get<PaginatedResponse<EmployerAttendanceItemDto>>(
      '/employer/attendance',
      { params },
    );
    return response.data;
  },

  async getAttendanceSummary(params?: any): Promise<any> {
    const response = await api.get('/employer/attendance/summary', { params });
    return response.data;
  },

  async getAssignmentAttendanceHistory(assignmentId: number, params?: any): Promise<any> {
    const response = await api.get(
      `/employer/internships/${assignmentId}/attendance`,
      { params },
    );
    return response.data;
  },

  async getReports(params?: any): Promise<any> {
    const response = await api.get('/dashboard/employer/reports', { params });
    return response.data;
  },
};
