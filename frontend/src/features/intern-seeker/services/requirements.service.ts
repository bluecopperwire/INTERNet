import { useStudentTrackingStore } from '../stores/useStudentTrackingStore';
import type {
  InternshipRequirement,
  RequirementUploadInput,
} from '../types/requirement.types';

export const requirementsService = {
  async getRequirements(): Promise<InternshipRequirement[]> {
    const store = useStudentTrackingStore.getState();
    await store.fetchRequirements();
    return useStudentTrackingStore.getState().requirements;
  },

  async uploadRequirement(input: RequirementUploadInput): Promise<InternshipRequirement> {
    const store = useStudentTrackingStore.getState();
    await store.uploadRequirement(
      input.file,
      input.requirementId,
      input.file.name,
    );
    const updated = useStudentTrackingStore
      .getState()
      .requirements.find((r) => r.id === input.requirementId);
    if (!updated) throw new Error('Failed to update requirement');
    return updated;
  },

  async deleteRequirement(requirementId: string): Promise<InternshipRequirement> {
    const store = useStudentTrackingStore.getState();
    await store.deleteRequirement(requirementId);
    return useStudentTrackingStore
      .getState()
      .requirements.find((r) => r.id === requirementId)!;
  },
};
