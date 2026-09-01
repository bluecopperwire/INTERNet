import type {
  PesoStudentMetricsDto,
  DashboardApplicationDto,
  PesoReferralDto,
  PesoInternSummaryDto,
  PesoDtrEntryDto,
} from "../../../types/api";
import { publicUploadUrl } from "../../../utils/public-upload-url";
import type {
  QCPesoDashboardSummary,
  QCPesoReviewApplicant,
  QCPesoReferral,
  QCPesoInternshipRecord,
  QCPesoAttendanceRecord,
  QCPesoProfile,
  MonitoredStudentUser,
  MonitoredCompanyUser,
} from "../types/qcpeso.types";
import {
  applicationDisplayStatus,
  applicationHistoryStatus,
  isTerminalApplication,
  isTerminalReferral,
  referralDisplayStatus,
} from "../../workflow/status-mappings";
import { formatDateOnly, toDateOnly } from "../../../utils/date-only";

function formatCalendarDate(value: unknown): string {
  if (!value || value === "N/A") return "N/A";
  return formatDateOnly(value) || String(value);
}

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
  if (!value) return "N/A";
  const labels: Record<string, string> = {
    grade_11: "Grade 11",
    grade_12: "Grade 12",
    first_year_college: "1st Year",
    second_year_college: "2nd Year",
    third_year_college: "3rd Year",
    fourth_year_college: "4th Year",
    fifth_year_college: "5th Year",
    "1st_year": "1st Year",
    "2nd_year": "2nd Year",
    "3rd_year": "3rd Year",
    "4th_year": "4th Year",
    "5th_year": "5th Year",
    first_year: "1st Year",
    second_year: "2nd Year",
    third_year: "3rd Year",
    fourth_year: "4th Year",
    fifth_year: "5th Year",
  };
  const key = value.toLowerCase().trim();
  if (labels[key]) return labels[key];

  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function formatScheduleDays(value?: string | null): string {
  if (!value) return "Weekdays";
  const labels: Record<string, string> = {
    weekdays: "Weekdays",
    weekends: "Weekends",
    flexible: "Flexible",
  };
  const key = value.toLowerCase().trim();
  if (labels[key]) return labels[key];

  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function adaptPesoApplication(
  d: DashboardApplicationDto | any,
): QCPesoReviewApplicant {
  if (!d) return {} as any;
  const rawStatus = d.applicationStatus || d.application_status;
  const referralStatus = d.referralStatus || d.referral_status;
  const companyResponse = d.companyResponse || d.company_response;
  const studentResponse = d.studentResponse || d.student_response;
  const rawDate = d.submittedAt || d.submitted_at;
  let formattedDate = "N/A";
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      formattedDate = parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  const address =
    [d.address_line, d.address_barangay, d.address_city]
      .filter(Boolean)
      .join(", ") || "Quezon City";

  const rawYear = d.yearLevel || d.year_level;
  const rawDays =
    d.student_available_days ||
    d.available_days ||
    d.availableDays ||
    d.work_arrangement ||
    d.workArrangement;
  const rawStartDate = d.student_start_date || d.start_date || d.startDate;

  return {
    id: String(d.applicationId || d.application_id || ""),
    studentName: d.studentFullName || d.student_full_name || "Applicant",
    company: d.companyName || d.company_name || "Partner Company",
    jobTitle: d.opportunityTitle || d.opportunity_title || "Internship Role",
    program: d.strandProgram || d.strand_program || "N/A",
    yearLevel: formatYearLevel(rawYear),
    dateApplied: formattedDate,
    referralDate: d.referredAt || d.referred_at
      ? formatCalendarDate(d.referredAt || d.referred_at)
      : "—",
    status: applicationDisplayStatus({
      applicationStatus: rawStatus,
      referralStatus,
      companyResponse,
      studentResponse,
    }),
    historyStatus: applicationHistoryStatus({
      applicationStatus: rawStatus,
      referralStatus,
      companyResponse,
      studentResponse,
    }),
    applicationStatus: rawStatus,
    canHide: isTerminalApplication(rawStatus),
    email: d.studentContactEmail || d.student_contact_email || "N/A",
    phone: d.studentContactNumber || d.student_contact_number || "N/A",
    address,
    school: d.schoolName || d.school_name || "N/A",
    requiredHours: Number(
      d.student_required_hours ||
        d.required_hours ||
        d.requiredHours ||
        d.minimum_required_hours ||
        d.minimumRequiredHours ||
        0,
    ),
    availableDays: formatScheduleDays(rawDays),
    availableStartingDate: formatCalendarDate(rawStartDate),
    opportunityId: String(d.opportunityId || d.opportunity_id || ""),
    profileImageUrl: publicUploadUrl(
      d.photoFilePath || d.photo_file_path,
      d.profileUpdatedAt || d.profile_updated_at,
    ),
    documents: Array.isArray(d.requirements)
      ? d.requirements.map((r: any) => ({
          id: String(
            r.student_requirement_submission_id ||
              r.studentRequirementSubmissionId ||
              r.id ||
              "",
          ),
          name: r.requirement_name || r.requirementName || "Document",
          typeName: r.requirement_type_name || r.requirementTypeName || "",
          filePath: r.requirement_file_path || r.requirementFilePath || "",
          submittedAt: r.submitted_at || r.submittedAt || "",
        }))
      : undefined,
  };
}

export function adaptPesoReferral(r: PesoReferralDto | any): QCPesoReferral {
  if (!r) return {} as any;
  const compMap: Record<string, any> = {
    pending: "Pending",
    for_interview: "For Interview",
    accepted: "Accepted",
    rejected: "Rejected",
  };
  const studMap: Record<string, any> = {
    pending: "Pending",
    accepted: "Accepted",
    declined: "Rejected",
    rejected: "Rejected",
  };

  const rawDate = r.referredAt || r.referred_at;
  let formattedDate = "N/A";
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      formattedDate = parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  const rawCompResponse = r.companyResponse || r.company_response || "pending";
  const rawStudResponse = r.studentResponse || r.student_response || "pending";
  const rawReferralStatus = r.referralStatus || r.referral_status;

  const address =
    [r.address_line, r.address_barangay, r.address_city]
      .filter(Boolean)
      .join(", ") ||
    r.address ||
    "Quezon City";

  return {
    id: String(r.referralId || r.referral_id || ""),
    studentName: r.studentFullName || r.student_full_name || "Applicant",
    company: r.companyName || r.company_name || "Partner Company",
    jobTitle: r.opportunityTitle || r.opportunity_title || "Internship Role",
    program: r.strandProgram || r.strand_program || "N/A",
    applicationDate: formatCalendarDate(r.submittedAt || r.submitted_at),
    referralDate: formattedDate,
    companyResponse:
      compMap[String(rawCompResponse).toLowerCase()] || "Pending",
    studentResponse:
      studMap[String(rawStudResponse).toLowerCase()] || "Pending",
    workflowStatus: referralDisplayStatus({
      referralStatus: rawReferralStatus,
      companyResponse: rawCompResponse,
      studentResponse: rawStudResponse,
    }),
    referralStatus: rawReferralStatus,
    companyResponseValue: rawCompResponse,
    studentResponseValue: rawStudResponse,
    canHide: isTerminalReferral(rawReferralStatus),
    email: r.studentContactEmail || r.student_contact_email || "N/A",
    phone: r.studentContactNumber || r.student_contact_number || "N/A",
    address,
    profileImageUrl: publicUploadUrl(
      (r as any).photoFilePath || (r as any).photo_file_path,
      (r as any).profileUpdatedAt || (r as any).profile_updated_at,
    ),
    documents: Array.isArray(r.requirements)
      ? r.requirements.map((req: any) => ({
          id: String(
            req.student_requirement_submission_id ||
              req.studentRequirementSubmissionId ||
              req.id ||
              "",
          ),
          name: req.requirement_name || req.requirementName || "Document",
          typeName: req.requirement_type_name || req.requirementTypeName || "",
          filePath: req.requirement_file_path || req.requirementFilePath || "",
          submittedAt: req.submitted_at || req.submittedAt || "",
        }))
      : undefined,
  };
}

export function adaptPesoIntern(
  s: PesoInternSummaryDto | any,
): QCPesoInternshipRecord {
  if (!s) return {} as any;
  const statusMap: Record<string, any> = {
    ongoing: "On Going",
    completed: "Completed",
    pending: "Awaiting Completion",
    withdrawn: "Withdrawn by Student",
    cancelled: "Cancelled",
  };

  const rawStatus = s.assignmentStatus || s.assignment_status || "ongoing";
  const startDate =
    s.startDate ||
    s.start_date ||
    s.firstAttendanceDate ||
    s.first_attendance_date ||
    "";
  const expectedEndDate =
    s.expectedEndDate ||
    s.expected_end_date ||
    s.latestAttendanceDate ||
    s.latest_attendance_date ||
    "";

  return {
    id: String(s.internshipAssignmentId || s.internship_assignment_id || ""),
    studentName:
      s.studentFullName ||
      s.student_full_name ||
      s.studentName ||
      "Student Intern",
    company: s.companyName || s.company_name || s.company || "Partner Company",
    jobTitle:
      s.opportunityTitle ||
      s.opportunity_title ||
      s.role ||
      s.jobTitle ||
      "Internship Role",
    workingDays: s.workingDays || s.working_days || "Weekdays",
    requiredHours: Number(
      s.requiredHours || s.required_hours || s.targetHours || 0,
    ),
    startDate: formatCalendarDate(startDate),
    expectedEndDate: formatCalendarDate(expectedEndDate),
    shiftStartTime:
      s.startShift || s.start_shift || s.shiftStartTime || "09:00 AM",
    shiftEndTime: s.endShift || s.end_shift || s.shiftEndTime || "05:00 PM",
    status: statusMap[rawStatus.toLowerCase()] || "On Going",
    renderedHours: Number(
      s.totalRenderedHours ||
        s.total_rendered_hours ||
        s.totalRenderedTime ||
        0,
    ),
  };
}

export function adaptPesoDtr(d: PesoDtrEntryDto | any): QCPesoAttendanceRecord {
  if (!d) return {} as any;
  const statusMap: Record<string, any> = {
    on_time: "Present",
    late: "Late",
    present: "Present",
    absent: "Absent",
  };

  const rawDate = d.date || d.dtrDate || "";
  const formattedDate = toDateOnly(rawDate);

  const rawStatus = d.timeInStatus || d.status || "Present";
  const status = statusMap[rawStatus.toLowerCase()] || "Present";

  return {
    id: String(d.attendanceRecordId || d.id || ""),
    internshipId: String(d.internshipAssignmentId || d.internshipId || ""),
    studentName: d.studentFullName || d.studentName || "Student Intern",
    company: d.company || d.companyName || "Company",
    jobTitle: d.role || d.jobTitle || "Internship Role",
    date: formattedDate,
    timeIn: d.timeIn ? String(d.timeIn).substring(0, 5) : "N/A",
    timeOut: d.timeOut ? String(d.timeOut).substring(0, 5) : "N/A",
    status,
    hoursRendered: Number(d.totalHours ?? d.hoursRendered ?? 0),
  };
}

export function adaptToPesoProfilePayload(
  profile: Partial<QCPesoProfile>,
): Record<string, any> {
  const payload: Record<string, any> = {};

  if (profile.firstName !== undefined)
    payload.firstName = profile.firstName.trim();
  if (profile.middleName !== undefined)
    payload.middleName = profile.middleName?.trim() || undefined;
  if (profile.lastName !== undefined)
    payload.lastName = profile.lastName.trim();
  if (profile.suffix !== undefined)
    payload.extensionName = profile.suffix?.trim() || undefined;
  if (profile.sex !== undefined) payload.sex = profile.sex;
  if (profile.birthdate !== undefined && profile.birthdate)
    payload.birthDate = profile.birthdate;
  if (profile.addressLine !== undefined)
    payload.addressLine = profile.addressLine.trim();
  if (profile.barangay !== undefined)
    payload.addressBarangay = profile.barangay.trim();
  if (profile.district !== undefined)
    payload.addressDistrict = profile.district.trim();
  if (profile.city !== undefined) payload.addressCity = profile.city.trim();
  if (profile.mobileNumber !== undefined)
    payload.contactNumber = profile.mobileNumber.trim();
  if (profile.email !== undefined) payload.contactEmail = profile.email.trim();
  if (profile.employeeIdNumber !== undefined)
    payload.employeeId = profile.employeeIdNumber.trim();
  if (profile.position !== undefined)
    payload.position = profile.position.trim();
  if (profile.department !== undefined)
    payload.department = profile.department.trim();

  return payload;
}

export function adaptPesoProfile(p: any): QCPesoProfile {
  if (!p) return {} as any;

  const birthdate = toDateOnly(p.birthDate);

  const fullName =
    [p.firstName, p.middleName, p.lastName, p.extensionName]
      .filter(Boolean)
      .join(" ") ||
    `${p.firstName || ""} ${p.lastName || ""}`.trim() ||
    "QC PESO Personnel";

  const districtStr = p.addressDistrict
    ? String(p.addressDistrict).toLowerCase().startsWith("district")
      ? p.addressDistrict
      : `District ${p.addressDistrict}`
    : "";

  const location =
    [p.addressLine, p.addressBarangay, districtStr, p.addressCity]
      .filter(Boolean)
      .join(", ") || "Quezon City";

  const avatarUrl = publicUploadUrl(p.photoFilePath, p.updatedAt);
  return {
    id: String(p.pesoPersonnelId || p.userAccountId || ""),
    firstName: p.firstName || "",
    middleName: p.middleName || "",
    lastName: p.lastName || "",
    suffix: p.extensionName || "",
    birthdate,
    sex: p.sex && String(p.sex).toLowerCase() === "female" ? "Female" : "Male",
    addressLine: p.addressLine || "",
    barangay: p.addressBarangay || "",
    district: p.addressDistrict || "",
    city: p.addressCity || "",
    email: p.contactEmail || p.email || "",
    mobileNumber: p.contactNumber || "",
    employeeIdNumber: p.employeeId || "",
    position: p.position || "PESO Officer",
    department: p.department || "PESO",
    fullName,
    role: p.position || "QC PESO Personnel",
    location,
    qcpesoPosition: p.position || "PESO Officer",
    avatarUrl,
  };
}

export function adaptMonitoredStudent(row: any): MonitoredStudentUser {
  if (!row) return {} as any;

  const address =
    [
      row.address_line,
      row.address_barangay,
      row.address_district,
      row.address_city,
    ]
      .filter(Boolean)
      .join(", ") || "N/A";

  const preferredIndustries =
    Array.isArray(row.preferred_industries) &&
    row.preferred_industries.length > 0
      ? row.preferred_industries
          .map((ind: any) =>
            typeof ind === "string"
              ? ind
              : ind.custom_industry_name || ind.industry_name || "",
          )
          .filter(Boolean)
          .join(", ")
      : "N/A";

  let willingOutside = "N/A";
  if (
    row.allows_outside_preferred_field === true ||
    row.allowsOutsidePreferredField === true
  ) {
    willingOutside = "Yes";
  } else if (
    row.allows_outside_preferred_field === false ||
    row.allowsOutsidePreferredField === false
  ) {
    willingOutside = "No";
  }

  let sex = "N/A";
  if (row.sex) {
    sex = String(row.sex).toLowerCase() === "female" ? "Female" : "Male";
  }

  const rawCompanyType = row.preferred_company_type || row.preferredCompanyType;
  let preferredCompanyType = "N/A";
  if (rawCompanyType) {
    preferredCompanyType =
      String(rawCompanyType).toLowerCase() === "government"
        ? "Government"
        : "Private";
  }

  const requiredHours =
    row.preferred_required_hours != null || row.preferredRequiredHours != null
      ? `${row.preferred_required_hours ?? row.preferredRequiredHours} Hours`
      : "N/A";

  const rawAvailableDays =
    row.preferred_available_days || row.preferredAvailableDays;
  const rawStartDate = row.preferred_start_date || row.preferredStartDate;

  return {
    id: String(row.student_id || row.studentId || ""),
    studentName:
      row.full_name ||
      row.fullName ||
      [row.first_name, row.last_name].filter(Boolean).join(" ") ||
      "Student",
    email: row.contact_email || row.contactEmail || row.email || "N/A",
    mobileNumber: row.contact_number || row.contactNumber || row.phone || "N/A",
    linkedIn: row.linkedin_url || row.linkedIn || "N/A",
    dateRegistered: formatCalendarDate(row.created_at || row.createdAt),
    status:
      (row.account_status || row.accountStatus || "active").toLowerCase() ===
      "active"
        ? "Active"
        : "Suspended",
    address,
    birthdate: formatDateOnly(row.birth_date || row.birthDate) || "N/A",
    sex,
    school: row.school_name || row.schoolName || "N/A",
    program: row.strand_program || row.strandProgram || "N/A",
    yearLevel: formatYearLevel(row.year_level || row.yearLevel),
    requiredHours,
    preferredHostOrganizationType: preferredCompanyType,
    internshipDaysAvailability: rawAvailableDays
      ? formatScheduleDays(rawAvailableDays)
      : "N/A",
    internshipStartDateAvailability: formatDateOnly(rawStartDate) || "N/A",
    preferredField: preferredIndustries,
    willingOutsidePreferredField: willingOutside,
    profileImageUrl: publicUploadUrl(
      row.photo_file_path,
      row.profile_updated_at || row.updated_at,
    ),
  };
}

export function adaptMonitoredCompany(row: any): MonitoredCompanyUser {
  if (!row) return {} as any;

  const address =
    [
      row.address_line,
      row.address_barangay,
      row.address_district,
      row.address_city,
    ]
      .filter(Boolean)
      .join(", ") || "N/A";

  const contactPerson =
    [row.contact_person_first_name, row.contact_person_last_name]
      .filter(Boolean)
      .join(" ") ||
    row.contactPerson ||
    "N/A";

  return {
    id: String(row.company_id || row.companyId || ""),
    companyName: row.company_name || row.companyName || "Company",
    email: row.contact_email || row.contactEmail || row.email || "N/A",
    contactNumber: row.contact_number || row.contactNumber || "N/A",
    dateRegistered: row.created_at
      ? new Date(row.created_at).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "N/A",
    status:
      (row.account_status || row.accountStatus || "active").toLowerCase() ===
      "active"
        ? "Active"
        : "Suspended",
    description: row.description || "",
    address,
    companyType:
      String(row.company_type || row.companyType).toLowerCase() === "government"
        ? "Government"
        : "Private",
    industry: row.industry_name || row.industryName || "N/A",
    companySize: String(row.company_size || row.companySize || "N/A"),
    yearEstablished: String(
      row.year_established || row.yearEstablished || "N/A",
    ),
    websiteUrl: row.website_url || row.websiteUrl || "",
    contactPerson,
    profileImageUrl: publicUploadUrl(row.logo_file_path, row.updated_at),
  };
}
