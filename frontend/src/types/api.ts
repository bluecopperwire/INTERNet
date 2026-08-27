export type UserRole = 'student' | 'company' | 'peso_personnel' | 'admin';
export type AccountStatus = 'active' | 'suspended' | 'archived';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type CompanyType = 'government' | 'private';
export type WorkArrangement = 'onsite' | 'remote' | 'hybrid';
export type WorkSchedule = 'weekdays' | 'weekends' | 'flexible';

export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'approved_for_referral'
  | 'rejected_for_referral'
  | 'closed'
  | 'withdrawn'
  | 'expired';

export type ReferralStatus =
  | 'sent'
  | 'under_review'
  | 'closed'
  | 'withdrawn'
  | 'expired';

export type CompanyResponse = 'pending' | 'for_interview' | 'accepted' | 'rejected';
export type StudentResponse = 'pending' | 'accepted' | 'declined';
export type AssignmentStatus =
  | 'pending'
  | 'ongoing'
  | 'completed'
  | 'withdrawn'
  | 'cancelled';

export type TimeInStatus = 'on_time' | 'late';
export type RenderedHoursStatus =
  | 'complete'
  | 'undertime'
  | 'overtime'
  | 'incomplete';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PageMeta;
}

export interface AdminSummary {
  total: number;
  active: number;
  suspended: number;
  archived: number;
}

export interface AdminListResponse<T> extends PaginatedResponse<T> {
  summary: AdminSummary;
}

export interface MessageResponse {
  message: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  validationMessages: string[];
  code?: string;
  dependency?: string;
  retryable: boolean;
}

export interface AuthTokenResponse {
  accessToken: string;
}

export interface CurrentUserResponse {
  userAccountId: number;
  email: string;
  userRole: UserRole;
  accountStatus: AccountStatus;
  verificationStatus: VerificationStatus | null;
  studentId: number | null;
  companyId: number | null;
  pesoPersonnelId: number | null;
}

export interface IndustryItemDto {
  industryId: number;
  industryName: string;
  isCustomText: boolean;
}

export interface OpportunitySummaryDto {
  opportunityId: number;
  companyId: number;
  companyName: string;
  companyType: CompanyType;
  companyAddressCity: string;
  title: string;
  department: string;
  workArrangement: WorkArrangement;
  industryId: number;
  industryName: string;
  minimumRequiredHours: number;
  offeredSlots: number;
  availableSlots: number;
  hasAllowance: boolean;
  allowance: string | number | null;
  applicationDeadline: string;
  opportunityStatus: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  qualification: string | null;
  totalApplicantCount: number;
  hasApplied: boolean;
}

export type OpportunityCatalogItem = OpportunitySummaryDto;

export interface StudentProfileResponse {
  student: {
    student_id: number;
    user_account_id: number;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    extension_name?: string | null;
    sex: string;
    birth_date: string;
    contact_number: string;
    contact_email: string;
    address_line: string;
    address_barangay: string;
    address_district: string;
    address_city: string;
    inquiry_method: string;
    linkedin_url?: string | null;
  };
  academic: {
    school_name: string;
    strand_program: string;
    year_level: string;
  } | null;
  internshipPreference: {
    required_hours: number;
    allows_outside_preferred_field: boolean;
    preferred_company_type: string;
    available_days: string;
    start_date: string;
  } | null;
  preferredIndustries: Array<{
    industry_id?: number;
    industry_name?: string;
    custom_industry_name?: string;
  }>;
}

export interface StudentApplicationDto {
  applicationId: number;
  submittedAt: string;
  applicationStatus: ApplicationStatus;
  applicationRemark?: string | null;
  studentResponse?: StudentResponse | null;
  studentRespondedAt?: string | null;
  opportunity: {
    opportunityId: number;
    title: string;
    department: string;
    workArrangement: WorkArrangement;
    minimumRequiredHours: number;
    applicationDeadline: string;
    status: string;
  };
  company: {
    companyId: number;
    companyName: string;
    companyType: CompanyType;
    industryName?: string | null;
  };
  referral?: {
    referralId: number;
    referralStatus: ReferralStatus;
    companyResponse: CompanyResponse;
    referredAt: string;
    companyRespondedAt?: string | null;
  } | null;
  assignment?: {
    internshipAssignmentId: number;
    assignmentStatus: AssignmentStatus;
    targetHours: number;
    totalRenderedHours: number;
    startDate: string;
    expectedEndDate?: string | null;
  } | null;
}

export interface StudentApplicationStatusDto extends StudentApplicationDto {
  remark?: string | null;
  interview?: {
    interview_schedule_id: number;
    interview_mode: string;
    scheduled_at: string;
    physical_location?: string | null;
    online_meeting_url?: string | null;
    remark?: string | null;
  } | null;
}

export interface StudentRequirementsResponse {
  requirements: Array<{
    student_requirement_id: number;
    requirement_type_name: string;
    requirement_name: string;
    requirement_file_path: string;
    submitted_at: string;
  }>;
}

