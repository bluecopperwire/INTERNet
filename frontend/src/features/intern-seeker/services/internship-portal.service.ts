import { MOCK_INTERNSHIP_PORTAL_DATA } from '../mocks/internship-portal.mock'
import type {
  InternshipPortalData,
  OpportunitySearchParams,
} from '../types/internship.types'

export interface InternshipPortalService {
  getPortalData(): Promise<InternshipPortalData>
  searchOpportunities(params: OpportunitySearchParams): Promise<InternshipPortalData>
}

const clonePortalData = (): InternshipPortalData => ({
  opportunities: [...MOCK_INTERNSHIP_PORTAL_DATA.opportunities],
  companies: [...MOCK_INTERNSHIP_PORTAL_DATA.companies],
})

export const internshipPortalService: InternshipPortalService = {
  async getPortalData() {
    return Promise.resolve(clonePortalData())
  },

  async searchOpportunities({ query }) {
    const normalizedQuery = query.trim().toLowerCase()
    const data = clonePortalData()

    return Promise.resolve({
      ...data,
      opportunities: data.opportunities.filter((opportunity) => {
        if (!normalizedQuery) return true

        return [
          opportunity.position,
          opportunity.companyName,
          opportunity.location,
        ].some((value) => value.toLowerCase().startsWith(normalizedQuery))
      }),
    })
  },
}
