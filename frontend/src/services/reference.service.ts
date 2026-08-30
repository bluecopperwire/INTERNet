import { api } from './api';
import type { IndustryItemDto } from '../types/api';

export const referenceService = {
  async getIndustries(): Promise<IndustryItemDto[]> {
    const response = await api.get<IndustryItemDto[]>('/reference/industries');
    return response.data;
  },
};