export interface StudentAttendanceResponse {
  assignment: {
    internshipAssignmentId: number;
    companyName: string;
    jobTitle: string;
    workingDays: string;
    requiredHours: number;
    totalRenderedHours: number;
    remainingHours: number;
    startDate: string;
    expectedEndDate?: string | null;
    startShift: string;
    endShift: string;
    assignmentStatus: string;
  } | null;
  today: {
    time_in?: string | null;
    time_out?: string | null;
    time_in_status?: string | null;
  } | null;
  records: Array<{
    date: string;
    status: 'present' | 'absent' | 'late';
    timeIn?: string | null;
    timeOut?: string | null;
    hoursRendered?: number | null;
  }>;
  summary: {
    daysPresent: number;
    absences: number;
    lateArrivals: number;
    attendanceRate: number;
  };
}

export interface PesoStudentMetricsDto {
  totalPendingApplications: number;
  totalActiveEmployers: number;
  totalAvailableOpportunities: number;
}

export interface PesoApplicationMetricsDto {
  totalSubmitted: number;
  underReview: number;
  approvedForReferral: number;
  rejectedForReferral: number;
}

export interface PesoEmployerMetricsDto {
  totalActive: number;
  totalSuspended: number;
}

export interface DashboardApplicationDto {
  applicationId: number;
  opportunityId: number;
  opportunityTitle: string;
  companyId: number;
  companyName: string;
  studentId: number;
  studentFullName: string;
  studentContactEmail: string;
  studentContactNumber: string;
  schoolName?: string | null;
  strandProgram?: string | null;
  yearLevel?: string | null;
  submittedAt: string;
  applicationStatus: ApplicationStatus;
}

export interface PesoReferralDto {
  referralId: number;
  applicationId: number;
  opportunityId: number;
  opportunityTitle: string;
  companyId: number;
  companyName: string;
  studentId: number;
  studentFullName: string;
  studentContactEmail: string;
  studentContactNumber: string;
  referredAt: string;
  companyResponse: CompanyResponse;
  referralStatus: ReferralStatus;
}

export interface PesoInternSummaryDto {
  internshipAssignmentId: number;
  studentId: number;
  studentFullName: string;
  companyId: number;
  companyName: string;
  opportunityId: number;
  opportunityTitle: string;
  requiredHours: number;
  totalRenderedHours: number;
  firstAttendanceDate?: string | null;
  latestAttendanceDate?: string | null;
  assignmentStatus: AssignmentStatus;
}

export interface PesoDtrEntryDto {
  attendanceRecordId: number;
  internshipAssignmentId: number;
  studentFullName: string;
  company: string;
  role: string;
  dtrDate: string;
  timeIn?: string | null;
  timeOut?: string | null;
  timeInStatus: string;
  totalHours: number;
}

export interface EmployerDashboardMetricsDto {
  activeOpportunities: number;
  totalApplicants: number;
  pendingReviews: number;
  acceptedCount: number;
  rejectedCount: number;
}

export interface EmployerOpportunityDto {
  opportunityId: number;
  companyId: number;
  title: string;
  department: string;
  workArrangement: WorkArrangement;
  minimumRequiredHours: number;
  offeredSlots: number;
  hasAllowance: boolean;
  allowance?: string | number | null;
  applicationDeadline: string;
  description: string;
  qualification?: string | null;
  opportunityStatus: string;
  totalApplicantCount: number;
}

export interface CreateOpportunityRequest {
  title: string;
  department: string;
  workArrangement: WorkArrangement;
  minimumRequiredHours: number;
  offeredSlots: number;
  allowance?: string | null;
  description: string;
  qualification: string | null;
  applicationDeadline: string;
}

export interface UpdateOpportunityRequest {
  title?: string;
  department?: string;
  workArrangement?: WorkArrangement;
  minimumRequiredHours?: number;
  offeredSlots?: number;
  allowance?: string | null;
  description?: string;
  qualification?: string | null;
  applicationDeadline?: string;
}

export interface EmployerReferralListItemDto {
  referralId: number;
  opportunityId: number;
  opportunityTitle: string;
  studentFullName: string;
  strandProgram?: string | null;
  yearLevel?: string | null;
  submittedAt: string;
  companyResponse: CompanyResponse;
}

export interface EmployerAttendanceItemDto {
  internshipAssignmentId: number;
  studentFullName: string;
  jobTitle: string;
  date: string;
  timeIn?: string | null;
  timeOut?: string | null;
  status: 'present' | 'absent' | 'late';
  renderedHours: number;
}

export interface EmployerInternshipListItemDto {
  internshipAssignmentId: number;
  studentFullName: string;
  jobTitle: string;
  requiredHours: number;
  renderedHours: number;
  assignmentStatus: AssignmentStatus;
}

export interface AdminMetricsDto {
  totalRegistered: number;
  activeAccounts: number;
  suspendedAccounts: number;
  archivedAccounts: number;
}

export interface AdminStudentListItemDto {
  userAccountId: number;
  studentId: number;
  fullName: string;
  accountEmail: string;
  accountStatus: AccountStatus;
  createdAt: string;
  suspendedUntil?: string | null;
}

export interface AdminEmployerListItemDto {
  userAccountId: number;
  companyId: number;
  companyName: string;
  accountEmail: string;
  accountStatus: AccountStatus;
  createdAt: string;
  suspendedUntil?: string | null;
}

export interface AdminPesoListItemDto {
  userAccountId: number;
  pesoPersonnelId: number;
  employeeId: string;
  fullName: string;
  accountEmail: string;
  accountStatus: AccountStatus;
  createdAt: string;
  suspendedUntil?: string | null;
}
