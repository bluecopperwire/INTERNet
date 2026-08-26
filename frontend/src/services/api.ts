import axios from 'axios';
import type {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import type { ApiError } from '../types/api';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

export interface ApiAuthConfig {
  getAccessToken: () => string | null;
  setAccessToken: (token: string | null) => void;
  onUnauthorized: (reason?: string) => void;
}

let authConfig: ApiAuthConfig = {
  getAccessToken: () => null,
  setAccessToken: () => {},
  onUnauthorized: () => {},
};

export function configureApiAuth(config: Partial<ApiAuthConfig>) {
  authConfig = { ...authConfig, ...config };
}

export function normalizeApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status || 0;
    const data = error.response?.data as any;

    let message = error.message || 'An unexpected network error occurred';
    let validationMessages: string[] = [];
    let code: string | undefined = undefined;
    let dependency: string | undefined = undefined;

    if (data) {
      if (typeof data.message === 'string') {
        message = data.message;
      } else if (Array.isArray(data.message)) {
        validationMessages = data.message;
        message = validationMessages[0] || 'Validation error';
      }
      code = data.code;
      dependency = data.dependency;
    }

    const retryable = status === 0 || status >= 500 || status === 429;

    return {
      statusCode: status,
      message,
      validationMessages,
      code,
      dependency,
      retryable,
    };
  }

  if (error instanceof Error) {
    return {
      statusCode: 0,
      message: error.message,
      validationMessages: [],
      retryable: true,
    };
  }

  return {
    statusCode: 0,
    message: 'Unknown error',
    validationMessages: [],
    retryable: true,
  };
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authConfig.getAccessToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshSubscribers: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

function subscribeTokenRefresh(
  resolve: (token: string) => void,
  reject: (err: any) => void,
) {
  refreshSubscribers.push({ resolve, reject });
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((sub) => sub.resolve(token));
  refreshSubscribers = [];
}

function onRefreshFailed(err: any) {
  refreshSubscribers.forEach((sub) => sub.reject(err));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const url = originalRequest.url || '';

    const isAuthRoute =
      url.includes('/auth/login') ||
      url.includes('/auth/signup') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/google/exchange');

    if (status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(
            (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            (err: any) => {
              reject(err);
            },
          );
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post<{ accessToken: string }>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const newAccessToken = response.data.accessToken;
        authConfig.setAccessToken(newAccessToken);
        onRefreshed(newAccessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        isRefreshing = false;
        onRefreshFailed(refreshErr);
        authConfig.setAccessToken(null);
        authConfig.onUnauthorized('session-expired');
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  },
);
