import { MOCK_APPLICATIONS } from '../mocks/applications.mock'
import type { UserApplication } from '../types/application.types'

export interface ApplicationsService {
  getMyApplications(): Promise<UserApplication[]>
  getApplication(applicationId: string): Promise<UserApplication | null>
}

export const applicationsService: ApplicationsService = {
  async getMyApplications() {
    return Promise.resolve(structuredClone(MOCK_APPLICATIONS))
  },
  async getApplication(applicationId) {
    const application = MOCK_APPLICATIONS.find((item) => item.id === applicationId)
    return Promise.resolve(application ? structuredClone(application) : null)
  },
}
