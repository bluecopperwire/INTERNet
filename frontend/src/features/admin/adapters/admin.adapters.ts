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
import { publicUploadUrl } from '../../../utils/public-upload-url';
import { toDateOnly } from '../../../utils/date-only';

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
  const data = dto as AdminStudentListItemDto & Record<string, any>;
  const statusMap: Record<string, any> = {
    active: 'Active',
    suspended: 'Suspended',
    archived: 'Deactivated',
  };
  const preferred = Array.isArray(data.preferredIndustries)
    ? data.preferredIndustries
    : [];
  const custom = preferred.find((item: any) => item.customIndustryName);

  return {
    id: String(dto.studentId),
    userAccountId: String(dto.userAccountId),
    studentId: String(dto.studentId),
    fullName: dto.fullName,
    email: dto.accountEmail,
    status: statusMap[dto.accountStatus] || 'Active',
    suspensionDaysRemaining: remainingDays(data.suspendedUntil),
    dateCreated: formatTableDate(dto.createdAt),
    role: 'Student',
    profileImageUrl: publicUploadUrl(
      data.photoFilePath,
      data.profileUpdatedAt,
    ),
    firstName: data.firstName,
    middleName: data.middleName || '',
    lastName: data.lastName,
    suffix: data.extensionName || '',
    sex: data.sex === 'Male' || data.sex === 'Female' ? data.sex : 'Other',
    birthdate: toDateOnly(data.birthDate) || 'N/A',
    contactNumber: data.contactNumber || 'N/A',
    fullAddress: [data.addressLine, data.addressBarangay, data.addressDistrict, data.addressCity].filter(Boolean).join(', ') || 'Quezon City',
    addressStreet: data.addressLine || '',
    addressBarangay: data.addressBarangay || '',
    addressDistrict: data.addressDistrict || '',
    addressCity: data.addressCity || '',
    linkedinUrl: data.linkedinUrl || '',
    inquiryVia: 'online',
    schoolName: data.schoolName || 'N/A',
    programStrand: data.strandProgram || 'N/A',
    yearLevel: yearLevelToUi(data.yearLevel),
    requiredHours: String(data.requiredHours || 0),
    flexibleAssignment: Boolean(data.allowsOutsidePreferredField),
    preferredIndustries: preferred.map((item: any) => item.customIndustryName ? 'Other' : item.industryName),
    otherPreferredField: custom?.customIndustryName || '',
    scheduleAvailability: [scheduleToUi(data.availableDays)],
    startDate: toDateOnly(data.startDate) || 'N/A',
    hostOrgType: data.preferredCompanyType === 'government' ? 'Government' : 'Private',
  };
}

export function adaptAdminEmployerItem(dto: AdminEmployerListItemDto): EmployerRecord {
  const data = dto as AdminEmployerListItemDto & Record<string, any>;
  const statusMap: Record<string, any> = {
    active: 'Active',
    suspended: 'Suspended',
    archived: 'Deactivated',
  };

  return {
    id: String(dto.companyId),
    userAccountId: String(dto.userAccountId),
    companyId: String(dto.companyId),
    fullName: dto.companyName,
    companyName: dto.companyName,
    email: dto.accountEmail,
    status: statusMap[dto.accountStatus] || 'Active',
    suspensionDaysRemaining: remainingDays(data.suspendedUntil),
    dateCreated: formatTableDate(dto.createdAt),
    role: 'Employer',
    profileImageUrl: publicUploadUrl(
      data.logoFilePath,
      data.profileUpdatedAt,
    ),
    industry: data.industryName || 'N/A',
    companyType: data.companyType === 'government' ? 'Government' : 'Private',
    location: [data.addressLine, data.addressBarangay, data.addressDistrict, data.addressCity].filter(Boolean).join(', ') || 'Quezon City',
    addressLine: data.addressLine || '',
    addressBarangay: data.addressBarangay || '',
    addressDistrict: data.addressDistrict || '',
    addressCity: data.addressCity || '',
    description: data.description || '',
    companyWebsite: data.websiteUrl || '',
    yearEstablished: String(data.yearEstablished || ''),
    companySize: String(data.companySize || ''),
    contactPerson: data.contactPersonFullName || 'N/A',
    contactFirstName: data.contactPersonFirstName || '',
    contactMiddleName: data.contactPersonMiddleName || '',
    contactLastName: data.contactPersonLastName || '',
    contactSuffix: data.contactPersonExtensionName || '',
    contactEmail: data.contactEmail || '',
    contactNumber: data.contactNumber || 'N/A',
    verificationStatus: 'Verified',
  };
}

export function adaptAdminPesoItem(dto: AdminPesoListItemDto): QCPesoRecord {
  const data = dto as AdminPesoListItemDto & Record<string, any>;
  const statusMap: Record<string, any> = {
    active: 'Active',
    suspended: 'Suspended',
    archived: 'Deactivated',
  };

  return {
    id: String(dto.pesoPersonnelId),
    userAccountId: String(dto.userAccountId),
    fullName: dto.fullName,
    email: dto.accountEmail,
    employeeId: dto.employeeId,
    status: statusMap[dto.accountStatus] || 'Active',
    suspensionDaysRemaining: remainingDays(data.suspendedUntil),
    dateCreated: formatTableDate(dto.createdAt),
    role: 'QC PESO Personnel',
    profileImageUrl: publicUploadUrl(
      data.photoFilePath,
      data.profileUpdatedAt,
    ),
    firstName: data.firstName || dto.fullName.split(' ')[0] || '',
    middleName: data.middleName || '',
    lastName: data.lastName || dto.fullName.split(' ').slice(1).join(' ') || '',
    suffix: data.extensionName || '',
    birthdate: toDateOnly(data.birthDate) || 'N/A',
    sex: data.sex === 'Male' || data.sex === 'Female' ? data.sex : 'Other',
    addressLine: data.addressLine || '',
    barangay: data.addressBarangay || '',
    district: data.addressDistrict || '',
    city: data.addressCity || '',
    position: data.position || 'PESO Officer',
    department: data.department || 'PESO',
    contactNumber: data.contactNumber || 'N/A',
    contactEmail: data.contactEmail || '',
  };
}

function remainingDays(value?: string | null): number | undefined {
  if (!value) return undefined;
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000));
}

function yearLevelToUi(value?: string): string {
  const labels: Record<string, string> = {
    grade_11: 'Grade 11',
    grade_12: 'Grade 12',
    first_year_college: '1st Year',
    second_year_college: '2nd Year',
    third_year_college: '3rd Year',
    fourth_year_college: '4th Year',
  };
  return value ? labels[value] || value : 'N/A';
}

function scheduleToUi(value?: string): string {
  const labels: Record<string, string> = {
    weekdays: 'Weekdays',
    weekends: 'Weekends',
    flexible: 'Flexible',
  };
  return value ? labels[value] || value : 'Weekdays';
}
import { formatTableDate } from '../../../utils/date-only'
