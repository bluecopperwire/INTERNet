import { create } from 'zustand';
import { referenceService } from '../services/reference.service';
import type { IndustryItemDto } from '../types/api';

interface ReferenceState {
  industries: IndustryItemDto[];
  isLoading: boolean;
  error: string | null;
  fetchIndustries: () => Promise<IndustryItemDto[]>;
}

export const useReferenceStore = create<ReferenceState>((set, get) => ({
  industries: [],
  isLoading: false,
  error: null,

  fetchIndustries: async () => {
    const current = get().industries;
    if (current.length > 0) return current;

    set({ isLoading: true, error: null });
    try {
      const data = await referenceService.getIndustries();
      set({ industries: data, isLoading: false });
      return data;
    } catch (err: any) {
      set({ error: err.message || 'Failed to load industries', isLoading: false });
      return [];
    }
  },
}));
