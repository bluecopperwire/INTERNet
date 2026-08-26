import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import type { UserRole } from '../../types/api';

interface RoleRouteProps {
  allowedRoles: UserRole[];
  children: ReactNode;
  fallbackPath?: string;
}

export function RoleRoute({
  allowedRoles,
  children,
  fallbackPath,
}: RoleRouteProps) {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(user.userRole)) {
    const roleDefaultRedirect: Record<UserRole, string> = {
      student: '/intern-seeker',
      company: '/employer/dashboard',
      peso_personnel: '/qcpeso/dashboard',
      admin: '/admin/dashboard',
    };

    const target = fallbackPath || roleDefaultRedirect[user.userRole] || '/';
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
