import { create } from 'zustand';
import { authService } from '../services/auth.service';
import { configureApiAuth, normalizeApiError } from '../services/api';
import type {
  AuthState,
  LoginRequest,
  StudentRegisterRequest,
  PesoRegisterRequest,
} from '../features/authentication/types/auth.types';
import type { UserRole } from '../types/api';

const ACCESS_TOKEN_KEY = 'internet.auth.access.v1';

interface AuthStore extends AuthState {
  bootstrap: () => Promise<void>;
  login: (credentials: LoginRequest, expectedRole?: string) => Promise<UserRole>;
  registerStudent: (payload: StudentRegisterRequest) => Promise<void>;
  registerPeso: (payload: PesoRegisterRequest) => Promise<string>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  setAccessToken: (token: string | null) => void;
  loadMe: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  status: 'bootstrapping',
  user: null,
  accessToken: sessionStorage.getItem(ACCESS_TOKEN_KEY),
  error: null,

  setAccessToken: (token: string | null) => {
    if (token) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    }
    set({ accessToken: token });
  },

  loadMe: async () => {
    try {
      const user = await authService.getCurrentUser();
      set({ user, status: 'authenticated', error: null });
    } catch {
      set({ user: null, status: 'anonymous', accessToken: null, error: null });
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  },

  bootstrap: async () => {
    set({ status: 'bootstrapping', error: null });
    const storedToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);

    if (storedToken) {
      get().setAccessToken(storedToken);
      try {
        const user = await authService.getCurrentUser();
        set({ user, status: 'authenticated', error: null });
        return;
      } catch {
        // Stored access token expired, try refresh
      }
    }

    try {
      const tokenRes = await authService.refreshTokens();
      get().setAccessToken(tokenRes.accessToken);
      const user = await authService.getCurrentUser();
      set({ user, status: 'authenticated', error: null });
    } catch {
      get().setAccessToken(null);
      set({ user: null, status: 'anonymous', error: null });
    }
  },

  login: async (credentials: LoginRequest, expectedRole?: string) => {
    set({ error: null });
    try {
      const tokenRes = await authService.login(credentials);
      get().setAccessToken(tokenRes.accessToken);
      const user = await authService.getCurrentUser();

      // Role check against tab
      if (expectedRole) {
        const roleMap: Record<string, UserRole> = {
          'intern-seeker': 'student',
          company: 'company',
          qcpeso: 'peso_personnel',
          admin: 'admin',
        };
        const mappedExpected = roleMap[expectedRole] || expectedRole;
        if (user.userRole !== mappedExpected) {
          await authService.logout().catch(() => {});
          get().setAccessToken(null);
          set({
            user: null,
            status: 'anonymous',
            error: `Your account role is '${user.userRole}', but you attempted to login under '${expectedRole}'. Please select the correct tab.`,
          });
          throw new Error('Role mismatch');
        }
      }

      set({ user, status: 'authenticated', error: null });
      return user.userRole;
    } catch (err: any) {
      const norm = normalizeApiError(err);
      const errMsg = norm.message || 'Login failed';
      set({ error: errMsg });
      throw err;
    }
  },

  registerStudent: async (payload: StudentRegisterRequest) => {
    set({ error: null });
    try {
      const tokenRes = await authService.registerStudent(payload);
      get().setAccessToken(tokenRes.accessToken);
      const user = await authService.getCurrentUser();
      set({ user, status: 'authenticated', error: null });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message || 'Registration failed' });
      throw err;
    }
  },

  registerPeso: async (payload: PesoRegisterRequest) => {
    set({ error: null });
    try {
      const res = await authService.registerPeso(payload);
      get().setAccessToken(res.accessToken);
      const user = await authService.getCurrentUser();
      set({ user, status: 'authenticated', error: null });
      return res.verificationStatus;
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message || 'PESO registration failed' });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      get().setAccessToken(null);
      set({ user: null, status: 'anonymous', error: null });
    }
  },

  logoutAll: async () => {
    try {
      await authService.logoutAll();
    } catch {
      // Ignore network errors
    } finally {
      get().setAccessToken(null);
      set({ user: null, status: 'anonymous', error: null });
    }
  },
}));

// Configure API bridge
configureApiAuth({
  getAccessToken: () => useAuthStore.getState().accessToken,
  setAccessToken: (token) => useAuthStore.getState().setAccessToken(token),
  onUnauthorized: () => {
    useAuthStore.getState().setAccessToken(null);
    useAuthStore.setState({ user: null, status: 'anonymous' });
  },
});
