import { useStudentTrackingStore } from '../stores/useStudentTrackingStore';
import type { UserApplication } from '../types/application.types';

export const applicationsService = {
  async getMyApplications(): Promise<UserApplication[]> {
    const store = useStudentTrackingStore.getState();
    await store.fetchApplications();
    return useStudentTrackingStore.getState().applications;
  },

  async getApplication(applicationId: string): Promise<UserApplication | null> {
    const store = useStudentTrackingStore.getState();
    const app = await store.fetchApplicationStatus(Number(applicationId));
    return app;
  },

  async withdrawApplication(applicationId: string): Promise<UserApplication> {
    const store = useStudentTrackingStore.getState();
    await store.withdrawApplication(Number(applicationId));
    return useStudentTrackingStore.getState().selectedApplication!;
  },

  async respondToOffer(
    applicationId: string,
    decision: 'accept' | 'reject',
  ): Promise<UserApplication> {
    const store = useStudentTrackingStore.getState();
    const choice = decision === 'accept' ? 'accepted' : 'declined';
    await store.submitOfferResponse(Number(applicationId), choice);
    return useStudentTrackingStore.getState().selectedApplication!;
  },

  async deleteApplication(applicationId: string): Promise<void> {
    await useStudentTrackingStore.getState().hideApplication(Number(applicationId));
  },
};
