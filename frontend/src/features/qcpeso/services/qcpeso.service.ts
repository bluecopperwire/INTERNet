import { 
  MOCK_QCPESO_SUMMARY, 
  MOCK_QCPESO_PROFILE, 
  MOCK_APPLICATIONS,
  MOCK_EMPLOYERS,
  MOCK_MONITORED_COMPANIES,
  MOCK_MONITORED_STUDENTS,
  MOCK_QCPESO_OPPORTUNITIES,
  MOCK_QCPESO_REFERRALS,
  MOCK_QCPESO_REVIEW_APPLICANTS,
  MOCK_QCPESO_ATTENDANCE,
  MOCK_QCPESO_INTERNSHIPS,
} from '../mocks/qcpeso.mock';
import type { 
  QCPesoDashboardSummary, 
  QCPesoProfile, 
  StudentApplication, 
  ApplicationItem,
  EmployerItem,
  MonitoredCompanyUser,
  MonitoredStudentUser,
  QCPesoOpportunity,
  QCPesoReferral,
  QCPesoReviewApplicant,
  QCPesoAttendanceRecord,
  QCPesoInternshipRecord,
  CreateEmployerPayload,
} from '../types/qcpeso.types';

let currentReviewApplicants = MOCK_QCPESO_REVIEW_APPLICANTS.map((applicant) => ({ ...applicant }))
let currentMonitoredCompanies = MOCK_MONITORED_COMPANIES.map((company) => ({ ...company }))
let currentQCPesoProfile: QCPesoProfile = { ...MOCK_QCPESO_PROFILE }

function dashboardApplicationToReviewApplicant(application: ApplicationItem): QCPesoReviewApplicant {
  const status: QCPesoReviewApplicant['status'] = application.verificationStatus === 'Rejected'
    ? 'Rejected'
    : application.verificationStatus === 'Pending'
      ? 'Pending'
      : 'Pending'

  return {
    id: application.id,
    studentName: application.studentName,
    company: 'Metropolitan Tech Solutions',
    jobTitle: application.appliedFor,
    program: application.program,
    yearLevel: '3rd Year',
    dateApplied: application.dateSubmitted,
    status,
    email: application.email,
    phone: application.phone,
    address: 'Quezon City, Philippines',
    school: application.school,
    requiredHours: 200,
    availableDays: 'Weekdays',
    availableStartingDate: 'August 25, 2026',
    opportunityId: 'OPP-001',
  }
}

