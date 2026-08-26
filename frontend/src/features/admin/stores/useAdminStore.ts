import { create } from 'zustand';
import { adminApiService } from '../services/admin-api.service';
import {
  adaptAdminDashboardSummary,
  adaptAdminStudentItem,
  adaptAdminEmployerItem,
  adaptAdminPesoItem,
} from '../adapters/admin.adapters';
import type {
  StudentRecord,
  EmployerRecord,
  QCPesoRecord,
  AdminDashboardSummary,
} from '../types/admin.types';
import { normalizeApiError } from '../../../services/api';

interface AdminState {
  summary: AdminDashboardSummary | null;
  students: StudentRecord[];
  employers: EmployerRecord[];
  pesoUsers: QCPesoRecord[];

  totalStudents: number;
  totalEmployers: number;
  totalPesoUsers: number;

  isLoadingSummary: boolean;
  isLoadingStudents: boolean;
  isLoadingEmployers: boolean;
  isLoadingPeso: boolean;

  error: string | null;

  fetchDashboard: () => Promise<void>;
  fetchStudents: (params?: any) => Promise<void>;
  fetchEmployers: (params?: any) => Promise<void>;
  fetchPesoUsers: (params?: any) => Promise<void>;
  setStudentAccountStatus: (userAccountId: number, status: string) => Promise<void>;
  setEmployerAccountStatus: (userAccountId: number, status: string) => Promise<void>;
  setPesoAccountStatus: (userAccountId: number, status: string) => Promise<void>;
  createPesoPersonnel: (payload: any) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  summary: null,
  students: [],
  employers: [],
  pesoUsers: [],

  totalStudents: 0,
  totalEmployers: 0,
  totalPesoUsers: 0,

  isLoadingSummary: false,
  isLoadingStudents: false,
  isLoadingEmployers: false,
  isLoadingPeso: false,

  error: null,

  fetchDashboard: async () => {
    set({ isLoadingSummary: true, error: null });
    try {
      const [sm, em, pm] = await Promise.all([
        adminApiService.getStudentMetrics(),
        adminApiService.getEmployerMetrics(),
        adminApiService.getPesoMetrics(),
      ]);
      set({
        summary: adaptAdminDashboardSummary(sm, em, pm),
        isLoadingSummary: false,
      });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingSummary: false });
    }
  },

  fetchStudents: async (params?: any) => {
    set({ isLoadingStudents: true, error: null });
    try {
      const res = await adminApiService.getStudents(params);
      set({
        students: res.data.map(adaptAdminStudentItem),
        totalStudents: res.meta.total,
        isLoadingStudents: false,
      });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingStudents: false });
    }
  },

  fetchEmployers: async (params?: any) => {
    set({ isLoadingEmployers: true, error: null });
    try {
      const res = await adminApiService.getEmployers(params);
      set({
        employers: res.data.map(adaptAdminEmployerItem),
        totalEmployers: res.meta.total,
        isLoadingEmployers: false,
      });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingEmployers: false });
    }
  },

  fetchPesoUsers: async (params?: any) => {
    set({ isLoadingPeso: true, error: null });
    try {
      const res = await adminApiService.getPesoPersonnel(params);
      set({
        pesoUsers: res.data.map(adaptAdminPesoItem),
        totalPesoUsers: res.meta.total,
        isLoadingPeso: false,
      });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingPeso: false });
    }
  },

  setStudentAccountStatus: async (userAccountId: number, status: string) => {
    try {
      await adminApiService.setStudentStatus(userAccountId, status);
      await get().fetchStudents();
    } catch (err: any) {
      const norm = normalizeApiError(err);
      throw norm;
    }
  },

  setEmployerAccountStatus: async (userAccountId: number, status: string) => {
    try {
      await adminApiService.setEmployerStatus(userAccountId, status);
      await get().fetchEmployers();
    } catch (err: any) {
      const norm = normalizeApiError(err);
      throw norm;
    }
  },

  setPesoAccountStatus: async (userAccountId: number, status: string) => {
    try {
      await adminApiService.setPesoStatus(userAccountId, status);
      await get().fetchPesoUsers();
    } catch (err: any) {
      const norm = normalizeApiError(err);
      throw norm;
    }
  },

  createPesoPersonnel: async (payload: any) => {
    try {
      await adminApiService.createPesoUser(payload);
      await get().fetchPesoUsers();
    } catch (err: any) {
      const norm = normalizeApiError(err);
      throw norm;
    }
  },
}));
