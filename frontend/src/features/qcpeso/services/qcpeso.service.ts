import { 
  MOCK_QCPESO_SUMMARY, 
  MOCK_QCPESO_PROFILE, 
  MOCK_STUDENTS, 
  MOCK_EMPLOYER_OPPORTUNITIES,
  MOCK_APPLICATIONS,
  MOCK_EMPLOYERS,
  MOCK_INTERNS,
  MOCK_REFERRALS
} from '../mocks/qcpeso.mock';
import type { 
  QCPesoDashboardSummary, 
  QCPesoProfile, 
  StudentApplication, 
  EmployerOpportunity,
  ApplicationItem,
  EmployerItem,
  InternItem,
  ReferralItem
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
    return new Promise((resolve) => setTimeout(() => resolve([...MOCK_EMPLOYER_OPPORTUNITIES]), 400));
  },

  async getApplications(): Promise<ApplicationItem[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...MOCK_APPLICATIONS]), 400));
  },

  async getEmployers(): Promise<EmployerItem[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...MOCK_EMPLOYERS]), 400));
  },

  async getInterns(): Promise<InternItem[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...MOCK_INTERNS]), 400));
  },

  async getReferrals(): Promise<ReferralItem[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...MOCK_REFERRALS]), 400));
  }
};