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

export function formatYearLevel(value?: string | null): string {
  if (!value) return 'N/A';
  const labels: Record<string, string> = {
    grade_11: 'Grade 11',
    grade_12: 'Grade 12',
    first_year_college: '1st Year',
    second_year_college: '2nd Year',
    third_year_college: '3rd Year',
    fourth_year_college: '4th Year',
    fifth_year_college: '5th Year',
    '1st_year': '1st Year',
    '2nd_year': '2nd Year',
    '3rd_year': '3rd Year',
    '4th_year': '4th Year',
    '5th_year': '5th Year',
    first_year: '1st Year',
    second_year: '2nd Year',
    third_year: '3rd Year',
    fourth_year: '4th Year',
    fifth_year: '5th Year',
  };
  const key = value.toLowerCase().trim();
  if (labels[key]) return labels[key];

  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function formatScheduleDays(value?: string | null): string {
  if (!value) return 'Weekdays';
  const labels: Record<string, string> = {
    weekdays: 'Weekdays',
    weekends: 'Weekends',
    flexible: 'Flexible',
  };
  const key = value.toLowerCase().trim();
  if (labels[key]) return labels[key];

  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function adaptPesoApplication(
  d: DashboardApplicationDto | any,
): QCPesoReviewApplicant {
  if (!d) return {} as any;
  const statusMap: Record<string, any> = {
    submitted: 'Pending',
    under_review: 'Pending',
    approved_for_referral: 'Accepted',
    rejected_for_referral: 'Rejected',
    withdrawn: 'Rejected',
    closed: 'Rejected',
  };

  const rawStatus = d.applicationStatus || d.application_status;
  const rawDate = d.submittedAt || d.submitted_at;
  let formattedDate = 'N/A';
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      formattedDate = parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }

  const address = [d.address_line, d.address_barangay, d.address_city]
    .filter(Boolean)
    .join(', ') || 'Quezon City';

  const formatDisplayDate = (val: any) => {
    if (!val || val === 'N/A') return 'N/A';
    if (typeof val === 'string') {
      const dateOnly = val.includes('T') ? val.split('T')[0] : val;
      const [y, m, day] = dateOnly.split('-').map(Number);
      if (y && m && day) {
        const parsed = new Date(y, m - 1, day);
        return parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
      return val;
    }
    if (val instanceof Date && !isNaN(val.getTime())) {
      return val.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    return String(val);
  };

  const rawYear = d.yearLevel || d.year_level;
  const rawDays = d.student_available_days || d.available_days || d.availableDays || d.work_arrangement || d.workArrangement;
  const rawStartDate = d.student_start_date || d.start_date || d.startDate;

  return {
    id: String(d.applicationId || d.application_id || ''),
    studentName: d.studentFullName || d.student_full_name || 'Applicant',
    company: d.companyName || d.company_name || 'Partner Company',
    jobTitle: d.opportunityTitle || d.opportunity_title || 'Internship Role',
    program: d.strandProgram || d.strand_program || 'N/A',
    yearLevel: formatYearLevel(rawYear),
    dateApplied: formattedDate,
    status: statusMap[rawStatus] || 'Pending',
    email: d.studentContactEmail || d.student_contact_email || 'N/A',
    phone: d.studentContactNumber || d.student_contact_number || 'N/A',
    address,
    school: d.schoolName || d.school_name || 'N/A',
    requiredHours: Number(d.student_required_hours || d.required_hours || d.requiredHours || d.minimum_required_hours || d.minimumRequiredHours || 0),
    availableDays: formatScheduleDays(rawDays),
    availableStartingDate: formatDisplayDate(rawStartDate),
    opportunityId: String(d.opportunityId || d.opportunity_id || ''),
    documents: Array.isArray(d.requirements)
      ? d.requirements.map((r: any) => ({
          id: String(r.student_requirement_submission_id || r.studentRequirementSubmissionId || r.id || ''),
          name: r.requirement_name || r.requirementName || 'Document',
          typeName: r.requirement_type_name || r.requirementTypeName || '',
          filePath: r.requirement_file_path || r.requirementFilePath || '',
          submittedAt: r.submitted_at || r.submittedAt || '',
        }))
      : undefined,
  };
}

export function adaptPesoReferral(r: PesoReferralDto | any): QCPesoReferral {
  if (!r) return {} as any;
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
    rejected: 'Rejected',
  };

  const rawDate = r.referredAt || r.referred_at;
  let formattedDate = 'N/A';
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      formattedDate = parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }

  const rawCompResponse = r.companyResponse || r.company_response || 'pending';
  const rawStudResponse = r.studentResponse || r.student_response || 'pending';

  const address = [r.address_line, r.address_barangay, r.address_city]
    .filter(Boolean)
    .join(', ') || r.address || 'Quezon City';

  return {
    id: String(r.referralId || r.referral_id || ''),
    studentName: r.studentFullName || r.student_full_name || 'Applicant',
    company: r.companyName || r.company_name || 'Partner Company',
    jobTitle: r.opportunityTitle || r.opportunity_title || 'Internship Role',
    referralDate: formattedDate,
    companyResponse: compMap[String(rawCompResponse).toLowerCase()] || 'Pending',
    studentResponse: studMap[String(rawStudResponse).toLowerCase()] || 'Pending',
    email: r.studentContactEmail || r.student_contact_email || 'N/A',
    phone: r.studentContactNumber || r.student_contact_number || 'N/A',
    address,
    documents: Array.isArray(r.requirements)
      ? r.requirements.map((req: any) => ({
          id: String(req.student_requirement_submission_id || req.studentRequirementSubmissionId || req.id || ''),
          name: req.requirement_name || req.requirementName || 'Document',
          typeName: req.requirement_type_name || req.requirementTypeName || '',
          filePath: req.requirement_file_path || req.requirementFilePath || '',
          submittedAt: req.submitted_at || req.submittedAt || '',
        }))
      : undefined,
  };
}

export function adaptPesoIntern(s: PesoInternSummaryDto | any): QCPesoInternshipRecord {
  if (!s) return {} as any;
  const statusMap: Record<string, any> = {
    ongoing: 'On Going',
    completed: 'Completed',
    pending: 'Awaiting Completion',
    withdrawn: 'Withdrawn by Student',
    cancelled: 'Cancelled',
  };

  const rawStatus = s.assignmentStatus || s.assignment_status || 'ongoing';
  const startDate = s.startDate || s.start_date || s.firstAttendanceDate || s.first_attendance_date || '';
  const expectedEndDate = s.expectedEndDate || s.expected_end_date || s.latestAttendanceDate || s.latest_attendance_date || '';

  const formatDisplayDate = (d: any) => {
    if (!d || d === 'N/A') return 'N/A';
    if (typeof d === 'string') {
      const dateOnly = d.includes('T') ? d.split('T')[0] : d;
      const [y, m, day] = dateOnly.split('-').map(Number);
      if (y && m && day) {
        const parsed = new Date(y, m - 1, day);
        return parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
      return d;
    }
    if (d instanceof Date && !isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    return String(d);
  };

  return {
    id: String(s.internshipAssignmentId || s.internship_assignment_id || ''),
    studentName: s.studentFullName || s.student_full_name || s.studentName || 'Student Intern',
    company: s.companyName || s.company_name || s.company || 'Partner Company',
    jobTitle: s.opportunityTitle || s.opportunity_title || s.role || s.jobTitle || 'Internship Role',
    workingDays: s.workingDays || s.working_days || 'Weekdays',
    requiredHours: Number(s.requiredHours || s.required_hours || s.targetHours || 0),
    startDate: formatDisplayDate(startDate),
    expectedEndDate: formatDisplayDate(expectedEndDate),
    shiftStartTime: s.startShift || s.start_shift || s.shiftStartTime || '09:00 AM',
    shiftEndTime: s.endShift || s.end_shift || s.shiftEndTime || '05:00 PM',
    status: statusMap[rawStatus.toLowerCase()] || 'On Going',
    renderedHours: Number(s.totalRenderedHours || s.total_rendered_hours || s.totalRenderedTime || 0),
  };
}

export function adaptPesoDtr(d: PesoDtrEntryDto | any): QCPesoAttendanceRecord {
  if (!d) return {} as any;
  const statusMap: Record<string, any> = {
    on_time: 'Present',
    late: 'Late',
    present: 'Present',
    absent: 'Absent',
  };

  const rawDate = d.date || d.dtrDate || '';
  let formattedDate = '';
  if (typeof rawDate === 'string') {
    formattedDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
  } else if (rawDate instanceof Date) {
    formattedDate = rawDate.toISOString().split('T')[0];
  }

  const rawStatus = d.timeInStatus || d.status || 'Present';
  const status = statusMap[rawStatus.toLowerCase()] || 'Present';

  return {
    id: String(d.attendanceRecordId || d.id || ''),
    internshipId: String(d.internshipAssignmentId || d.internshipId || ''),
    studentName: d.studentFullName || d.studentName || 'Student Intern',
    company: d.company || d.companyName || 'Company',
    jobTitle: d.role || d.jobTitle || 'Internship Role',
    date: formattedDate,
    timeIn: d.timeIn ? String(d.timeIn).substring(0, 5) : 'N/A',
    timeOut: d.timeOut ? String(d.timeOut).substring(0, 5) : 'N/A',
    status,
    hoursRendered: Number(d.totalHours ?? d.hoursRendered ?? 0),
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
    yearLevel: formatYearLevel(row.year_level),
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
