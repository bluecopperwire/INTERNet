import { create } from 'zustand';
import { studentApiService } from '../services/student-api.service';
import type { OpportunityFilters } from '../services/student-api.service';
import {
  adaptOpportunity,
  adaptStudentProfile,
  adaptStudentProfileToUpdateDto,
} from '../adapters/student.adapters';
import type {
  InternshipOpportunity,
  UserProfile,
  PartnerCompany,
} from '../types/internship.types';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useReferenceStore } from '../../../stores/useReferenceStore';
import { normalizeApiError } from '../../../services/api';

interface StudentState {
  profile: UserProfile | null;
  opportunities: InternshipOpportunity[];
  companies: PartnerCompany[];
  selectedOpportunity: InternshipOpportunity | null;
  totalOpportunities: number;
  totalPages: number;
  currentPage: number;
  isLoading: boolean;
  isProfileLoading: boolean;
  error: string | null;

  fetchProfile: () => Promise<UserProfile | null>;
  saveProfile: (payload: any) => Promise<void>;
  uploadProfilePicture: (file: File) => Promise<UserProfile>;
  fetchOpportunities: (
    filters?: OpportunityFilters,
    signal?: AbortSignal,
  ) => Promise<void>;
  fetchOpportunityById: (id: number) => Promise<InternshipOpportunity | null>;
  submitApplication: (opportunityId: number, remark?: string) => Promise<void>;
}

export const useStudentStore = create<StudentState>((set) => ({
  profile: null,
  opportunities: [],
  companies: [],
  selectedOpportunity: null,
  totalOpportunities: 0,
  totalPages: 1,
  currentPage: 1,
  isLoading: false,
  isProfileLoading: false,
  error: null,

  fetchProfile: async () => {
    const studentId = useAuthStore.getState().user?.studentId;
    if (!studentId) return null;

    set({ isProfileLoading: true, error: null });
    try {
      const data = await studentApiService.getProfile(studentId);
      const adapted = adaptStudentProfile(data);
      set({ profile: adapted, isProfileLoading: false });
      return adapted;
    } catch (err: unknown) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isProfileLoading: false });
      return null;
    }
  },

  saveProfile: async (payload: any) => {
    const studentId = useAuthStore.getState().user?.studentId;
    if (!studentId) throw new Error('Student ID not found');

    set({ isProfileLoading: true, error: null });
    try {
      const industries = await useReferenceStore.getState().fetchIndustries();
      const dto = adaptStudentProfileToUpdateDto(payload, industries);
      const data = await studentApiService.saveProfile(studentId, dto);
      const adapted = adaptStudentProfile(data);
      set({ profile: adapted, isProfileLoading: false });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isProfileLoading: false });
      throw err;
    }
  },

  uploadProfilePicture: async (file: File) => {
    const studentId = useAuthStore.getState().user?.studentId;
    if (!studentId) throw new Error('Student ID not found');

    set({ isProfileLoading: true, error: null });
    try {
      const data = await studentApiService.uploadProfilePicture(
        studentId,
        file,
      );
      const adapted = adaptStudentProfile(data);
      set({ profile: adapted, isProfileLoading: false });
      return adapted;
    } catch (err: unknown) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isProfileLoading: false });
      throw new Error(norm.message);
    }
  },

  fetchOpportunities: async (
    filters?: OpportunityFilters,
    signal?: AbortSignal,
  ) => {
    set({ isLoading: true, error: null });
    try {
      const res = await studentApiService.getOpportunities(filters, signal);
      const adapted = res.data.map(adaptOpportunity);

      // Extract unique companies for catalog
      const companyMap = new Map<string, PartnerCompany>();
      adapted.forEach((opp) => {
        if (!companyMap.has(opp.companyId)) {
          companyMap.set(opp.companyId, {
            id: opp.companyId,
            name: opp.companyName,
            summary: `${opp.tags[0] || 'Company'} in ${opp.location}`,
            description: opp.details.description || '',
            tags: opp.tags,
            logoUrl: opp.companyLogoUrl,
          });
        }
      });

      set({
        opportunities: adapted,
        companies: Array.from(companyMap.values()),
        totalOpportunities: res.meta.total,
        totalPages: res.meta.totalPages,
        currentPage: res.meta.page,
        isLoading: false,
      });
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoading: false });
    }
  },

  fetchOpportunityById: async (id: number) => {
    try {
      const opp = await studentApiService.getOpportunity(id);
      const adapted = adaptOpportunity(opp);
      set({ selectedOpportunity: adapted });
      return adapted;
    } catch {
      return null;
    }
  },

  submitApplication: async (opportunityId: number, remark?: string) => {
    const studentId = useAuthStore.getState().user?.studentId;
    if (!studentId) throw new Error('Student ID not found');

    try {
      await studentApiService.submitApplication(
        studentId,
        opportunityId,
        remark,
      );
      // Mark card as applied locally
      set((state) => ({
        opportunities: state.opportunities.map((opp) =>
          opp.id === String(opportunityId) ? { ...opp, isApplied: true } : opp,
        ),
        selectedOpportunity:
          state.selectedOpportunity?.id === String(opportunityId)
            ? { ...state.selectedOpportunity, isApplied: true }
            : state.selectedOpportunity,
      }));
    } catch (err: any) {
      const norm = normalizeApiError(err);
      throw norm;
    }
  },
}));
