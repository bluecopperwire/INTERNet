import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(path, 'utf8')

describe('history detail page actions', () => {
  it('renders QC PESO application history actions as detached, icon-free full-width buttons', () => {
    const source = readSource('src/features/qcpeso/pages/ApplicantManagementPages.tsx')
    const historyActions = source.slice(
      source.indexOf('{readOnly && (', source.indexOf('export function ReviewApplicantDetailsPage')),
      source.indexOf('{showRejectModal', source.indexOf('export function ReviewApplicantDetailsPage')),
    )
    const styles = readSource('src/features/employer/pages/ReviewApplicantPage.module.css')

    expect(historyActions).toContain('detailStyles.historyActions')
    expect(historyActions).toContain('detailStyles.historyPrimaryAction')
    expect(historyActions).toContain('View Opportunity')
    expect(historyActions).toContain('detailStyles.historyDeleteAction')
    expect(historyActions).toContain('Delete')
    expect(historyActions).not.toContain('<Eye')
    expect(historyActions).not.toContain('<Trash2')
    expect(styles).toMatch(/\.historyActions\s*{[\s\S]*?max-width:\s*1280px/)
    expect(styles).toMatch(/\.historyActionButton\s*{[\s\S]*?width:\s*100%/)
  })

  it('renders Company referral history with only its detached, icon-free delete action', () => {
    const source = readSource('src/features/employer/pages/ReviewApplicantPage.tsx')
    const historyActions = source.slice(
      source.indexOf('{canDeleteHistoryReferral && ('),
      source.indexOf('{showScheduleInterview'),
    )

    expect(historyActions).toContain('styles.historyActions')
    expect(historyActions).toContain('styles.historyDeleteAction')
    expect(historyActions).toContain('Delete')
    expect(historyActions).not.toContain('View Opportunity')
    expect(historyActions).not.toContain('<Trash2')
  })
})