export const qcpesoService = {
  async getDashboardSummary(): Promise<QCPesoDashboardSummary> {
    return new Promise((resolve) => setTimeout(() => resolve({ ...MOCK_QCPESO_SUMMARY }), 400));
  },

  async getProfile(): Promise<QCPesoProfile> {
    return new Promise((resolve) => setTimeout(() => resolve({ ...currentQCPesoProfile }), 400));
  },

  async updateProfile(profile: QCPesoProfile): Promise<QCPesoProfile> {
    currentQCPesoProfile = { ...profile }
    return new Promise((resolve) => setTimeout(() => resolve({ ...currentQCPesoProfile }), 250))
  },

  async getRecentStudents(): Promise<StudentApplication[]> {
    const recentStudents = MOCK_APPLICATIONS
      .map((application) => ({
        id: application.id,
        name: application.studentName,
        school: application.school,
        program: application.program,
        date: application.dateSubmitted,
        status: application.verificationStatus,
        email: application.email,
        phone: application.phone,
        gwa: application.gwa,
        submittedDocuments: application.submittedDocuments,
        appliedFor: application.appliedFor,
      }))
      .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
      .slice(0, 10)

    return new Promise((resolve) => setTimeout(() => resolve(recentStudents), 400));
  },

  async getApplications(): Promise<ApplicationItem[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...MOCK_APPLICATIONS]), 400));
  },

  async getEmployers(): Promise<EmployerItem[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...MOCK_EMPLOYERS]), 400));
  },

  async getMonitoredStudents(): Promise<MonitoredStudentUser[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...MOCK_MONITORED_STUDENTS]), 400));
  },

  async getMonitoredStudent(id: string): Promise<MonitoredStudentUser | null> {
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_MONITORED_STUDENTS.find((student) => student.id === id) ?? null), 400));
  },

  async getMonitoredCompanies(): Promise<MonitoredCompanyUser[]> {
    return new Promise((resolve) => setTimeout(() => resolve(currentMonitoredCompanies.map((company) => ({ ...company }))), 400));
  },

  async getMonitoredCompany(id: string): Promise<MonitoredCompanyUser | null> {
    return new Promise((resolve) => setTimeout(() => resolve(currentMonitoredCompanies.find((company) => company.id === id) ?? null), 400));
  },

  async createEmployer(payload: CreateEmployerPayload): Promise<MonitoredCompanyUser> {
    const company: MonitoredCompanyUser = {
      id: `COM-${String(currentMonitoredCompanies.length + 1).padStart(3, '0')}`,
      companyName: payload.companyName,
      email: payload.loginEmail,
      contactNumber: payload.contactNumber,
      dateRegistered: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      status: 'Active',
      description: payload.description,
      address: [payload.addressLine, payload.barangay, payload.district, payload.city].filter(Boolean).join(', '),
      companyType: payload.companyType,
      industry: payload.industry,
      companySize: payload.companySize || 'Not provided',
      yearEstablished: payload.yearEstablished || 'Not provided',
      websiteUrl: payload.websiteUrl || 'Not provided',
      contactPerson: [payload.contactFirstName, payload.contactMiddleName, payload.contactLastName, payload.contactSuffix].filter(Boolean).join(' '),
    }
    currentMonitoredCompanies = [...currentMonitoredCompanies, company]
    return new Promise((resolve) => setTimeout(() => resolve({ ...company }), 250))
  },

  async getReviewApplicants(): Promise<QCPesoReviewApplicant[]> {
    return new Promise((resolve) => setTimeout(() => resolve(currentReviewApplicants.map((applicant) => ({ ...applicant }))), 250))
  },

  async getReviewApplicant(id: string): Promise<QCPesoReviewApplicant | null> {
    const dashboardApplication = MOCK_APPLICATIONS.find((application) => application.id === id)
    const reviewApplicant = currentReviewApplicants.find((applicant) => applicant.id === id)
      ?? (dashboardApplication ? dashboardApplicationToReviewApplicant(dashboardApplication) : null)
    return new Promise((resolve) => setTimeout(() => resolve(reviewApplicant), 250))
  },

  async updateReviewApplicantStatus(id: string, status: QCPesoReviewApplicant['status']): Promise<QCPesoReviewApplicant | null> {
    let index = currentReviewApplicants.findIndex((applicant) => applicant.id === id)
    if (index < 0) {
      const dashboardApplication = MOCK_APPLICATIONS.find((application) => application.id === id)
      if (!dashboardApplication) return null
      currentReviewApplicants = [...currentReviewApplicants, dashboardApplicationToReviewApplicant(dashboardApplication)]
      index = currentReviewApplicants.length - 1
    }

    currentReviewApplicants[index] = { ...currentReviewApplicants[index], status }
    return new Promise((resolve) => setTimeout(() => resolve({ ...currentReviewApplicants[index] }), 250))
  },

  async getReferrals(): Promise<QCPesoReferral[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...MOCK_QCPESO_REFERRALS]), 250))
  },

  async getReferral(id: string): Promise<QCPesoReferral | null> {
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_QCPESO_REFERRALS.find((referral) => referral.id === id) ?? null), 250))
  },

  async getQCPesoOpportunity(id: string): Promise<QCPesoOpportunity | null> {
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_QCPESO_OPPORTUNITIES.find((opportunity) => opportunity.id === id) ?? null), 250))
  },

  async getAttendanceRecords(): Promise<QCPesoAttendanceRecord[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...MOCK_QCPESO_ATTENDANCE]), 250))
  },

  async getInternships(): Promise<QCPesoInternshipRecord[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...MOCK_QCPESO_INTERNSHIPS]), 250))
  },

  async getInternship(id: string): Promise<QCPesoInternshipRecord | null> {
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_QCPESO_INTERNSHIPS.find((internship) => internship.id === id) ?? null), 250))
  },

};
