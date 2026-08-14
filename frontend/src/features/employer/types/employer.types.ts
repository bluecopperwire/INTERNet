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
}

export type RecentApplicant = Applicant

export interface CompanyProfile {
  companyName: string
  location: string
  industry: string
  about: string
  verified: boolean
  verifiedBy: string
  dateVerified: string
  verificationId: string
  contactPerson: string
  email: string
  contactNumber: string
  website: string
  yearEstablished: string
  companySize: string
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