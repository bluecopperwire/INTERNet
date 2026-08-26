import { api } from '../../../services/api';
import type {
  OpportunityCatalogItem,
  PaginatedResponse,
  StudentProfileResponse,
  StudentRequirementsResponse,
  StudentApplicationDto,
  StudentApplicationStatusDto,
  StudentAttendanceResponse,
} from '../../../types/api';

export interface OpportunityFilters {
  search?: string;
  companyId?: number;
  workArrangement?: 'onsite' | 'remote' | 'hybrid';
  hasAllowance?: boolean;
  page?: number;
  limit?: number;
}

export const studentApiService = {
  async getOpportunities(
    filters?: OpportunityFilters,
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<OpportunityCatalogItem>> {
    const response = await api.get<PaginatedResponse<OpportunityCatalogItem>>(
      '/opportunities',
      {
        params: filters,
        signal,
      },
    );
    return response.data;
  },

  async getOpportunity(
    opportunityId: number,
  ): Promise<OpportunityCatalogItem> {
    const response = await api.get<OpportunityCatalogItem>(
      `/opportunities/${opportunityId}`,
    );
    return response.data;
  },

  async getProfile(studentId: number): Promise<StudentProfileResponse> {
    const response = await api.get<StudentProfileResponse>(
      `/students/${studentId}/profile`,
    );
    return response.data;
  },

  async saveProfile(
    studentId: number,
    payload: any,
  ): Promise<StudentProfileResponse> {
    const response = await api.post<StudentProfileResponse>(
      `/students/${studentId}/profile`,
      payload,
    );
    return response.data;
  },

  async getResume(
    studentId: number,
  ): Promise<any> {
    const response = await api.get(`/students/${studentId}/resume`);
    return response.data;
  },

  async getRequirements(
    studentId: number,
  ): Promise<StudentRequirementsResponse> {
    const response = await api.get<StudentRequirementsResponse>(
      `/students/${studentId}/requirements`,
    );
    return response.data;
  },

  async uploadRequirement(
    studentId: number,
    file: File,
    requirementType: string,
    requirementName: string,
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('requirementType', requirementType);
    formData.append('requirementName', requirementName);

    const response = await api.post(
      `/students/${studentId}/requirements`,
      formData,
    );
    return response.data;
  },

  async getApplications(studentId: number): Promise<StudentApplicationDto[]> {
    const response = await api.get<StudentApplicationDto[]>(
      `/students/${studentId}/applications`,
    );
    return response.data;
  },

  async getApplicationStatus(
    studentId: number,
    applicationId: number,
  ): Promise<StudentApplicationStatusDto> {
    const response = await api.get<StudentApplicationStatusDto>(
      `/students/${studentId}/applications/${applicationId}/status`,
    );
    return response.data;
  },

  async submitApplication(
    studentId: number,
    opportunityId: number,
    remark?: string,
  ): Promise<any> {
    const response = await api.post(
      `/students/${studentId}/applications`,
      { opportunityId, remark },
    );
    return response.data;
  },

  async respondToOffer(
    studentId: number,
    applicationId: number,
    responseChoice: 'accepted' | 'declined',
  ): Promise<any> {
    const response = await api.patch(
      `/students/${studentId}/applications/${applicationId}/response`,
      { response: responseChoice },
    );
    return response.data;
  },

  async withdrawApplication(
    studentId: number,
    applicationId: number,
  ): Promise<any> {
    const response = await api.post(
      `/students/${studentId}/applications/${applicationId}/withdraw`,
      {},
    );
    return response.data;
  },

  async getAttendance(
    studentId: number,
    params?: { startDate?: string; endDate?: string },
  ): Promise<StudentAttendanceResponse> {
    const response = await api.get<StudentAttendanceResponse>(
      `/students/${studentId}/attendance`,
      { params },
    );
    return response.data;
  },

  async clockIn(
    studentId: number,
    internshipAssignmentId: number,
  ): Promise<any> {
    const response = await api.post(`/students/${studentId}/dtr/time-in`, {
      internshipAssignmentId,
    });
    return response.data;
  },

  async clockOut(
    studentId: number,
    internshipAssignmentId: number,
  ): Promise<any> {
    const response = await api.post(`/students/${studentId}/dtr/time-out`, {
      internshipAssignmentId,
    });
    return response.data;
  },
};
