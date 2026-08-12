import { 
  MOCK_QCPESO_SUMMARY, 
  MOCK_QCPESO_PROFILE, 
  MOCK_STUDENTS, 
  MOCK_EMPLOYERS 
} from '../mocks/qcpeso.mock';
import type { 
  QCPesoDashboardSummary, 
  QCPesoProfile, 
  StudentApplication, 
  EmployerOpportunity 
} from '../types/qcpeso.types';

export const qcpesoService = {
  async getDashboardSummary(): Promise<QCPesoDashboardSummary> {
    return new Promise((resolve) => setTimeout(() => resolve({ ...MOCK_QCPESO_SUMMARY }), 400));
  },

  async getProfile(): Promise<QCPesoProfile> {
    return new Promise((resolve) => setTimeout(() => resolve({ ...MOCK_QCPESO_PROFILE }), 400));
  },

  async getRecentStudents(): Promise<StudentApplication[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...MOCK_STUDENTS]), 400));
  },

  async getRecentEmployers(): Promise<EmployerOpportunity[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...MOCK_EMPLOYERS]), 400));
  }
};