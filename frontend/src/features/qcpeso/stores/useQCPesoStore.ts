import { create } from 'zustand';
import { qcpesoApiService } from '../services/qcpeso-api.service';
import {
  adaptPesoDashboardMetrics,
  adaptPesoApplication,
  adaptPesoReferral,
  adaptPesoIntern,
  adaptPesoDtr,
  adaptPesoProfile,
  adaptMonitoredStudent,
  adaptMonitoredCompany,
} from '../adapters/qcpeso.adapters';
import type {
  QCPesoDashboardSummary,
  QCPesoReviewApplicant,
  QCPesoReferral,
  QCPesoInternshipRecord,
  QCPesoAttendanceRecord,
  QCPesoProfile,
  MonitoredStudentUser,
  MonitoredCompanyUser,
} from '../types/qcpeso.types';
import { normalizeApiError } from '../../../services/api';

interface QCPesoState {
  metrics: QCPesoDashboardSummary | null;
  applications: QCPesoReviewApplicant[];
  referrals: QCPesoReferral[];
  interns: QCPesoInternshipRecord[];
  attendanceRecords: QCPesoAttendanceRecord[];
  students: MonitoredStudentUser[];
  companies: MonitoredCompanyUser[];
  profile: QCPesoProfile | null;

  totalApplications: number;
  totalReferrals: number;
  totalInterns: number;
  totalAttendance: number;
  totalStudents: number;
  totalCompanies: number;

  isLoadingMetrics: boolean;
  isLoadingApplications: boolean;
  isLoadingReferrals: boolean;
  isLoadingInterns: boolean;
  isLoadingAttendance: boolean;
  isLoadingUsers: boolean;
  isLoadingProfile: boolean;

  error: string | null;

  fetchMetrics: () => Promise<void>;
  fetchApplications: (params?: any) => Promise<void>;
  fetchReferrals: (params?: any) => Promise<void>;
  fetchInterns: (params?: any) => Promise<void>;
  fetchAttendance: (params?: any) => Promise<void>;
  fetchStudents: (params?: any) => Promise<void>;
  fetchCompanies: (params?: any) => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (payload: any) => Promise<void>;
  updateApplicationStatus: (
    applicationId: number,
    status: 'approved_for_referral' | 'rejected_for_referral',
    remark?: string,
  ) => Promise<QCPesoReviewApplicant>;
}

export const useQCPesoStore = create<QCPesoState>((set) => ({
  metrics: null,
  applications: [],
  referrals: [],
  interns: [],
  attendanceRecords: [],
  students: [],
  companies: [],
  profile: null,

  totalApplications: 0,
  totalReferrals: 0,
  totalInterns: 0,
  totalAttendance: 0,
  totalStudents: 0,
  totalCompanies: 0,

  isLoadingMetrics: false,
  isLoadingApplications: false,
  isLoadingReferrals: false,
  isLoadingInterns: false,
  isLoadingAttendance: false,
  isLoadingUsers: false,
  isLoadingProfile: false,

  error: null,

  fetchMetrics: async () => {
    set({ isLoadingMetrics: true, error: null });
    try {
      const data = await qcpesoApiService.getDashboardMetrics();
      set({ metrics: adaptPesoDashboardMetrics(data), isLoadingMetrics: false });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingMetrics: false });
    }
  },

  fetchApplications: async (params?: any) => {
    set({ isLoadingApplications: true, error: null });
    try {
      const res = await qcpesoApiService.getApplications(params);
      const adapted = res.data.map(adaptPesoApplication);
      set({
        applications: adapted,
        totalApplications: res.meta.total,
        isLoadingApplications: false,
      });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingApplications: false });
    }
  },

  fetchReferrals: async (params?: any) => {
    set({ isLoadingReferrals: true, error: null });
    try {
      const res = await qcpesoApiService.getReferrals(params);
      const adapted = res.data.map(adaptPesoReferral);
      set({
        referrals: adapted,
        totalReferrals: res.meta.total,
        isLoadingReferrals: false,
      });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingReferrals: false });
    }
  },

  fetchInterns: async (params?: any) => {
    set({ isLoadingInterns: true, error: null });
    try {
      const res = await qcpesoApiService.getInterns(params);
      const adapted = res.data.map(adaptPesoIntern);
      set({
        interns: adapted,
        totalInterns: res.meta.total,
        isLoadingInterns: false,
      });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingInterns: false });
    }
  },

  fetchAttendance: async (params?: any) => {
    set({ isLoadingAttendance: true, error: null });
    try {
      const res = await qcpesoApiService.getAttendance(params);
      const adapted = res.data.map(adaptPesoDtr);
      set({
        attendanceRecords: adapted,
        totalAttendance: res.meta.total,
        isLoadingAttendance: false,
      });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingAttendance: false });
    }
  },

  fetchStudents: async (params?: any) => {
    set({ isLoadingUsers: true, error: null });
    try {
      const res = await qcpesoApiService.getStudents(params);
      const adapted = res.data.map(adaptMonitoredStudent);
      set({
        students: adapted,
        totalStudents: res.meta.total,
        isLoadingUsers: false,
      });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingUsers: false });
    }
  },

  fetchCompanies: async (params?: any) => {
    set({ isLoadingUsers: true, error: null });
    try {
      const res = await qcpesoApiService.getEmployers(params);
      const adapted = res.data.map(adaptMonitoredCompany);
      set({
        companies: adapted,
        totalCompanies: res.meta.total,
        isLoadingUsers: false,
      });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingUsers: false });
    }
  },

  fetchProfile: async () => {
    set({ isLoadingProfile: true, error: null });
    try {
      const raw = await qcpesoApiService.getOwnProfile();
      set({ profile: adaptPesoProfile(raw), isLoadingProfile: false });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingProfile: false });
    }
  },

  updateProfile: async (payload: any) => {
    set({ isLoadingProfile: true, error: null });
    try {
      const raw = await qcpesoApiService.updateOwnProfile(payload);
      set({ profile: adaptPesoProfile(raw), isLoadingProfile: false });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoadingProfile: false });
      throw err;
    }
  },

  updateApplicationStatus: async (
    applicationId: number,
    status: 'approved_for_referral' | 'rejected_for_referral',
    remark?: string,
  ) => {
    try {
      const raw = await qcpesoApiService.updateApplicationStatus(
        applicationId,
        status,
        remark,
      );
      const adapted = adaptPesoApplication(raw);
      set((state) => ({
        applications: state.applications.map((app) =>
          app.id === String(applicationId) ? adapted : app,
        ),
      }));
      return adapted;
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message });
      throw err;
    }
  },
}));
