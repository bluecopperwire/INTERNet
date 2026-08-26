import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './features/authentication/components/LoginPage'
import SignUpPage from './features/authentication/components/SignUpPage'
import { AuthCallbackPage } from './features/authentication/components/AuthCallbackPage'
import { ProtectedRoute } from './components/routing/ProtectedRoute'
import { RoleRoute } from './components/routing/RoleRoute'
import { PesoVerificationGate } from './features/authentication/components/PesoVerificationGate'

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
import { InternshipDetailsPage } from './features/intern-seeker/pages/InternshipDetailsPage'
import TrackingLayout from './features/intern-seeker/components/TrackingLayout'

// QCPESO
import QCPesoLayout from './features/qcpeso/components/QCPesoLayout'
import ReportsDocumentsPage from './features/qcpeso/pages/ReportsDocumentsPage'
import QCPesoSettingsPage from './features/qcpeso/pages/QCPesoSettingsPage'
import { QCPesoDashboardPage } from './features/qcpeso/pages/QCPesoDashboardPage'
import { QCPesoProfilePage } from './features/qcpeso/pages/QCPesoProfilePage'
import { QCPesoProfileEditorPage } from './features/qcpeso/pages/QCPesoProfileEditorPage'
import { MonitorUsersPage } from './features/qcpeso/pages/MonitorUsersPage'
import { MonitorUserDetailsPage } from './features/qcpeso/pages/MonitorUserDetailsPage'
import { CreateEmployerPage } from './features/qcpeso/pages/CreateEmployerPage'
import { ReferralDetailsPage, ReviewApplicantDetailsPage, ReviewApplicantsPage, TrackReferralsPage } from './features/qcpeso/pages/ApplicantManagementPages'
import { QCPesoOpportunityViewPage } from './features/qcpeso/pages/QCPesoOpportunityViewPage'
import { QCPesoAttendanceDetailsPage, QCPesoAttendancePage, QCPesoInternshipDetailsPage, QCPesoManageInternshipPage } from './features/qcpeso/pages/InternManagementPages'

// Employer
import EmployerLayout from './features/employer/components/EmployerLayout'
import { EmployerDashboardPage } from './features/employer/pages/EmployerDashboardPage'
import { OpportunitiesPage } from './features/employer/pages/OpportunitiesPage'
import { CreateOpportunityPage } from './features/employer/pages/CreateOpportunityPage'
import { OpportunityDetailsPage } from './features/employer/pages/OpportunityDetailsPage'
import { ApplicantsPage } from './features/employer/pages/ApplicantsPage'
import { CompanyProfilePage } from './features/employer/pages/CompanyProfilePage'
import { CompanyProfileEditorPage } from './features/employer/pages/CompanyProfileEditorPage'
import { ReviewApplicantPage } from './features/employer/pages/ReviewApplicantPage'
import { AttendanceMonitoringPage } from './features/employer/pages/AttendanceMonitoringPage'
import { AttendanceInternshipDetailsPage } from './features/employer/pages/AttendanceInternshipDetailsPage'
import { ReportsPage } from './features/employer/pages/ReportsPage'
import { EmployerSettingsPage } from './features/employer/pages/EmployerSettingsPage'
import { CreateInternshipAssignmentPage, ReviewInternshipAssignmentPage } from './features/employer/pages/InternshipWorkflowPages'
import { MonitorInternshipPage } from './features/employer/pages/MonitorInternshipPage'
import { MonitorInternshipDetailsPage } from './features/employer/pages/MonitorInternshipDetailsPage'

