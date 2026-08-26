import type {
  PesoStudentMetricsDto,
  DashboardApplicationDto,
  PesoReferralDto,
  PesoInternSummaryDto,
  PesoDtrEntryDto,
} from '../../../types/api';
import type {
  QCPesoDashboardSummary,
  QCPesoReviewApplicant,
  QCPesoReferral,
  QCPesoInternshipRecord,
  QCPesoAttendanceRecord,
  QCPesoProfile,
  MonitoredStudentUser,
  MonitoredCompanyUser,
} from '../types/qcpeso.types';

export function adaptPesoDashboardMetrics(
  m: PesoStudentMetricsDto,
): QCPesoDashboardSummary {
  return {
    pendingApplications: m.totalPendingApplications,
    activeEmployers: m.totalActiveEmployers,
    verifiedRequirements: 0,
    availableOpportunities: m.totalAvailableOpportunities,
  };
}

export function adaptPesoApplication(
  d: DashboardApplicationDto,
): QCPesoReviewApplicant {
  const statusMap: Record<string, any> = {
    submitted: 'Pending',
    under_review: 'Pending',
    approved_for_referral: 'Accepted',
    rejected_for_referral: 'Rejected',
    withdrawn: 'Rejected',
    closed: 'Rejected',
  };

  return {
    id: String(d.applicationId),
    studentName: d.studentFullName,
    company: d.companyName,
    jobTitle: d.opportunityTitle,
    program: d.strandProgram || 'N/A',
    yearLevel: d.yearLevel || 'N/A',
    dateApplied: new Date(d.submittedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    status: statusMap[d.applicationStatus] || 'Pending',
    email: d.studentContactEmail,
    phone: d.studentContactNumber,
    address: 'Quezon City',
    school: d.schoolName || 'N/A',
    requiredHours: 0,
    availableDays: 'Weekdays',
    availableStartingDate: 'N/A',
    opportunityId: String(d.opportunityId),
  };
}

export function adaptPesoReferral(r: PesoReferralDto): QCPesoReferral {
  const compMap: Record<string, any> = {
    pending: 'Pending',
    for_interview: 'For Interview',
    accepted: 'Accepted',
    rejected: 'Rejected',
  };
  const studMap: Record<string, any> = {
    pending: 'Pending',
    accepted: 'Accepted',
    declined: 'Rejected',
  };

  return {
    id: String(r.referralId),
    studentName: r.studentFullName,
    company: r.companyName,
    jobTitle: r.opportunityTitle,
    referralDate: new Date(r.referredAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    companyResponse: compMap[r.companyResponse] || 'Pending',
    studentResponse: studMap[r.companyResponse] || 'Pending',
    email: r.studentContactEmail,
    phone: r.studentContactNumber,
    address: 'Quezon City',
  };
}

export function adaptPesoIntern(s: PesoInternSummaryDto): QCPesoInternshipRecord {
  const statusMap: Record<string, any> = {
    ongoing: 'On Going',
    completed: 'Completed',
    pending: 'Awaiting Completion',
    withdrawn: 'Withdrawn by Student',
    cancelled: 'Cancelled',
  };

  return {
    id: String(s.internshipAssignmentId),
    studentName: s.studentFullName,
    company: s.companyName,
    jobTitle: s.opportunityTitle,
    workingDays: 'Weekdays',
    requiredHours: s.requiredHours,
    startDate: s.firstAttendanceDate || 'N/A',
    expectedEndDate: s.latestAttendanceDate || 'N/A',
    shiftStartTime: '08:00 AM',
    shiftEndTime: '05:00 PM',
    status: statusMap[s.assignmentStatus] || 'On Going',
    renderedHours: Number(s.totalRenderedHours || 0),
  };
}

export function adaptPesoDtr(d: PesoDtrEntryDto): QCPesoAttendanceRecord {
  const statusMap: Record<string, any> = {
    on_time: 'Present',
    late: 'Late',
  };

  return {
    id: String(d.attendanceRecordId),
    internshipId: String(d.internshipAssignmentId),
    studentName: d.studentFullName,
    company: d.company,
    jobTitle: d.role,
    date: d.dtrDate,
    timeIn: d.timeIn ? String(d.timeIn).substring(0, 5) : 'N/A',
    timeOut: d.timeOut ? String(d.timeOut).substring(0, 5) : 'N/A',
    status: statusMap[d.timeInStatus] || 'Present',
    hoursRendered: Number(d.totalHours || 0),
  };
}

export function adaptPesoProfile(p: any): QCPesoProfile {
  return {
    id: String(p.pesoPersonnelId),
    firstName: p.firstName,
    middleName: p.middleName || '',
    lastName: p.lastName,
    suffix: p.extensionName || '',
    birthdate: p.birthDate || '',
    sex: p.sex === 'female' ? 'Female' : 'Male',
    addressLine: p.addressLine || '',
    barangay: p.addressBarangay || '',
    district: p.addressDistrict || '',
    city: p.addressCity || '',
    email: p.contactEmail || p.email,
    mobileNumber: p.contactNumber || '',
    employeeIdNumber: p.employeeId || '',
    position: p.position || 'PESO Officer',
    department: p.department || 'PESO',
    fullName: `${p.firstName} ${p.lastName}`,
    role: 'QC PESO Personnel',
    location: `${p.addressBarangay || ''}, ${p.addressCity || ''}`,
    qcpesoPosition: p.position || 'PESO Officer',
  };
}

export function adaptMonitoredStudent(row: any): MonitoredStudentUser {
  return {
    id: String(row.student_id),
    studentName: row.full_name,
    email: row.contact_email,
    mobileNumber: row.contact_number,
    linkedIn: '',
    dateRegistered: new Date(row.created_at).toLocaleDateString(),
    status: row.account_status === 'active' ? 'Active' : 'Suspended',
    address: `${row.address_barangay || ''}, ${row.address_city || ''}`,
    birthdate: 'N/A',
    sex: 'N/A',
    school: row.school_name || 'N/A',
    program: row.strand_program || 'N/A',
    yearLevel: row.year_level || 'N/A',
    requiredHours: 'N/A',
    preferredHostOrganizationType: 'N/A',
    internshipDaysAvailability: 'N/A',
    internshipStartDateAvailability: 'N/A',
    preferredField: 'N/A',
    willingOutsidePreferredField: 'N/A',
  };
}

export function adaptMonitoredCompany(row: any): MonitoredCompanyUser {
  return {
    id: String(row.company_id),
    companyName: row.company_name,
    email: row.contact_email,
    contactNumber: row.contact_number,
    dateRegistered: new Date(row.created_at).toLocaleDateString(),
    status: row.account_status === 'active' ? 'Active' : 'Suspended',
    description: row.description || '',
    address: `${row.address_barangay || ''}, ${row.address_city || ''}`,
    companyType: row.company_type === 'government' ? 'Government' : 'Private',
    industry: row.industry_name || 'N/A',
    companySize: String(row.company_size || 'N/A'),
    yearEstablished: String(row.year_established || 'N/A'),
    websiteUrl: row.website_url || '',
    contactPerson: `${row.contact_person_first_name || ''} ${row.contact_person_last_name || ''}`.trim(),
  };
}
