import { create } from 'zustand';
import { employerApiService } from '../services/employer-api.service';
import {
  adaptEmployerDashboardSummary,
  adaptEmployerOpportunity,
  adaptEmployerReferral,
  adaptEmployerAttendance,
  adaptEmployerInternship,
  adaptCompanyProfile,
} from '../adapters/employer.adapters';
import type {
  EmployerDashboardSummary,
  Opportunity,
  Applicant,
  CompanyProfile,
  EmployerAttendanceRecord,
  EmployerInternshipDetails,
} from '../types/employer.types';
import { normalizeApiError } from '../../../services/api';

interface EmployerState {
  summary: EmployerDashboardSummary | null;
  profile: CompanyProfile | null;
  opportunities: Opportunity[];
  referrals: Applicant[];
  internships: EmployerInternshipDetails[];
  attendanceRecords: EmployerAttendanceRecord[];

  totalOpportunities: number;
  totalReferrals: number;
  totalInternships: number;
  totalAttendance: number;

  isLoadingSummary: boolean;
  isLoadingProfile: boolean;
  isLoadingOpportunities: boolean;
  isLoadingReferrals: boolean;
  isLoadingInternships: boolean;
  isLoadingAttendance: boolean;

  error: string | null;

  fetchDashboard: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (payload: any) => Promise<void>;
  uploadLogo: (file: File) => Promise<void>;
  fetchOpportunities: (params?: any) => Promise<void>;
  createOpportunity: (payload: any) => Promise<Opportunity>;
  updateOpportunity: (id: number, payload: any) => Promise<Opportunity>;
  closeOpportunity: (id: number) => Promise<void>;
  reopenOpportunity: (id: number) => Promise<void>;
  archiveOpportunity: (id: number) => Promise<void>;
  fetchReferrals: (params?: any) => Promise<void>;
  acceptReferral: (id: number, remark?: string) => Promise<void>;
  rejectReferral: (id: number, remark?: string) => Promise<void>;
  scheduleInterview: (id: number, payload: any) => Promise<void>;
  fetchInternships: (params?: any) => Promise<void>;
  deleteInternship: (id: number) => Promise<void>;
  fetchAttendance: (params?: any) => Promise<void>;
}

