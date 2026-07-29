import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import { LoginView } from './features/authentication/components/LoginView';

const App: React.FC = () => {
  // will replace this local state with your JWT auth state logic 
  // managed by Passport / NestJS via Context or Redux later
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  return (
    <Router>
      <div style={{ fontFamily: 'Inter, sans-serif' }}>
        {/* Quick toggle purely for local testing of the navbar auth state */}
        <div style={{ position: 'fixed', bottom: 10, right: 10, zIndex: 999 }}>
          <button
            onClick={() => setIsAuthenticated(!isAuthenticated)}
            style={{ padding: '8px 16px', background: '#cc0001', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Toggle Auth State (Current: {isAuthenticated ? 'Logged In' : 'Logged Out'})
          </button>
        </div>

        <Routes>
          <Route path="/" element={!isAuthenticated ? <LoginView /> : <Navigate to="/home" />} />
          <Route path="/login" element={<LoginView />} />
          <Route path="/home" element={<LandingPage isLoggedIn={isAuthenticated} />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;