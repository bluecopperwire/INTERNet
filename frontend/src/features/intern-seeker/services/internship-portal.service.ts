import { useStudentStore } from '../stores/useStudentStore';
import type {
  InternshipPortalData,
  OpportunitySearchParams,
  UserProfile,
  Resume,
  UserApplication,
} from '../types/internship.types';
import { useStudentTrackingStore } from '../stores/useStudentTrackingStore';

export const internshipPortalService = {
  async getPortalData(): Promise<InternshipPortalData> {
    const store = useStudentStore.getState();
    await store.fetchOpportunities();
    return {
      opportunities: useStudentStore.getState().opportunities,
      companies: useStudentStore.getState().companies,
    };
  },

  async searchOpportunities(params: OpportunitySearchParams): Promise<InternshipPortalData> {
    const store = useStudentStore.getState();
    await store.fetchOpportunities({
      search: params.query,
      companyId: params.companyId ? Number(params.companyId) : undefined,
    });
    return {
      opportunities: useStudentStore.getState().opportunities,
      companies: useStudentStore.getState().companies,
    };
  },

  async getUserProfile(): Promise<UserProfile> {
    const store = useStudentStore.getState();
    const profile = await store.fetchProfile();
    if (!profile) throw new Error('Failed to load profile');
    return profile;
  },

  async updateUserProfile(profileUpdates: any): Promise<UserProfile> {
    const store = useStudentStore.getState();
    await store.saveProfile(profileUpdates);
    return useStudentStore.getState().profile!;
  },

  async getUserResumes(): Promise<Resume[]> {
    const trackingStore = useStudentTrackingStore.getState();
    await trackingStore.fetchRequirements();
    const reqs = useStudentTrackingStore.getState().requirements;
    const resumeReq = reqs.find((r) => r.id === 'curriculum_vitae_resume' && r.document);

    if (resumeReq && resumeReq.document) {
      return [
        {
          id: 'curriculum_vitae_resume',
          fileName: resumeReq.document.fileName,
          dateAdded: resumeReq.document.uploadedAt,
          url: resumeReq.document.previewUrl || '',
        },
      ];
    }
    return [];
  },

  async getUserApplications(): Promise<UserApplication[]> {
    const trackingStore = useStudentTrackingStore.getState();
    await trackingStore.fetchApplications();
    return useStudentTrackingStore.getState().applications;
  },
};
