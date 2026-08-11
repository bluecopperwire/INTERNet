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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/sign-up/:role" element={<SignUpPage />} />
        
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

        {/* QCPESO Admin & Monitor Routes */}
        <Route path="/qcpeso" element={<QCPesoLayout />}>
          <Route index element={<Navigate to="/qcpeso/monitor/referrals" replace />} />
          <Route path="monitor/referrals" element={<MonitorReferralsPage />} />
          <Route path="monitor/interns" element={<MonitorInternsPage />} />
          <Route path="*" element={<Navigate to="/qcpeso/monitor/referrals" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
