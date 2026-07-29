export type UserRole = 'Intern Seeker' | 'Company' | 'QCPESO';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
  role: UserRole;
}

export interface AuthState {
  selectedRole: UserRole;
  isLoading: boolean;
  error: string | null;
  setRole: (role: UserRole) => void;
  setError: (error: string | null) => void;
}
