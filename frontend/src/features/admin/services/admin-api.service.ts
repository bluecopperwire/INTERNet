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

  async setAccountStatus(
    userAccountId: number,
    status: string,
    suspensionDays?: number,
  ): Promise<any> {
    const response = await api.patch(
      `/admin/accounts/${userAccountId}/status`,
      { status, ...(suspensionDays === undefined ? {} : { suspensionDays }) },
    );
    return response.data;
  },

  async createPesoUser(payload: any): Promise<any> {
    const response = await api.post('/admin/qc-peso', payload);
    return response.data;
  },

  async createCompanyUser(payload: any): Promise<any> {
    const response = await api.post('/admin/employers', payload);
    return response.data;
  },
};
