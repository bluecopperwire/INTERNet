import { BrowserRouter, Route, Routes } from 'react-router-dom'
import LoginPage from './features/authentication/components/LoginPage'
import SignUpPage from './features/authentication/components/SignUpPage'
import InternSeekerLayout from './features/intern-seeker/components/InternSeekerLayout'
import EmptyInternSeekerPage from './features/intern-seeker/pages/EmptyInternSeekerPage'
import InternshipPortalPage from './features/intern-seeker/pages/InternshipPortalPage'
import DigiCVPage from './features/intern-seeker/pages/DigiCVPage'
import InternshipSearchPage from './features/intern-seeker/pages/InternshipSearchPage'
import { DashboardPage } from './features/intern-seeker/pages/DashboardPage'
import { ProfileEditorPage } from './features/intern-seeker/pages/ProfileEditorPage'

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
          <Route path="requirements" element={<EmptyInternSeekerPage />} />
        </Route>
        
        <Route path="/terms-of-service" element={<main aria-label="Terms of Service" />} />
        <Route path="/privacy-policy" element={<main aria-label="Privacy Policy" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App