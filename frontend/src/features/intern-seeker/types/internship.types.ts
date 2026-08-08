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
