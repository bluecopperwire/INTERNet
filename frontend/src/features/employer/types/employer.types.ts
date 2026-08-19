export interface Opportunity {
  id: string
  title: string
  department: string
  slots: number
  duration: number
  status: 'Active' | 'Closed' | 'Draft'
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
  status: 'Pending' | 'For Review' | 'Under Review' | 'Shortlisted' | 'Accepted' | 'Rejected'
  email: string
  phone: string
  location: string
  school: string
  preferredField: string
  requiredHours: number
  availabilityDate: string
  notes?: string
}

export type RecentApplicant = Applicant

export interface CompanyProfile {
  company_name: string
  company_type: string
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

  // UI-only fields pending corresponding backend support.
  logoUrl?: string
  verified?: boolean
  verifiedBy?: string
  dateVerified?: string
  verificationId?: string
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
