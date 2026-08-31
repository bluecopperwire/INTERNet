import { publicUploadUrl } from '../../../utils/public-upload-url';
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
  const acceptedPct =
    total > 0 ? Math.round((m.acceptedCount / total) * 100) : 0;
  const rejectedPct =
    total > 0 ? Math.round((m.rejectedCount / total) * 100) : 0;

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
    allowance: dto.allowance ? String(dto.allowance) : '',
    applicationDeadline: dto.applicationDeadline
      ? dto.applicationDeadline.split('T')[0]
      : '',
    jobDescription: dto.description,
    qualifications: dto.qualification || '',
    status: dto.opportunityStatus === 'open' ? 'Open' : 'Closed',
    applicants: dto.totalApplicantCount,
  };
}

export function adaptEmployerReferral(
  r: EmployerReferralListItemDto | any,
): Applicant {
  const statusMap: Record<string, any> = {
    pending: 'Pending',
    for_interview: 'For Interview',
    accepted: 'Accepted',
    rejected: 'Rejected',
  };

  const referral = r.referral || r;
  const student = r.student || {};
  const opportunity = r.opportunity || {};
  const internshipPref = r.internshipPreference || {};

  const referralId = referral.referralId || r.referralId;
  const fullName = student.fullName || r.studentFullName || 'Applicant';
  const oppId = opportunity.opportunityId || r.opportunityId || '';
  const oppTitle = opportunity.title || r.opportunityTitle || 'Opportunity';
  const strandProg = student.strandProgram || r.strandProgram || 'N/A';
  const yLevel = student.yearLevel || r.yearLevel || 'N/A';
  const compResponse =
    referral.companyResponse || r.companyResponse || 'pending';
  const subAt = r.application?.submittedAt || r.submittedAt;

  const address =
    [student.addressLine, student.addressBarangay, student.addressCity]
      .filter(Boolean)
      .join(', ') || 'Quezon City';

  return {
    id: String(referralId),
    name: fullName,
    opportunityId: String(oppId),
    opportunityTitle: oppTitle,
    course: strandProg,
    yearLevel: yLevel,
    dateApplied: subAt
      ? new Date(subAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'N/A',
    status: statusMap[compResponse] || 'Pending',
    email: student.contactEmail || 'N/A',
    phone: student.contactNumber || 'N/A',
    location: address,
    school: student.schoolName || 'N/A',
    preferredField: 'N/A',
    requiredHours: Number(internshipPref.requiredHours || 0),
    availabilityDays: internshipPref.availableDays || 'Weekdays',
    availabilityDate: internshipPref.startDate || 'N/A',
    profileImageUrl: publicUploadUrl(
      student.photoFilePath || r.photoFilePath,
      student.profileUpdatedAt || r.profileUpdatedAt,
    ),
    documents: Array.isArray(r.documents) ? r.documents : undefined,
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
  const logoUrl = publicUploadUrl(dto.logoFilePath, dto.updatedAt);

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