export const useEmployerStore = create<EmployerState>((set, get) => ({
  summary: null,
  profile: null,
  opportunities: [],
  referrals: [],
  internships: [],
  attendanceRecords: [],

  totalOpportunities: 0,
  totalReferrals: 0,
  totalInternships: 0,
  totalAttendance: 0,

  isLoadingSummary: false,
  isLoadingProfile: false,
  isLoadingOpportunities: false,
  isLoadingReferrals: false,
  isLoadingInternships: false,
  isLoadingAttendance: false,

  error: null,

  fetchDashboard: async () => {
    set({ isLoadingSummary: true, error: null });
    try {
      const [m, p] = await Promise.all([
        employerApiService.getMetrics(),
        employerApiService.getProfile().catch(() => null),
      ]);
      const companyName = p?.companyName || 'Partner Company';
      set({
        summary: adaptEmployerDashboardSummary(m, companyName),
        profile: p ? adaptCompanyProfile(p) : get().profile,
        isLoadingSummary: false,
      });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingSummary: false });
    }
  },

  fetchProfile: async () => {
    set({ isLoadingProfile: true, error: null });
    try {
      const raw = await employerApiService.getProfile();
      set({ profile: adaptCompanyProfile(raw), isLoadingProfile: false });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingProfile: false });
    }
  },

  updateProfile: async (payload: any) => {
    set({ isLoadingProfile: true, error: null });
    try {
      const raw = await employerApiService.updateProfile(payload);
      set({ profile: adaptCompanyProfile(raw), isLoadingProfile: false });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingProfile: false });
      throw err;
    }
  },

  uploadLogo: async (file: File) => {
    set({ isLoadingProfile: true, error: null });
    try {
      await employerApiService.uploadLogo(file);
      await get().fetchProfile();
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingProfile: false });
      throw new Error(norm.message);
    }
  },

  fetchOpportunities: async (params?: any) => {
    set({ isLoadingOpportunities: true, error: null });
    try {
      const res = await employerApiService.getOpportunities(params);
      set({
        opportunities: res.data.map(adaptEmployerOpportunity),
        totalOpportunities: res.meta.total,
        isLoadingOpportunities: false,
      });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingOpportunities: false });
    }
  },

  createOpportunity: async (payload: any) => {
    try {
      const created = await employerApiService.createOpportunity(payload);
      await get().fetchOpportunities();
      return adaptEmployerOpportunity(created);
    } catch (err: any) {
      const norm = normalizeApiError(err);
      throw norm;
    }
  },

  updateOpportunity: async (id: number, payload: any) => {
    try {
      const updated = await employerApiService.updateOpportunity(id, payload);
      await get().fetchOpportunities();
      return adaptEmployerOpportunity(updated);
    } catch (err: any) {
      const norm = normalizeApiError(err);
      throw norm;
    }
  },

  closeOpportunity: async (id: number) => {
    try {
      await employerApiService.closeOpportunity(id);
      await get().fetchOpportunities();
    } catch (err: any) {
      const norm = normalizeApiError(err);
      throw norm;
    }
  },

  reopenOpportunity: async (id: number) => {
    try {
      await employerApiService.reopenOpportunity(id);
      await get().fetchOpportunities();
    } catch (err: any) {
      const norm = normalizeApiError(err);
      throw norm;
    }
  },

  archiveOpportunity: async (id: number) => {
    try {
      await employerApiService.archiveOpportunity(id);
      await get().fetchOpportunities();
    } catch (err: any) {
      const norm = normalizeApiError(err);
      throw norm;
    }
  },

  fetchReferrals: async (params?: any) => {
    set({ isLoadingReferrals: true, error: null });
    try {
      const res = await employerApiService.getReferrals(params);
      set({
        referrals: res.data.map(adaptEmployerReferral),
        totalReferrals: res.meta.total,
        isLoadingReferrals: false,
      });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingReferrals: false });
    }
  },

  acceptReferral: async (id: number, remark?: string) => {
    try {
      await employerApiService.acceptReferral(id, remark);
      await get().fetchReferrals();
    } catch (err: any) {
      const norm = normalizeApiError(err);
      throw norm;
    }
  },

  rejectReferral: async (id: number, remark?: string) => {
    try {
      await employerApiService.rejectReferral(id, remark);
      await get().fetchReferrals();
    } catch (err: any) {
      const norm = normalizeApiError(err);
      throw norm;
    }
  },

  scheduleInterview: async (id: number, payload: any) => {
    try {
      await employerApiService.scheduleInterview(id, payload);
      await get().fetchReferrals();
    } catch (err: any) {
      const norm = normalizeApiError(err);
      throw norm;
    }
  },

  fetchInternships: async (params?: any) => {
    set({ isLoadingInternships: true, error: null });
    try {
      const res = await employerApiService.getInternships(params);
      set({
        internships: res.data.map(adaptEmployerInternship),
        totalInternships: res.meta.total,
        isLoadingInternships: false,
      });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingInternships: false });
    }
  },

  deleteInternship: async (id: number) => {
    try {
      await employerApiService.deleteInternship(id);
      await get().fetchInternships();
    } catch (err: any) {
      const norm = normalizeApiError(err);
      throw norm;
    }
  },

  fetchAttendance: async (params?: any) => {
    set({ isLoadingAttendance: true, error: null });
    try {
      const res = await employerApiService.getAttendance(params);
      set({
        attendanceRecords: res.data.map(adaptEmployerAttendance),
        totalAttendance: res.meta.total,
        isLoadingAttendance: false,
      });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingAttendance: false });
    }
  },
}));
