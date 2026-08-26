import { MOCK_INTERNSHIP_PORTAL_DATA, MOCK_USER_PROFILE, MOCK_RESUMES } from '../mocks/internship-portal.mock'
import { MOCK_APPLICATIONS } from '../mocks/applications.mock'
import type {
  InternshipPortalData,
  OpportunitySearchParams,
  UserProfile,
  Resume,
  UserApplication
} from '../types/internship.types'

export interface InternshipPortalService {
  getPortalData(): Promise<InternshipPortalData>
  searchOpportunities(params: OpportunitySearchParams): Promise<InternshipPortalData>
  getUserProfile(): Promise<UserProfile>
  updateUserProfile(profile: Partial<UserProfile>): Promise<UserProfile>
  getUserResumes(): Promise<Resume[]>
  getUserApplications(): Promise<UserApplication[]>
}

const clonePortalData = (): InternshipPortalData => ({
  opportunities: [...MOCK_INTERNSHIP_PORTAL_DATA.opportunities],
  companies: [...MOCK_INTERNSHIP_PORTAL_DATA.companies],
})

export const internshipPortalService: InternshipPortalService = {
  async getPortalData() {
    return Promise.resolve(clonePortalData())
  },

  async searchOpportunities({ query, companyId }) {
    const normalizedQuery = query.trim().toLowerCase()
    const data = clonePortalData()

    return Promise.resolve({
      ...data,
      opportunities: data.opportunities.filter((opportunity) => {
        if (companyId && opportunity.companyId !== companyId) return false
        if (!normalizedQuery) return true

        return [
          opportunity.position,
          opportunity.companyName,
          opportunity.location,
        ].some((value) => value.toLowerCase().startsWith(normalizedQuery))
      }),
    })
  },

  async getUserProfile() {
    return new Promise((resolve) => setTimeout(() => resolve({ ...MOCK_USER_PROFILE }), 400))
  },

  async updateUserProfile(profileUpdates) {
    return new Promise((resolve) => setTimeout(() => {
      resolve({ ...MOCK_USER_PROFILE, ...profileUpdates })
    }, 600))
  },

  async getUserResumes() {
    return new Promise((resolve) => setTimeout(() => resolve([...MOCK_RESUMES]), 400))
  },

  async getUserApplications() {
    return new Promise((resolve) => setTimeout(() => resolve([...MOCK_APPLICATIONS]), 400))
  }
}
