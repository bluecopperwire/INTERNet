import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readSource = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('manual QA UI regressions', () => {
  it('keeps deletion only in the selected tracker and renders zero-record states', () => {
    const page = readSource('../intern-seeker/pages/ApplicationStatusPage.tsx')
    expect(page).not.toContain('listDeleteButton')
    expect(page).not.toContain('<Trash2')
    expect(page).toContain("applications[0]?.id ?? null")
    expect(page).toContain('There are currently no applications to track.')
    expect(page).toContain("'Delete Application'")
  })

  it('uses one rejection title and scopes the red background to badges', () => {
    const page = readSource('../intern-seeker/pages/ApplicationStatusPage.tsx')
    const css = readSource('../intern-seeker/pages/ApplicationStatusPage.module.css')
    expect(page).toContain("title: 'Application Rejection Remark'")
    expect(page).not.toContain('QC PESO Endorsement Remark')
    expect(css).toContain('.statusBadge.rejected')
    expect(css).not.toMatch(/(?:^|\r?\n)\.rejected\s*\{[^}]*background:/s)
    expect(css).toContain('.rejected .timelineLine')
  })

  it('does not disable terminal history Delete buttons with decision-only CSS', () => {
    const css = readSource('../employer/pages/ReviewApplicantPage.module.css')
    const qc = readSource('../qcpeso/pages/ApplicantManagementPages.tsx')
    const employer = readSource('../employer/pages/ReviewApplicantPage.tsx')
    expect(css).toContain('.workflowAction')
    expect(css).not.toContain('.statusPill.rejected) .actionRed')
    expect(qc).toContain('isTerminalApplication(record.applicationStatus)')
    expect(employer).toContain('isTerminalReferral(applicant.referralStatus)')
  })

  it('provides wide, centered, wrapping workflow tables without changing columns', () => {
    const workflowTable = readSource('../employer/pages/ApplicantsPage.module.css')
    const assignmentTable = readSource('../employer/pages/InternshipWorkflowPages.module.css')
    expect(workflowTable).toContain('overflow-x: auto')
    expect(workflowTable).toContain('min-width: 1120px')
    expect(workflowTable).toContain('overflow-wrap: anywhere')
    expect(workflowTable).toContain('justify-content: center')
    expect(assignmentTable).toContain('text-align: center')
    expect(assignmentTable).toContain('overflow-wrap: anywhere')
  })

  it('keeps Create Assignment student names at normal body weight', () => {
    const page = readSource('../employer/pages/InternshipWorkflowPages.tsx')
    expect(page).toContain('<td>{assignment.studentName}</td>')
    expect(page).not.toContain('<td><strong>{assignment.studentName}</strong></td>')
  })
})
