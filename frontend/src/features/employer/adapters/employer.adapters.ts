import { API_BASE_URL } from '../../../services/api';
import type {
  EmployerDashboardMetricsDto,
  EmployerOpportunityDto,
  EmployerReferralListItemDto,
  EmployerAttendanceItemDto,
  EmployerInternshipListItemDto,
} from '../../../types/api';
import type {
  EmployerDashboardSummary,
  Opportunity,
  Applicant,
  CompanyProfile,
  EmployerAttendanceRecord,
  EmployerInternshipDetails,
} from '../types/employer.types';

export function adaptEmployerDashboardSummary(
  m: EmployerDashboardMetricsDto,
  companyName = 'Partner Company',
): EmployerDashboardSummary {
  const total = m.totalApplicants || 0;
  const acceptedPct = total > 0 ? Math.round((m.acceptedCount / total) * 100) : 0;
  const rejectedPct = total > 0 ? Math.round((m.rejectedCount / total) * 100) : 0;

  return {
    companyName,
    activeOpportunities: m.activeOpportunities,
    totalApplicants: m.totalApplicants,
    acceptedPercentage: acceptedPct,
    rejectedPercentage: rejectedPct,
    pendingReviews: m.pendingReviews,
    acceptanceRate: acceptedPct,
  };
}

export function adaptEmployerOpportunity(
  dto: EmployerOpportunityDto,
): Opportunity {
  const workSetupMap: Record<string, 'On-site' | 'Remote' | 'Hybrid'> = {
    onsite: 'On-site',
    remote: 'Remote',
    hybrid: 'Hybrid',
  };

  return {
    id: String(dto.opportunityId),
    title: dto.title,
    department: dto.department,
    workArrangement: workSetupMap[dto.workArrangement] || 'On-site',
    slots: dto.offeredSlots,
    duration: dto.minimumRequiredHours,
    allowance: dto.allowance ? `PHP ${dto.allowance}` : 'None',
    applicationDeadline: dto.applicationDeadline,
    jobDescription: dto.description,
    qualifications: dto.qualification || 'None specified',
    status: dto.opportunityStatus === 'open' ? 'Open' : 'Closed',
    applicants: dto.totalApplicantCount,
  };
}

export function adaptEmployerReferral(
  r: EmployerReferralListItemDto,
): Applicant {
  const statusMap: Record<string, any> = {
    pending: 'Pending',
    for_interview: 'For Interview',
    accepted: 'Accepted',
    rejected: 'Rejected',
  };

  return {
    id: String(r.referralId),
    name: r.studentFullName,
    opportunityId: String(r.opportunityId),
    opportunityTitle: r.opportunityTitle,
    course: r.strandProgram || 'N/A',
    yearLevel: r.yearLevel || 'N/A',
    dateApplied: new Date(r.submittedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    status: statusMap[r.companyResponse] || 'Pending',
    email: 'N/A',
    phone: 'N/A',
    location: 'Quezon City',
    school: 'N/A',
    preferredField: 'N/A',
    requiredHours: 0,
    availabilityDays: 'Weekdays',
    availabilityDate: 'N/A',
  };
}

export function adaptEmployerAttendance(
  a: EmployerAttendanceItemDto,
): EmployerAttendanceRecord {
  const statusMap: Record<string, 'Present' | 'Absent' | 'Late'> = {
    present: 'Present',
    late: 'Late',
    absent: 'Absent',
  };

  return {
    id: String(a.internshipAssignmentId),
    applicantId: String(a.internshipAssignmentId),
    studentName: a.studentFullName,
    role: a.jobTitle,
    company: 'Company',
    date: a.date,
    timeIn: a.timeIn ? String(a.timeIn).substring(0, 5) : 'N/A',
    timeOut: a.timeOut ? String(a.timeOut).substring(0, 5) : 'N/A',
    status: statusMap[a.status] || 'Present',
    hoursRendered: a.renderedHours,
    requiredHours: 0,
  };
}

export function adaptEmployerInternship(
  i: EmployerInternshipListItemDto,
): EmployerInternshipDetails {
  const statusMap: Record<string, any> = {
    ongoing: 'On Going',
    completed: 'Completed',
    pending: 'Awaiting Completion',
    withdrawn: 'Withdrawn by Student',
    cancelled: 'Cancelled',
  };

  return {
    applicantId: String(i.internshipAssignmentId),
    studentName: i.studentFullName,
    company: 'Company',
    jobTitle: i.jobTitle,
    workingDays: 'Weekdays',
    requiredHours: i.requiredHours,
    startDate: 'N/A',
    expectedEndDate: 'N/A',
    shiftStartTime: '08:00 AM',
    shiftEndTime: '05:00 PM',
    status: statusMap[i.assignmentStatus] || 'On Going',
    renderedHours: i.renderedHours,
  };
}

export function adaptCompanyProfile(dto: any): CompanyProfile {
  let logoUrl: string | undefined = undefined;
  if (dto.logoFilePath) {
    logoUrl = `${API_BASE_URL}/${dto.logoFilePath.replace(/^\/+/, '')}`;
  }

  return {
    company_name: dto.companyName || '',
    company_type: dto.companyType === 'government' ? 'Government' : 'Private',
    industry: String(dto.industryId || ''),
    description: dto.description || '',
    website_url: dto.websiteUrl || null,
    year_established: dto.yearEstablished ? String(dto.yearEstablished) : null,
    company_size: dto.companySize ? String(dto.companySize) : null,
    address_line: dto.addressLine || '',
    address_barangay: dto.addressBarangay || '',
    address_district: dto.addressDistrict || null,
    address_city: dto.addressCity || '',
    contact_email: dto.contactEmail || '',
    contact_number: dto.contactNumber || '',
    contact_person_first_name: dto.contactPersonFirstName || '',
    contact_person_middle_name: dto.contactPersonMiddleName || null,
    contact_person_last_name: dto.contactPersonLastName || '',
    contact_person_extension_name: dto.contactPersonExtensionName || null,
    logoUrl,
  };
}
