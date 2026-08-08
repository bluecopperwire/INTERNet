export interface InternshipOpportunity {
  id: string
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
  interviewProcess: string
  tools: string[]
  reportingTo: string
  team: string
  description: string
  responsibilities: string[]
  requirements: string[]
  benefits: string[]
  allowance: string
  companySize: string
  founded: string
  companyType: string
  industry: string
}

export interface PartnerCompany {
  id: string
  name: string
  rating: number
  summary: string
  description: string
  tags: string[]
  isOpen: boolean
}

export interface InternshipPortalData {
  opportunities: InternshipOpportunity[]
  companies: PartnerCompany[]
}

export interface OpportunitySearchParams {
  query: string
}

export interface InternshipOpportunity {
  id: string
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
  interviewProcess: string
  tools: string[]
  reportingTo: string
  team: string
  description: string
  responsibilities: string[]
  requirements: string[]
  benefits: string[]
  allowance: string
  companySize: string
  founded: string
  companyType: string
  industry: string
}

export interface PartnerCompany {
  id: string
  name: string
  rating: number
  summary: string
  description: string
  tags: string[]
  isOpen: boolean
}

export interface InternshipPortalData {
  opportunities: InternshipOpportunity[]
  companies: PartnerCompany[]
}

export interface OpportunitySearchParams {
  query: string
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
  internshipStatus: InternshipStatus
  sex: string
  birthdate: string
  contactNumber: string
  address: {
    street: string
    barangay: string
    district: string
    city: string
  }
  inquiryVia: string
  academic: {
    schoolName: string
    program: string
    yearLevel: string
  }
  preferences: {
    requiredHours: number | ''
    willingToAssignOutside: boolean | null
    preferredIndustries: string[]
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

export type ApplicationStage = 
  | 'Application Submitted'
  | 'For Review (QC PESO)'
  | 'Endorsed to Company'
  | 'Company Review'
  | 'Final Decision'

export interface ApplicationProgress {
  stage: ApplicationStage
  status: 'Completed' | 'Pending'
  timestamp?: string
  notes?: string
}

export interface UserApplication {
  id: string
  companyName: string
  position: string
  location: string
  status: string
  appliedDate: string
  progress: ApplicationProgress[]
}
