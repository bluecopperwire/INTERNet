import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './features/authentication/components/LoginPage'
import SignUpPage from './features/authentication/components/SignUpPage'
import InternSeekerLayout from './features/intern-seeker/components/InternSeekerLayout'
import InternshipPortalPage from './features/intern-seeker/pages/InternshipPortalPage'
import DigiCVPage from './features/intern-seeker/pages/DigiCVPage'
import InternshipSearchPage from './features/intern-seeker/pages/InternshipSearchPage'
import RequirementsPage from './features/intern-seeker/pages/RequirementsPage'
import { DashboardPage } from './features/intern-seeker/pages/DashboardPage'
import { ProfileEditorPage } from './features/intern-seeker/pages/ProfileEditorPage'
import ApplicationStatusPage from './features/intern-seeker/pages/ApplicationStatusPage'
import AttendancePage from './features/intern-seeker/pages/AttendancePage'
import QCPesoLayout from './features/qcpeso/components/QCPesoLayout'
import MonitorReferralsPage from './features/qcpeso/pages/MonitorReferralsPage'
import MonitorInternsPage from './features/qcpeso/pages/MonitorInternsPage'
import { OpportunitiesPage } from './features/employer/pages/OpportunitiesPage'
import { CreateOpportunityPage } from './features/employer/pages/CreateOpportunityPage'
import { ApplicantsPage } from './features/employer/pages/ApplicantsPage'
import { CompanyProfilePage } from './features/employer/pages/CompanyProfilePage'
import EmployerLayout from './features/employer/components/EmployerLayout'
import AdminLayout from './features/admin/components/AdminLayout'
import BackupsMaintenancePage from './features/admin/pages/BackupsMaintenancePage'

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

        {/* QCPESO Monitor Routes */}
        <Route path="/qcpeso" element={<QCPesoLayout />}>
          <Route index element={<Navigate to="/qcpeso/monitor/referrals" replace />} />
          <Route path="monitor/referrals" element={<MonitorReferralsPage />} />
          <Route path="monitor/interns" element={<MonitorInternsPage />} />
          <Route path="*" element={<Navigate to="/qcpeso/monitor/referrals" replace />} />
        </Route>

        {/* Employer Routes */}
        <Route path="/employer" element={<EmployerLayout />}>
          <Route index element={<Navigate to="/employer/profile" replace />} />
          <Route path="dashboard" element={<Navigate to="/employer/profile" replace />} />
          <Route path="profile" element={<CompanyProfilePage />} />
          <Route path="opportunities" element={<OpportunitiesPage />} />
          <Route path="opportunities/create" element={<CreateOpportunityPage />} />
          <Route path="opportunities/:id/edit" element={<CreateOpportunityPage />} />
          <Route path="applicants" element={<ApplicantsPage />} />
          <Route path="*" element={<Navigate to="/employer/profile" replace />} />
        </Route>

        {/* System Administrator Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/backups-maintenance" replace />} />
          <Route path="backups-maintenance" element={<BackupsMaintenancePage />} />
          <Route path="*" element={<Navigate to="/admin/backups-maintenance" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
