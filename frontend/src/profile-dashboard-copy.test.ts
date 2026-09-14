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

  it('shows read-only account information only on owner and Admin profile views', () => {
    const ownerProfiles = [
      readSource('src/features/intern-seeker/pages/DashboardPage.tsx'),
      readSource('src/features/employer/pages/CompanyProfilePage.tsx'),
      readSource('src/features/qcpeso/pages/QCPesoProfilePage.tsx'),
    ]
    const adminProfiles = [
      readSource('src/features/admin/pages/AdminStudentDetailsPage.tsx'),
      readSource('src/features/admin/pages/AdminEmployerRecordPages.tsx'),
      readSource('src/features/admin/pages/AdminQCPesoRecordPages.tsx'),
    ]

    for (const profile of [...ownerProfiles, ...adminProfiles]) {
      expect(profile).toContain('Account Information')
      expect(profile).toContain('Account Email Address')
      expect(profile).toContain('Account User Code')
    }
    for (const profile of ownerProfiles) expect(profile).toContain('useAuthStore')

    const restrictedView = readSource('src/features/qcpeso/pages/MonitorUserDetailsPage.tsx')
    expect(restrictedView).not.toContain('Account Information')

    for (const editor of [
      'src/features/intern-seeker/pages/ProfileEditorPage.tsx',
      'src/features/employer/pages/CompanyProfileEditorPage.tsx',
      'src/features/qcpeso/pages/QCPesoProfileEditorPage.tsx',
      'src/features/admin/pages/AdminStudentProfileEditorPage.tsx',
    ]) {
      expect(readSource(editor)).not.toContain('Account Email Address')
      expect(readSource(editor)).not.toContain('Account User Code')
    }
  })

  it('provides the standardized Admin owner profile and a separate editable form', () => {
    const profile = readSource('src/features/admin/pages/AdminProfilePage.tsx')
    const editor = readSource('src/features/admin/pages/AdminProfileEditorPage.tsx')
    const routes = readSource('src/App.tsx')
    const sidebar = readSource('src/features/admin/components/AdminSidebar.tsx')

    for (const label of [
      'Personal Information',
      'Full Name',
      'Address',
      'Birthdate',
      'Sex',
      'Contact Information',
      'Email Address',
      'Contact Number',
      'Account Information',
      'Account Email Address',
      'Account User Code',
    ]) {
      expect(profile).toContain(label)
    }
    expect(editor).toContain('Edit Admin Profile')
    expect(editor).not.toContain('Account Email Address')
    expect(editor).not.toContain('Account User Code')
    expect(routes).toContain('<Route path="profile" element={<AdminProfilePage />} />')
    expect(routes).toContain('<Route path="profile/edit" element={<AdminProfileEditorPage />} />')
    expect(sidebar).toContain('to="/admin/profile"')
  })

  it('organizes the Student tracking menu and Admin account navigation', () => {
    const studentSidebar = readSource('src/features/intern-seeker/components/InternSeekerSidebar.tsx')
    const adminSidebar = readSource('src/features/admin/components/AdminSidebar.tsx')

    expect(studentSidebar).toContain("label: 'Student Profile'")
    expect(studentSidebar).not.toContain("label: 'User Profile'")
    expect(studentSidebar).toContain('<span>My Tracking</span>')
    for (const [label, path] of [
      ['My Requirements', '/intern-seeker/requirements'],
      ['My Applications', '/intern-seeker/application-status'],
      ['My Internship', '/intern-seeker/internship'],
      ['My Attendance', '/intern-seeker/attendance'],
      ['My Internship History', '/intern-seeker/internship-history'],
    ]) {
      expect(studentSidebar).toContain(`label: '${label}', path: '${path}'`)
    }

    expect(adminSidebar).toContain('<span>Admin Profile</span>')
    expect(adminSidebar).toContain('className={styles.userSummary}')
    expect(adminSidebar).toContain("navigate('/admin/profile')")
    expect(adminSidebar.indexOf('Backups and<br />Maintenance')).toBeLessThan(
      adminSidebar.indexOf('to="/admin/settings"'),
    )
  })

  it('highlights only the selected Student tracking child and aligns Admin settings', () => {
    const studentSidebar = readSource('src/features/intern-seeker/components/InternSeekerSidebar.tsx')
    const adminSettings = readSource('src/features/admin/pages/AdminSettingsPage.tsx')

    expect(studentSidebar).toContain('className={styles.navGroupButton}')
    expect(studentSidebar).not.toContain('styles.activeGroup')
    expect(studentSidebar).toContain('styles.subNavItem')
    expect(studentSidebar).toContain('? styles.active')

    expect(adminSettings).toContain("const [currentPassword, setCurrentPassword] = useState('')")
    expect(adminSettings).toContain('className={styles.fullWidth}')
    expect(adminSettings).toContain('authService.changePassword({ currentPassword, password: newPassword })')
    expect(adminSettings).toContain('disabled={isSubmitting}')
    expect(adminSettings).toContain("isSubmitting ? 'Updating...' : 'Update Password'")
    expect(adminSettings).toContain('Manage your account preferences and security settings.')
  })
})
