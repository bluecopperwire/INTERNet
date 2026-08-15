import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './features/authentication/components/LoginPage'
import SignUpPage from './features/authentication/components/SignUpPage'

// Intern Seeker
import InternSeekerLayout from './features/intern-seeker/components/InternSeekerLayout'
import InternshipPortalPage from './features/intern-seeker/pages/InternshipPortalPage'
import DigiCVPage from './features/intern-seeker/pages/DigiCVPage'
import InternshipSearchPage from './features/intern-seeker/pages/InternshipSearchPage'
import RequirementsPage from './features/intern-seeker/pages/RequirementsPage'
import { DashboardPage } from './features/intern-seeker/pages/DashboardPage'
import { ProfileEditorPage } from './features/intern-seeker/pages/ProfileEditorPage'
import ApplicationStatusPage from './features/intern-seeker/pages/ApplicationStatusPage'
import AttendancePage from './features/intern-seeker/pages/AttendancePage'

// QCPESO
import QCPesoLayout from './features/qcpeso/components/QCPesoLayout'
import MonitorReferralsPage from './features/qcpeso/pages/MonitorReferralsPage'
import ManageApplicationsPage from './features/qcpeso/pages/ManageApplicationsPage'
import ManageEmployersPage from './features/qcpeso/pages/ManageEmployersPage'
import MonitorInternsPage from './features/qcpeso/pages/MonitorInternsPage'
import MonitorAttendancePage from './features/qcpeso/pages/MonitorAttendancePage'
import ReportsDocumentsPage from './features/qcpeso/pages/ReportsDocumentsPage'
import QCPesoSettingsPage from './features/qcpeso/pages/QCPesoSettingsPage'
import { QCPesoDashboardPage } from './features/qcpeso/pages/QCPesoDashboardPage'
import { QCPesoProfilePage } from './features/qcpeso/pages/QCPesoProfilePage'

// Employer
import EmployerLayout from './features/employer/components/EmployerLayout'
import { EmployerDashboardPage } from './features/employer/pages/EmployerDashboardPage'
import { OpportunitiesPage } from './features/employer/pages/OpportunitiesPage'
import { CreateOpportunityPage } from './features/employer/pages/CreateOpportunityPage'
import { ApplicantsPage } from './features/employer/pages/ApplicantsPage'
import { CompanyProfilePage } from './features/employer/pages/CompanyProfilePage'

// Admin
import AdminLayout from './features/admin/components/AdminLayout'
import { AdminDashboardPage } from './features/admin/pages/AdminDashboardPage'
import { AuditLogsPage } from './features/admin/pages/AuditLogsPage'
import { BackupsMaintenancePage } from './features/admin/pages/BackupsMaintenancePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/sign-up/:role" element={<SignUpPage />} />

        {/* Intern Seeker Routes */}
        <Route path="/intern-seeker" element={<InternSeekerLayout />}>
          <Route index element={<InternshipPortalPage />} />
          <Route path="search" element={<InternshipSearchPage />} />
          <Route path="profile" element={<DashboardPage />} />
          <Route path="profile/edit" element={<ProfileEditorPage />} />
          <Route path="digicv" element={<DigiCVPage />} />
          <Route path="requirements" element={<RequirementsPage />} />
          <Route path="application-status" element={<ApplicationStatusPage />} />
          <Route path="attendance" element={<AttendancePage />} />
        </Route>

        <Route path="/terms-of-service" element={<main aria-label="Terms of Service" />} />
        <Route path="/privacy-policy" element={<main aria-label="Privacy Policy" />} />

        {/* QCPESO Routes */}
        <Route path="/qcpeso" element={<QCPesoLayout />}>
          <Route index element={<QCPesoDashboardPage />} />
          <Route path="dashboard" element={<QCPesoDashboardPage />} />
          <Route path="profile" element={<QCPesoProfilePage />} />
          <Route path="manage/applications" element={<ManageApplicationsPage />} />
          <Route path="manage/employers" element={<ManageEmployersPage />} />
          <Route path="monitor/referrals" element={<MonitorReferralsPage />} />
          <Route path="monitor/interns" element={<MonitorInternsPage />} />
          <Route path="monitor/attendance" element={<MonitorAttendancePage />} />
          <Route path="reports-documents" element={<ReportsDocumentsPage />} />
          <Route path="settings" element={<QCPesoSettingsPage />} />
          <Route path="*" element={<Navigate to="/qcpeso/dashboard" replace />} />
        </Route>

        {/* Employer Routes */}
        <Route path="/employer" element={<EmployerLayout />}>
          <Route index element={<EmployerDashboardPage />} />
          <Route path="dashboard" element={<EmployerDashboardPage />} />
          <Route path="profile" element={<CompanyProfilePage />} />
          <Route path="opportunities" element={<OpportunitiesPage />} />
          <Route path="opportunities/create" element={<CreateOpportunityPage />} />
          <Route path="opportunities/:id/edit" element={<CreateOpportunityPage />} />
          <Route path="applicants" element={<ApplicantsPage />} />
          <Route path="*" element={<Navigate to="/employer/dashboard" replace />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="backups-maintenance" element={<BackupsMaintenancePage />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App