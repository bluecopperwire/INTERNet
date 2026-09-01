import type { ApplicationStatus, CompanyResponse, ReferralStatus, StudentResponse } from '../../../types/api'
import type { WorkflowDisplayStatus } from '../../workflow/status-mappings'

export interface Opportunity {
  id: string
  title: string
  department: string
  workArrangement: 'On-site' | 'Remote' | 'Hybrid'
  slots: number
  duration: number
  allowance: string
  applicationDeadline: string
  jobDescription: string
  qualifications: string
  status: 'Open' | 'Closed'
  applicants: number
}

export interface Applicant {
  id: string
  name: string
  opportunityId: string
  opportunityTitle: string
  course: string
  yearLevel: string
  dateApplied: string
  status: WorkflowDisplayStatus
  applicationStatus?: ApplicationStatus
  referralStatus?: ReferralStatus
  companyResponse?: CompanyResponse
  studentResponse?: StudentResponse
  canHide: boolean
  email: string
  phone: string
  location: string
  school: string
  preferredField: string
  requiredHours: number
  availabilityDays: string
  availabilityDate: string
  profileImageUrl?: string
  rejectionRemark?: string
  documents?: Array<{
    submissionId?: number
    requirementTypeId?: number
    requirementTypeName?: string
    requirementName?: string
    filePath?: string
  }>
}

export type RecentApplicant = Applicant

export interface CompanyProfile {
  company_name: string
  company_type: 'Government' | 'Private'
  industry: string
  description: string
  website_url: string | null
  year_established: string | null
  company_size: string | null
  address_line: string
  address_barangay: string
  address_district: string | null
  address_city: string
  contact_email: string
  contact_number: string
  contact_person_first_name: string
  contact_person_middle_name: string | null
  contact_person_last_name: string
  contact_person_extension_name: string | null

  logoUrl?: string
}

export interface EmployerDashboardSummary {
  companyName: string
  activeOpportunities: number
  totalApplicants: number
  acceptedPercentage: number
  rejectedPercentage: number
  pendingReviews: number
  acceptanceRate: number
}

export interface EmployerNotification {
  id: string
  title: string
  message: string
  timeAgo: string
  isRead: boolean
}

export interface EmployerAttendanceRecord {
  id: string
  applicantId: string
  studentName: string
  role: string
  company: string
  date: string
  timeIn: string
  timeOut: string
  status: 'Present' | 'Absent' | 'Late'
  hoursRendered: number
  requiredHours: number
}

export interface EmployerInternshipDetails {
  applicantId: string
  studentName: string
  company: string
  jobTitle: string
  workingDays: string
  requiredHours: number
  startDate: string
  expectedEndDate: string
  shiftStartTime: string
  shiftEndTime: string
  status: 'On Going' | 'Completed' | 'Awaiting Completion' | 'Withdrawn by Student' | 'Cancelled'
  renderedHours: number
}

export interface InternshipAssignment {
  id: string
  applicantId: string
  referralId: number
  internshipAssignmentId: number | null
  studentName: string
  company: string
  jobTitle: string
  acceptanceDate: string
  studentResponse: 'Pending' | 'Accepted' | 'Rejected' | 'Unknown'
  workingDays: string
  requiredHours: number
  startDate: string
  expectedEndDate: string
  shiftStartTime: string
  shiftEndTime: string
}
