import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { status, bootstrap } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (status === 'bootstrapping') {
      bootstrap();
    }
  }, [status, bootstrap]);

  if (status === 'bootstrapping') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-medium text-slate-600">Restoring session...</p>
      </div>
    );
  }

  if (status === 'anonymous' || status === 'error') {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/?returnTo=${returnTo}`} replace />;
  }

  return <>{children}</>;
};
