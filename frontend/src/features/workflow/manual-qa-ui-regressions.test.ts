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

  it('uses one responsive table system with desktop overflow and mobile record cards', () => {
    const table = readSource('../../components/DataTable.tsx')
    const css = readSource('../../components/DataTable.module.css')
    const primitives = readSource('../../components/TablePrimitives.tsx')
    const primitiveCss = readSource('../../components/TablePrimitives.module.css')
    expect(table).toContain('desktopViewport')
    expect(table).toContain('mobileCard')
    expect(table).toContain('headerAlign')
    expect(table).toContain('minWidth')
    expect(table).toContain('noWrap')
    expect(table).toContain('styles.footer')
    expect(css).toContain('overflow-x: auto')
    expect(css).toMatch(/\.footer\s*\{[^}]*padding-top:\s*24px/s)
    expect(css).toContain('@media (max-width: 720px)')
    expect(css).toContain('.mobileField')
    expect(primitives).toContain('truncateSecondary')
    expect(primitives).toContain('title={truncateSecondary')
    expect(primitiveCss).toMatch(/\.truncate\s*\{[^}]*text-overflow:\s*ellipsis/s)
  })

  it('keeps attendance fallbacks, minutes, periods, and action alignment explicit', () => {
    const qc = readSource('../qcpeso/pages/InternManagementPages.tsx')
    const employerAttendance = readSource('../employer/pages/AttendanceMonitoringPage.tsx')
    const employerManage = readSource('../employer/pages/MonitorInternshipPage.tsx')
    const employerHistory = readSource('../employer/pages/InternshipHistoryPage.tsx')

    for (const source of [qc, employerAttendance]) {
      expect(source).toContain("'No Time In'")
      expect(source).toContain("'No Time Out'")
      expect(source).toContain('renderedMinutes')
      expect(source).toContain("headerAlign: 'center'")
    }
    for (const source of [qc, employerManage, employerHistory]) {
      expect(source).toContain("header: 'Progress'")
      expect(source).toContain("header: 'Period'")
      expect(source).toContain('remainingMinutes')
      expect(source).toContain('endDate ||')
    }
  })

  it('aligns history actions and keeps Admin submenu navigation ordered and illustrated', () => {
    const primitiveCss = readSource('../../components/TablePrimitives.module.css')
    const sidebar = readSource('../admin/components/AdminSidebar.tsx')
    const actionsRule = primitiveCss.slice(
      primitiveCss.indexOf('.actions {'),
      primitiveCss.indexOf('}', primitiveCss.indexOf('.actions {')) + 1,
    )

    expect(actionsRule).toContain('width: 100%')
    expect(actionsRule).toContain('justify-content: center')
    expect(sidebar.indexOf('<span>Manage Students</span>')).toBeLessThan(sidebar.indexOf('<span>Manage QC PESO</span>'))
    expect(sidebar.indexOf('<span>Manage QC PESO</span>')).toBeLessThan(sidebar.indexOf('<span>Manage Employers</span>'))
    for (const icon of ['GraduationCap', 'Building2', 'BriefcaseBusiness', 'FileText']) {
      expect(sidebar).toContain(`<${icon} size={17}`)
    }
  })

  it('keeps Create Assignment student names at normal body weight', () => {
    const page = readSource('../employer/pages/InternshipWorkflowPages.tsx')
    expect(page).toContain('primary={assignment.studentName}')
    expect(page).not.toContain('<td><strong>{assignment.studentName}</strong></td>')
  })

  it('renders assignment working days as a compact checkbox row', () => {
    const page = readSource('../employer/pages/InternshipWorkflowPages.tsx')
    const css = readSource('../employer/pages/InternshipWorkflowPages.module.css')
    expect(page).toContain('<div className={styles.dayOptions}>')
    expect(page).toContain('{day.slice(0, 3)}')
    expect(css).toMatch(/\.dayOptions input\s*\{[^}]*width: 16px;[^}]*height: 16px;/s)
  })

  it('uses exact day checkboxes for student availability editing', () => {
    const studentEditor = readSource('../intern-seeker/pages/ProfileEditorPage.tsx')
    const adminEditor = readSource('../admin/pages/AdminStudentProfileEditorPage.tsx')
    for (const editor of [studentEditor, adminEditor]) {
      expect(editor).toContain('AVAILABILITY_DAYS.map')
      expect(editor).toContain('type="checkbox"')
      expect(editor).not.toContain("['Weekdays', 'Weekends', 'Flexible']")
    }
  })
})
