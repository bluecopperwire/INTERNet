import { api } from './api';
import type {
  AuthTokenResponse,
  CurrentUserResponse,
  MessageResponse,
} from '../types/api';
import type {
  LoginRequest,
  StudentRegisterRequest,
  PesoRegisterRequest,
  GoogleStudentCompletionRequest,
  ChangePasswordRequest,
} from '../features/authentication/types/auth.types';

export const authService = {
  async login(payload: LoginRequest): Promise<AuthTokenResponse> {
    const response = await api.post<AuthTokenResponse>('/auth/login', {
      email: payload.email,
      password: payload.password,
    });
    return response.data;
  },

  async registerStudent(
    payload: StudentRegisterRequest,
  ): Promise<AuthTokenResponse> {
    const response = await api.post<AuthTokenResponse>('/auth/signup', payload);
    return response.data;
  },

  async registerPeso(
    payload: PesoRegisterRequest,
  ): Promise<{ accessToken: string; verificationStatus: string }> {
    const response = await api.post<{
      accessToken: string;
      verificationStatus: string;
    }>('/auth/register/peso', payload);
    return response.data;
  },

  async getCurrentUser(): Promise<CurrentUserResponse> {
    const response = await api.get<CurrentUserResponse>('/auth/me');
    return response.data;
  },

  async refreshTokens(): Promise<AuthTokenResponse> {
    const response = await api.post<AuthTokenResponse>('/auth/refresh');
    return response.data;
  },

  async logout(): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/auth/logout');
    return response.data;
  },

  async logoutAll(): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/auth/logout-all');
    return response.data;
  },

  async changePassword(
    payload: ChangePasswordRequest,
  ): Promise<MessageResponse> {
    const response = await api.patch<MessageResponse>(
      '/auth/password',
      payload,
    );
    return response.data;
  },

  async exchangeGoogleLogin(): Promise<AuthTokenResponse> {
    const response = await api.post<AuthTokenResponse>('/auth/google/exchange');
    return response.data;
  },

  async completeGoogleSignup(
    payload: GoogleStudentCompletionRequest,
  ): Promise<AuthTokenResponse> {
    const response = await api.post<AuthTokenResponse>(
      '/auth/google/signup/complete',
      payload,
    );
    return response.data;
  },

  startGoogleLogin(): void {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    window.location.href = `${base.replace(/\/+$/, '')}/auth/google`;
  },

  startGoogleSignup(): void {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    window.location.href = `${base.replace(/\/+$/, '')}/auth/google/signup`;
  },
};
