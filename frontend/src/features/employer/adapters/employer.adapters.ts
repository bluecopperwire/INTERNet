import { publicUploadUrl } from '../../../utils/public-upload-url';
import { toDateOnly } from '../../../utils/date-only';
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
import { isTerminalReferral, referralDisplayStatus } from '../../workflow/status-mappings';

type EmployerInternshipDetailDto = {
  intern: {
    studentFullName: string;
    jobTitle: string;
    requiredHours: number;
  };
  assignment: {
    internshipAssignmentId: number;
    companyName: string;
    jobTitle: string;
    workingDays: string;
    requiredHours: number;
    startDate: unknown;
    expectedEndDate: unknown;
    startShift: string;
    endShift: string;
  };
  status: {
    assignmentStatus: string;
    renderedHours: number;
  };
};

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
    applicationDeadline: toDateOnly(dto.applicationDeadline),
    jobDescription: dto.description,
    qualifications: dto.qualification || '',
    status: dto.opportunityStatus === 'open' ? 'Open' : 'Closed',
    applicants: dto.totalApplicantCount,
  };
}

export function adaptEmployerReferral(
  r: EmployerReferralListItemDto | any,
): Applicant {
  const referral = r.referral || r;
  const application = r.application || r;
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
  const referralStatus = referral.referralStatus || r.referralStatus;
  const applicationStatus = application.applicationStatus || r.applicationStatus;
  const studentResponse = application.studentResponse || r.studentResponse || 'pending';
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
    status: referralDisplayStatus({
      applicationStatus,
      referralStatus,
      companyResponse: compResponse,
      studentResponse,
    }, 'For Review'),
    applicationStatus,
    referralStatus,
    companyResponse: compResponse,
    studentResponse,
    canHide: isTerminalReferral(referralStatus),
    email: student.contactEmail || 'N/A',
    phone: student.contactNumber || 'N/A',
    location: address,
    school: student.schoolName || 'N/A',
    preferredField: 'N/A',
    requiredHours: Number(internshipPref.requiredHours || 0),
    availabilityDays: internshipPref.availableDays || 'Weekdays',
    availabilityDate: toDateOnly(internshipPref.startDate) || 'N/A',
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
  i: EmployerInternshipListItemDto | EmployerInternshipDetailDto,
): EmployerInternshipDetails {
  const statusMap: Record<string, EmployerInternshipDetails['status']> = {
    ongoing: 'On Going',
    completed: 'Completed',
    pending: 'Awaiting Completion',
    withdrawn: 'Withdrawn by Student',
    cancelled: 'Cancelled',
  };

  const isDetail = 'assignment' in i;
  const assignment = isDetail ? i.assignment : null;
  const intern = isDetail ? i.intern : null;
  const status = isDetail ? i.status : null;
  const assignmentStatus = status?.assignmentStatus ??
    (isDetail ? '' : i.assignmentStatus);

  return {
    applicantId: String(
      assignment?.internshipAssignmentId ??
        (isDetail ? '' : i.internshipAssignmentId),
    ),
    studentName: intern?.studentFullName ??
      (isDetail ? 'Student Intern' : i.studentFullName),
    company: assignment?.companyName ?? 'Company',
    jobTitle: assignment?.jobTitle ?? intern?.jobTitle ??
      (isDetail ? '' : i.jobTitle),
    workingDays: assignment?.workingDays ?? 'weekdays',
    requiredHours: Number(
      assignment?.requiredHours ?? intern?.requiredHours ??
        (isDetail ? 0 : i.requiredHours),
    ),
    startDate: toDateOnly(assignment?.startDate),
    expectedEndDate: toDateOnly(assignment?.expectedEndDate),
    shiftStartTime: String(assignment?.startShift ?? '08:00').slice(0, 5),
    shiftEndTime: String(assignment?.endShift ?? '17:00').slice(0, 5),
    status: statusMap[assignmentStatus] || 'On Going',
    renderedHours: Number(
      status?.renderedHours ?? (isDetail ? 0 : i.renderedHours),
    ),
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
