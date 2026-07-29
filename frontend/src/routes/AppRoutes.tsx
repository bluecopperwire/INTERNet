import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginView } from '../features/authentication/components/LoginView';

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginView />} />
        <Route path="/login" element={<LoginView />} />
        {/* Fallback route directing unknown paths to the login screen */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
export default AppRoutes;
