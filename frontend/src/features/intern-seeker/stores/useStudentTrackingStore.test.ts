import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StudentApplicationStatusDto } from '../../../types/api'

const { getApplications, getApplicationStatus, hideApplication } = vi.hoisted(() => ({
  getApplications: vi.fn(),
  getApplicationStatus: vi.fn(),
  hideApplication: vi.fn(),
}))

vi.mock('../services/student-api.service', () => ({
  studentApiService: {
    getApplications,
    getApplicationStatus,
    hideApplication,
  },
}))

vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: { getState: () => ({ user: { studentId: 7 } }) },
}))

import { useStudentTrackingStore } from './useStudentTrackingStore'

function detail(applicationId = 12): StudentApplicationStatusDto {
  return {
    applicationId,
    submittedAt: '2026-09-02T01:00:00.000Z',
    applicationStatus: 'under_review',
    studentResponse: 'pending',
    opportunity: {
      opportunityId: 2,
      title: 'Software Intern',
      department: 'Engineering',
      workArrangement: 'hybrid',
      minimumRequiredHours: 300,
      applicationDeadline: '2026-10-01',
      status: 'open',
    },
    company: {
      companyId: 3,
      companyName: 'Example Company',
      companyType: 'private',
    },
    referral: null,
    assignment: null,
    timeline: [],
    referralTimeline: [],
  }
}

describe('student tracking store initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStudentTrackingStore.setState({
      applications: [],
      selectedApplication: null,
      isLoading: false,
      error: null,
    })
  })

  it('loads a self-contained detail on a direct route load without a cached list entry', async () => {
    getApplicationStatus.mockResolvedValue(detail())

    const result = await useStudentTrackingStore.getState().fetchApplicationStatus(12)

    expect(getApplicationStatus).toHaveBeenCalledWith(7, 12)
    expect(result?.id).toBe('12')
    expect(result?.status).toBe('Under Review (QC PESO)')
  })

  it('treats zero visible applications as valid and clears a stale selection', async () => {
    getApplicationStatus.mockResolvedValue(detail(99))
    await useStudentTrackingStore.getState().fetchApplicationStatus(99)
    getApplications.mockResolvedValue([])

    await useStudentTrackingStore.getState().fetchApplications()

    expect(useStudentTrackingStore.getState().applications).toEqual([])
    expect(useStudentTrackingStore.getState().selectedApplication).toBeNull()
    expect(useStudentTrackingStore.getState().error).toBeNull()
  })

  it('clears the selected detail when the only visible application is hidden', async () => {
    const application = await (async () => {
      getApplicationStatus.mockResolvedValue(detail())
      return useStudentTrackingStore.getState().fetchApplicationStatus(12)
    })()
    useStudentTrackingStore.setState({ applications: application ? [application] : [] })
    hideApplication.mockResolvedValue(undefined)

    await useStudentTrackingStore.getState().hideApplication(12)

    expect(useStudentTrackingStore.getState().applications).toEqual([])
    expect(useStudentTrackingStore.getState().selectedApplication).toBeNull()
  })
})