// Admin
import AdminLayout from './features/admin/components/AdminLayout'
import { AdminDashboardPage } from './features/admin/pages/AdminDashboardPage'
import { AuditLogsPage } from './features/admin/pages/AuditLogsPage'
import { BackupsMaintenancePage } from './features/admin/pages/BackupsMaintenancePage'
import { ManageStudentsPage } from './features/admin/pages/ManageStudentsPage'
import { AdminStudentDetailsPage } from './features/admin/pages/AdminStudentDetailsPage'
import { AdminStudentProfileEditorPage } from './features/admin/pages/AdminStudentProfileEditorPage'
import { ManageEmployersPage as AdminManageEmployersPage } from './features/admin/pages/ManageEmployersPage'
import { ManageQCPesoPage } from './features/admin/pages/ManageQCPesoPage'
import { AdminEmployerDetailsPage, AdminEmployerEditorPage } from './features/admin/pages/AdminEmployerRecordPages'
import { AdminQCPesoDetailsPage, AdminQCPesoEditorPage } from './features/admin/pages/AdminQCPesoRecordPages'
import { AdminCreateEmployerPage, AdminCreateQCPesoPage } from './features/admin/pages/AdminCreateRecordPages'
import { AdminSettingsPage } from './features/admin/pages/AdminSettingsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/register/student/profile" element={<SignUpPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Intern Seeker Routes */}
        <Route
          path="/intern-seeker"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['student']}>
                <InternSeekerLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<InternshipPortalPage />} />
          <Route path="search" element={<InternshipSearchPage />} />
          <Route path="profile" element={<DashboardPage />} />
          <Route path="profile/edit" element={<ProfileEditorPage />} />
          <Route path="digicv" element={<DigiCVPage />} />
          <Route path="internship-details" element={<InternshipDetailsPage />} />
          <Route element={<TrackingLayout />}>
            <Route path="requirements" element={<RequirementsPage />} />
            <Route path="application-status" element={<ApplicationStatusPage />} />
            <Route path="attendance" element={<AttendancePage />} />
          </Route>
        </Route>

        <Route path="/terms-of-service" element={<main aria-label="Terms of Service" />} />
        <Route path="/privacy-policy" element={<main aria-label="Privacy Policy" />} />

        {/* QCPESO Routes */}
        <Route
          path="/qcpeso"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['peso_personnel']}>
                <PesoVerificationGate>
                  <QCPesoLayout />
                </PesoVerificationGate>
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<QCPesoDashboardPage />} />
          <Route path="dashboard" element={<QCPesoDashboardPage />} />
          <Route path="profile" element={<QCPesoProfilePage />} />
          <Route path="profile/edit" element={<QCPesoProfileEditorPage />} />
          <Route path="monitor-users/students" element={<MonitorUsersPage kind="students" />} />
          <Route path="monitor-users/students/:id" element={<MonitorUserDetailsPage />} />
          <Route path="monitor-users/employers" element={<MonitorUsersPage kind="companies" />} />
          <Route path="monitor-users/employers/create" element={<CreateEmployerPage />} />
          <Route path="monitor-users/employers/:id" element={<MonitorUserDetailsPage />} />
          <Route path="manage-applicants/review" element={<ReviewApplicantsPage />} />
          <Route path="manage-applicants/review/:id" element={<ReviewApplicantDetailsPage />} />
          <Route path="manage-applicants/referrals" element={<TrackReferralsPage />} />
          <Route path="manage-applicants/referrals/:id" element={<ReferralDetailsPage />} />
          <Route path="manage-applicants/opportunities/:id" element={<QCPesoOpportunityViewPage />} />
          <Route path="manage-interns/attendance" element={<QCPesoAttendancePage />} />
          <Route path="manage-interns/attendance/:id" element={<QCPesoAttendanceDetailsPage />} />
          <Route path="manage-interns/internships" element={<QCPesoManageInternshipPage />} />
          <Route path="manage-interns/internships/:id" element={<QCPesoInternshipDetailsPage />} />
          <Route path="reports-documents" element={<ReportsDocumentsPage />} />
          <Route path="settings" element={<QCPesoSettingsPage />} />
          <Route path="*" element={<Navigate to="/qcpeso/dashboard" replace />} />
        </Route>

        {/* Employer Routes */}
        <Route
          path="/employer"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['company']}>
                <EmployerLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<EmployerDashboardPage />} />
          <Route path="dashboard" element={<EmployerDashboardPage />} />
          <Route path="profile" element={<CompanyProfilePage />} />
          <Route path="profile/edit" element={<CompanyProfileEditorPage />} />
          <Route path="opportunities" element={<OpportunitiesPage />} />
          <Route path="opportunities/create" element={<CreateOpportunityPage />} />
          <Route path="opportunities/:id" element={<OpportunityDetailsPage />} />
          <Route path="opportunities/:id/edit" element={<CreateOpportunityPage />} />
          <Route path="applicants" element={<ApplicantsPage />} />
          <Route path="applicants/:id" element={<ReviewApplicantPage />} />
          <Route path="internship-assignments" element={<CreateInternshipAssignmentPage />} />
          <Route path="internship-assignments/:id" element={<ReviewInternshipAssignmentPage />} />
          <Route path="attendance" element={<AttendanceMonitoringPage />} />
          <Route path="attendance/:applicantId" element={<AttendanceInternshipDetailsPage />} />
          <Route path="manage-internship" element={<MonitorInternshipPage />} />
          <Route path="manage-internship/:applicantId" element={<MonitorInternshipDetailsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<EmployerSettingsPage />} />
          <Route path="*" element={<Navigate to="/employer/dashboard" replace />} />
        </Route>

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['admin']}>
                <AdminLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="manage-students" element={<ManageStudentsPage />} />
          <Route path="manage-students/:id/edit" element={<AdminStudentProfileEditorPage />} />
          <Route path="manage-students/:id" element={<AdminStudentDetailsPage />} />
          <Route path="manage-employers" element={<AdminManageEmployersPage />} />
          <Route path="manage-employers/create" element={<AdminCreateEmployerPage />} />
          <Route path="manage-employers/:id/edit" element={<AdminEmployerEditorPage />} />
          <Route path="manage-employers/:id" element={<AdminEmployerDetailsPage />} />
          <Route path="manage-qcpeso" element={<ManageQCPesoPage />} />
          <Route path="manage-qcpeso/create" element={<AdminCreateQCPesoPage />} />
          <Route path="manage-qcpeso/:id/edit" element={<AdminQCPesoEditorPage />} />
          <Route path="manage-qcpeso/:id" element={<AdminQCPesoDetailsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="backups-maintenance" element={<BackupsMaintenancePage />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
