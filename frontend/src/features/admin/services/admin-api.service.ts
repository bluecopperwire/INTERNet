import { api } from '../../../services/api';
import type {
  AdminMetricsDto,
  AdminStudentListItemDto,
  AdminEmployerListItemDto,
  AdminPesoListItemDto,
  AdminListResponse,
} from '../../../types/api';

export const adminApiService = {
  async getStudentMetrics(): Promise<AdminMetricsDto> {
    const response = await api.get<AdminMetricsDto>(
      '/dashboard/admin/students/metrics',
    );
    return response.data;
  },

  async getEmployerMetrics(): Promise<AdminMetricsDto> {
    const response = await api.get<AdminMetricsDto>(
      '/dashboard/admin/employers/metrics',
    );
    return response.data;
  },

  async getPesoMetrics(): Promise<AdminMetricsDto> {
    const response = await api.get<AdminMetricsDto>(
      '/dashboard/admin/peso-personnel/metrics',
    );
    return response.data;
  },

  async getStudents(params?: any): Promise<AdminListResponse<AdminStudentListItemDto>> {
    const response = await api.get<AdminListResponse<AdminStudentListItemDto>>(
      '/admin/students',
      { params },
    );
    return response.data;
  },

  async getStudent(studentId: number): Promise<any> {
    const response = await api.get(`/admin/students/${studentId}`);
    return response.data;
  },

  async updateStudent(studentId: number, payload: any): Promise<any> {
    const response = await api.patch(`/admin/students/${studentId}`, payload);
    return response.data;
  },

  async getEmployers(params?: any): Promise<AdminListResponse<AdminEmployerListItemDto>> {
    const response = await api.get<AdminListResponse<AdminEmployerListItemDto>>(
      '/admin/employers',
      { params },
    );
    return response.data;
  },

  async getEmployer(companyId: number): Promise<any> {
    const response = await api.get(`/admin/employers/${companyId}`);
    return response.data;
  },

  async updateEmployer(companyId: number, payload: any): Promise<any> {
    const response = await api.patch(`/admin/employers/${companyId}`, payload);
    return response.data;
  },

  async getPesoPersonnel(params?: any): Promise<AdminListResponse<AdminPesoListItemDto>> {
    const response = await api.get<AdminListResponse<AdminPesoListItemDto>>(
      '/admin/qc-peso',
      { params },
    );
    return response.data;
  },

  async getPesoUser(pesoPersonnelId: number): Promise<any> {
    const response = await api.get(`/admin/qc-peso/${pesoPersonnelId}`);
    return response.data;
  },

  async updatePesoUser(pesoPersonnelId: number, payload: any): Promise<any> {
    const response = await api.patch(
      `/admin/qc-peso/${pesoPersonnelId}`,
      payload,
    );
    return response.data;
  },

  async setStudentStatus(userAccountId: number, status: string): Promise<any> {
    const response = await api.patch(
      `/dashboard/admin/students/${userAccountId}`,
      { accountStatus: status },
    );
    return response.data;
  },

  async setEmployerStatus(userAccountId: number, status: string): Promise<any> {
    const response = await api.patch(
      `/dashboard/admin/employers/${userAccountId}`,
      { accountStatus: status },
    );
    return response.data;
  },

  async setPesoStatus(userAccountId: number, status: string): Promise<any> {
    const response = await api.patch(
      `/dashboard/admin/peso-personnel/${userAccountId}`,
      { accountStatus: status },
    );
    return response.data;
  },

  async createPesoUser(payload: any): Promise<any> {
    const response = await api.post('/users/peso-personnel', payload);
    return response.data;
  },

  async createCompanyUser(payload: any): Promise<any> {
    const response = await api.post('/users/companies', payload);
    return response.data;
  },

  async approvePesoVerification(id: number, remark?: string): Promise<any> {
    const response = await api.post(
      `/users/admin/peso-verifications/${id}/approve`,
      { remark },
    );
    return response.data;
  },

  async rejectPesoVerification(id: number, remark?: string): Promise<any> {
    const response = await api.post(
      `/users/admin/peso-verifications/${id}/reject`,
      { remark },
    );
    return response.data;
  },
};
