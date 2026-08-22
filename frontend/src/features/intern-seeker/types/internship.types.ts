export interface InternshipOpportunity {
  id: string
  companyId: string
  companyName: string
  position: string
  location: string
  workSetup: 'On-site' | 'Remote' | 'Hybrid'
  postedAt: string
  tags: string[]
  isApplied: boolean
  isExclusive: boolean
  details: OpportunityDetails
}

export interface OpportunityDetails {
  workplace: string
  department: string
  internshipDuration: string
  numberOfSlots: number
  applicationDeadline: string
  description: string
  qualifications: string
  allowance: string
}

export interface PartnerCompany {
  id: string
  name: string
  summary: string
  description: string
  tags: string[]
}

export interface InternshipPortalData {
  opportunities: InternshipOpportunity[]
  companies: PartnerCompany[]
}

export interface OpportunitySearchParams {
  query: string
  companyId?: string
}

export type InternshipStatus = 'Not Employed' | 'Employed' | 'Ongoing'

export interface UserProfile {
  id: string
  firstName: string
  middleName: string
  lastName: string
  extensionName: string
  role: string
  location: string
  email: string
  linkedinUrl: string
  internshipStatus: InternshipStatus
  sex: string
  birthdate: string
  contactNumber: string
  address: { street: string; barangay: string; district: string; city: string }
  inquiryVia: string
  academic: { schoolName: string; program: string; yearLevel: string }
  preferences: {
    requiredHours: number | ''
    willingToAssignOutside: boolean | null
    preferredIndustries: string[]
    otherPreferredField?: string
    schedule: string[]
    startDate: string
    hostOrgType: string
  }
}

export interface Resume {
  id: string
  fileName: string
  dateAdded: string
  url: string
}

export type {
  ApplicationDisplayStatus,
  ApplicationProgress,
  ApplicationStage,
  UserApplication,
} from './application.types'
