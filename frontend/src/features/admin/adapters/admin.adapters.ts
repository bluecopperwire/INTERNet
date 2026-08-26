import type {
  AdminMetricsDto,
  AdminStudentListItemDto,
  AdminEmployerListItemDto,
  AdminPesoListItemDto,
} from '../../../types/api';
import type {
  StudentRecord,
  EmployerRecord,
  QCPesoRecord,
  AdminDashboardSummary,
} from '../types/admin.types';

export function adaptAdminDashboardSummary(
  studentMetrics: AdminMetricsDto,
  employerMetrics: AdminMetricsDto,
  _pesoMetrics: AdminMetricsDto,
): AdminDashboardSummary {
  return {
    totalStudents: studentMetrics.totalRegistered,
    activeStudents: studentMetrics.activeAccounts,
    totalEmployers: employerMetrics.totalRegistered,
    totalAvailableOpportunities: employerMetrics.activeAccounts,
    systemHealth: {
      serverStatus: 'Operational',
      uptime: '99.9%',
      databaseLoad: 'Normal',
      activeSessions: studentMetrics.activeAccounts + employerMetrics.activeAccounts,
      lastBackup: 'N/A',
      storageUsedPercent: 25,
    },
  };
}

export function adaptAdminStudentItem(dto: AdminStudentListItemDto): StudentRecord {
  const statusMap: Record<string, any> = {
    active: 'Active',
    suspended: 'Suspended',
    archived: 'Deactivated',
  };

  return {
    id: String(dto.userAccountId),
    studentId: String(dto.studentId),
    fullName: dto.fullName,
    email: dto.accountEmail,
    status: statusMap[dto.accountStatus] || 'Active',
    dateCreated: new Date(dto.createdAt).toLocaleDateString(),
    role: 'Student',
    sex: 'Other',
    birthdate: 'N/A',
    contactNumber: 'N/A',
    fullAddress: 'Quezon City',
    inquiryVia: 'online',
    schoolName: 'N/A',
    programStrand: 'N/A',
    yearLevel: 'N/A',
    requiredHours: '0',
    flexibleAssignment: false,
    preferredIndustries: [],
    scheduleAvailability: ['weekdays'],
    startDate: 'N/A',
    hostOrgType: 'private',
  };
}

export function adaptAdminEmployerItem(dto: AdminEmployerListItemDto): EmployerRecord {
  const statusMap: Record<string, any> = {
    active: 'Active',
    suspended: 'Suspended',
    archived: 'Deactivated',
  };

  return {
    id: String(dto.userAccountId),
    companyId: String(dto.companyId),
    fullName: dto.companyName,
    companyName: dto.companyName,
    email: dto.accountEmail,
    status: statusMap[dto.accountStatus] || 'Active',
    dateCreated: new Date(dto.createdAt).toLocaleDateString(),
    role: 'Employer',
    industry: 'N/A',
    companyType: 'Private',
    location: 'Quezon City',
    companyWebsite: 'N/A',
    yearEstablished: 'N/A',
    companySize: 'N/A',
    contactPerson: 'N/A',
    contactNumber: 'N/A',
    verificationStatus: 'Verified',
  };
}

export function adaptAdminPesoItem(dto: AdminPesoListItemDto): QCPesoRecord {
  const statusMap: Record<string, any> = {
    active: 'Active',
    suspended: 'Suspended',
    archived: 'Deactivated',
  };

  return {
    id: String(dto.userAccountId),
    fullName: dto.fullName,
    firstName: dto.fullName.split(' ')[0] || '',
    middleName: '',
    lastName: dto.fullName.split(' ').slice(1).join(' ') || '',
    email: dto.accountEmail,
    employeeId: dto.employeeId,
    status: statusMap[dto.accountStatus] || 'Active',
    dateCreated: new Date(dto.createdAt).toLocaleDateString(),
    role: 'QC PESO Personnel',
    birthdate: 'N/A',
    position: 'PESO Officer',
    department: 'PESO',
    contactNumber: 'N/A',
    verificationStatus: 'Approved',
  };
}
