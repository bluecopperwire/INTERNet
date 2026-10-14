import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { adaptAdminDashboardSummary } from './adapters/admin.adapters'

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('Admin dashboard account overview', () => {
  it('adapts totals and preserves each account status independently', () => {
    const summary = adaptAdminDashboardSummary(
      { totalRegistered: 12, activeAccounts: 8, suspendedAccounts: 2, archivedAccounts: 2 },
      { totalRegistered: 6, activeAccounts: 3, suspendedAccounts: 1, archivedAccounts: 2 },
      { totalRegistered: 4, activeAccounts: 2, suspendedAccounts: 1, archivedAccounts: 1 },
    )

    expect(summary.totalAccounts).toBe(22)
    expect(summary.studentAccounts).toEqual({ total: 12, active: 8, suspended: 2, deactivated: 2 })
    expect(summary.pesoAccounts).toEqual({ total: 4, active: 2, suspended: 1, deactivated: 1 })
    expect(summary.employerAccounts).toEqual({ total: 6, active: 3, suspended: 1, deactivated: 2 })
  })

  it('renders only the requested summary and role account-status sections', () => {
    const page = readSource('./pages/AdminDashboardPage.tsx')
    const labels = ['Total Accounts', 'Student Accounts', 'QC PESO Accounts', 'Employer Accounts']
    const positions = labels.map((label) => page.indexOf(`['${label}'`))

    expect(positions.every((position) => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    for (const title of [
      'Student Account Status',
      'QC PESO Account Status',
      'Employer Account Status',
    ]) {
      expect(page).toContain(`title="${title}"`)
    }
    for (const status of ['Active', 'Suspended', 'Deactivated']) {
      expect(page).toContain(`label: '${status}'`)
    }
    expect(page).not.toContain('Recent System Audit Events')
    expect(page).not.toContain('Super Admin Actions')
    expect(page).not.toContain('systemHealthBar')
  })
})
