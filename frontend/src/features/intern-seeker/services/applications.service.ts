import { MOCK_APPLICATIONS } from '../mocks/applications.mock'
import type { ApplicationProgress, UserApplication } from '../types/application.types'

export interface ApplicationsService {
  getMyApplications(): Promise<UserApplication[]>
  getApplication(applicationId: string): Promise<UserApplication | null>
  withdrawApplication(applicationId: string): Promise<UserApplication>
  respondToOffer(applicationId: string, decision: 'accept' | 'reject'): Promise<UserApplication>
  deleteApplication(applicationId: string): Promise<void>
}

let applications = structuredClone(MOCK_APPLICATIONS)

const updateApplication = (applicationId: string, update: (application: UserApplication) => UserApplication) => {
  const application = applications.find((item) => item.id === applicationId)
  if (!application) throw new Error('Application not found.')
  const updated = update(application)
  applications = applications.map((item) => item.id === applicationId ? updated : item)
  return structuredClone(updated)
}

const updateStage = (progress: ApplicationProgress[], stage: ApplicationProgress['stage'], update: Partial<ApplicationProgress>) =>
  progress.map((item) => item.stage === stage ? { ...item, ...update } : item)

export const applicationsService: ApplicationsService = {
  async getMyApplications() {
    return Promise.resolve(structuredClone(applications))
  },

  async getApplication(applicationId) {
    const application = applications.find((item) => item.id === applicationId)
    return Promise.resolve(application ? structuredClone(application) : null)
  },

  async withdrawApplication(applicationId) {
    return Promise.resolve(updateApplication(applicationId, (application) => ({
      ...application,
      status: 'Withdrawn',
      progress: updateStage(application.progress, 'Student Decision', {
        state: 'withdrawn',
        timestamp: new Date().toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' }),
        message: 'You have withdrawn this application.',
      }),
    })))
  },

  async respondToOffer(applicationId, decision) {
    return Promise.resolve(updateApplication(applicationId, (application) => ({
      ...application,
      status: decision === 'accept' ? 'Accepted' : 'Rejected',
      progress: updateStage(application.progress, 'Student Decision', {
        state: decision === 'accept' ? 'completed' : 'rejected',
        timestamp: new Date().toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' }),
        message: decision === 'accept' ? 'You have accepted the internship offer.' : 'You have rejected the internship offer.',
      }),
    })))
  },

  async deleteApplication(applicationId) {
    const hasApplication = applications.some((item) => item.id === applicationId)
    if (!hasApplication) throw new Error('Application not found.')
    applications = applications.filter((item) => item.id !== applicationId)
    return Promise.resolve()
  },
}
