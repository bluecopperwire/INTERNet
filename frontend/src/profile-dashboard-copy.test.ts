import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { EmployerDashboardSummary } from './features/employer/types/employer.types'
import { employerService } from './features/employer/services/employer.service'
import { useEmployerStore } from './features/employer/stores/useEmployerStore'

const readSource = (path: string) => readFileSync(path, 'utf8')

describe('profile and dashboard labels', () => {
  it('uses Program / Strand on the Student profile and editor', () => {
    const profile = readSource('src/features/intern-seeker/pages/DashboardPage.tsx')
    const editor = readSource('src/features/intern-seeker/pages/ProfileEditorPage.tsx')

    expect(profile).toContain("['Program / Strand', profile.academic.program]")
    expect(editor).toContain('label="Program / Strand"')
    expect(editor).toContain('placeholder="e.g., BS Information Technology"')
  })

  it('uses the freshly loaded company name in the dashboard greeting', async () => {
    const originalFetchDashboard = useEmployerStore.getState().fetchDashboard
    const summary: EmployerDashboardSummary = {
      companyName: 'DevSeed Technology Corp.',
      activeOpportunities: 1,
      totalApplicants: 2,
      acceptedPercentage: 50,
      rejectedPercentage: 0,
      pendingReviews: 1,
      acceptanceRate: 50,
    }
    const fetchDashboard = vi.fn(async () => {
      useEmployerStore.setState({ summary })
    })

    useEmployerStore.setState({ summary: null, fetchDashboard })
    try {
      await expect(employerService.getDashboardSummary()).resolves.toEqual(summary)
      expect(fetchDashboard).toHaveBeenCalledOnce()
      expect(readSource('src/features/employer/pages/EmployerDashboardPage.tsx')).toContain('title={`Welcome, ${summary.companyName}!`}')
    } finally {
      useEmployerStore.setState({ summary: null, fetchDashboard: originalFetchDashboard })
    }
  })
})
