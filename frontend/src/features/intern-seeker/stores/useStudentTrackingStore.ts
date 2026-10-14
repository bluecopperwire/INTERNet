import { create } from 'zustand';
import { studentApiService } from '../services/student-api.service';
import {
  adaptApplication,
  adaptRequirements,
  adaptAttendance,
} from '../adapters/student.adapters';
import type { UserApplication } from '../types/application.types';
import type { InternshipRequirement } from '../types/requirement.types';
import type {
  InternshipDetails,
  TodayAttendance,
  AttendanceRecord,
  AttendanceSummary,
} from '../types/attendance.types';
import { useAuthStore } from '../../../stores/useAuthStore';
import { normalizeApiError } from '../../../services/api';

interface StudentTrackingState {
  applications: UserApplication[];
  selectedApplication: UserApplication | null;
  requirements: InternshipRequirement[];
  internshipDetails: InternshipDetails | null;
  todayAttendance: TodayAttendance | null;
  attendanceRecords: AttendanceRecord[];
  attendanceSummary: AttendanceSummary | null;
  isLoading: boolean;
  error: string | null;

  fetchApplications: () => Promise<void>;
  fetchApplicationStatus: (applicationId: number) => Promise<UserApplication | null>;
  submitOfferResponse: (applicationId: number, choice: 'accepted' | 'declined') => Promise<void>;
  withdrawApplication: (applicationId: number) => Promise<void>;
  hideApplication: (applicationId: number) => Promise<void>;
  hideAssignment: (assignmentId: number) => Promise<void>;

  fetchRequirements: () => Promise<void>;
  uploadRequirement: (file: File, type: string, name: string) => Promise<void>;
  deleteRequirement: (type: string) => Promise<void>;

  fetchAttendance: (params?: { startDate?: string; endDate?: string }) => Promise<void>;
  clockIn: () => Promise<void>;
  clockOut: () => Promise<void>;
}

export const useStudentTrackingStore = create<StudentTrackingState>((set, get) => ({
  applications: [],
  selectedApplication: null,
  requirements: [],
  internshipDetails: null,
  todayAttendance: null,
  attendanceRecords: [],
  attendanceSummary: null,
  isLoading: false,
  error: null,

  fetchApplications: async () => {
    const studentId = useAuthStore.getState().user?.studentId;
    if (!studentId) return;

    set({ isLoading: true, error: null });
    try {
      const dtos = await studentApiService.getApplications(studentId);
      const adapted = dtos.map((d) => adaptApplication(d));
      set((state) => ({
        applications: adapted,
        selectedApplication:
          state.selectedApplication && adapted.some((application) => application.id === state.selectedApplication?.id)
            ? state.selectedApplication
            : null,
        isLoading: false,
      }));
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoading: false });
    }
  },

  fetchApplicationStatus: async (applicationId: number) => {
    const studentId = useAuthStore.getState().user?.studentId;
    if (!studentId) return null;

    try {
      const statusDto = await studentApiService.getApplicationStatus(studentId, applicationId);
      // The detail response is self-contained. Depending on a previously hydrated
      // list entry made direct route loads and stale selections order-sensitive.
      const adapted = adaptApplication(statusDto, statusDto);

      set({ selectedApplication: adapted });
      return adapted;
    } catch (err: unknown) {
      set({ selectedApplication: null });
      throw normalizeApiError(err);
    }
  },

  submitOfferResponse: async (applicationId: number, choice: 'accepted' | 'declined') => {
    const studentId = useAuthStore.getState().user?.studentId;
    if (!studentId) throw new Error('Student ID not found');

    try {
      await studentApiService.respondToOffer(studentId, applicationId, choice);
      await get().fetchApplications();
      await get().fetchApplicationStatus(applicationId);
    } catch (err: any) {
      const norm = normalizeApiError(err);
      throw norm;
    }
  },

  withdrawApplication: async (applicationId: number) => {
    const studentId = useAuthStore.getState().user?.studentId;
    if (!studentId) throw new Error('Student ID not found');

    try {
      await studentApiService.withdrawApplication(studentId, applicationId);
      await get().fetchApplications();
      await get().fetchApplicationStatus(applicationId);
    } catch (err: any) {
      const norm = normalizeApiError(err);
      throw norm;
    }
  },

  hideApplication: async (applicationId: number) => {
    const studentId = useAuthStore.getState().user?.studentId;
    if (!studentId) throw new Error('Student ID not found');
    try {
      await studentApiService.hideApplication(studentId, applicationId);
      set((state) => ({
        applications: state.applications.filter(
          (application) => application.id !== String(applicationId),
        ),
        selectedApplication:
          state.selectedApplication?.id === String(applicationId)
            ? null
            : state.selectedApplication,
      }));
    } catch (err: unknown) {
      throw normalizeApiError(err);
    }
  },

  hideAssignment: async (assignmentId: number) => {
    const studentId = useAuthStore.getState().user?.studentId;
    if (!studentId) throw new Error('Student ID not found');
    try {
      await studentApiService.hideAssignment(studentId, assignmentId);
      set({ internshipDetails: null, todayAttendance: null, attendanceRecords: [] });
    } catch (err: unknown) {
      throw normalizeApiError(err);
    }
  },

  fetchRequirements: async () => {
    const studentId = useAuthStore.getState().user?.studentId;
    if (!studentId) return;

    set({ isLoading: true, error: null });
    try {
      const res = await studentApiService.getRequirements(studentId);
      const adapted = adaptRequirements(res);
      set({ requirements: adapted, isLoading: false });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoading: false });
    }
  },

  uploadRequirement: async (file: File, type: string, name: string) => {
    const studentId = useAuthStore.getState().user?.studentId;
    if (!studentId) throw new Error('Student ID not found');

    try {
      await studentApiService.uploadRequirement(studentId, file, type, name);
      await get().fetchRequirements();
    } catch (err: any) {
      const norm = normalizeApiError(err);
      throw norm;
    }
  },

  deleteRequirement: async (type: string) => {
    const studentId = useAuthStore.getState().user?.studentId;
    if (!studentId) throw new Error('Student ID not found');

    try {
      await studentApiService.deleteRequirement(studentId, type);
      await get().fetchRequirements();
    } catch (err: any) {
      const norm = normalizeApiError(err);
      throw norm;
    }
  },

  fetchAttendance: async (params?: { startDate?: string; endDate?: string }) => {
    const studentId = useAuthStore.getState().user?.studentId;
    if (!studentId) return;

    set({ isLoading: true, error: null });
    try {
      const res = await studentApiService.getAttendance(studentId, params);
      const adapted = adaptAttendance(res);
      set({
        internshipDetails: adapted.internshipDetails,
        todayAttendance: adapted.todayAttendance,
        attendanceRecords: adapted.records,
        attendanceSummary: adapted.summary,
        isLoading: false,
      });
    } catch (err: any) {
      const norm = normalizeApiError(err);
      set({ error: norm.message, isLoading: false });
    }
  },

  clockIn: async () => {
    const studentId = useAuthStore.getState().user?.studentId;
    if (!studentId) throw new Error('Student ID not found');

    // Fetch latest attendance to get assignment id if needed
    const attRes = await studentApiService.getAttendance(studentId);
    const assignmentId = attRes.assignment?.internshipAssignmentId;
    if (!assignmentId) throw new Error('No active internship assignment found');

    try {
      await studentApiService.clockIn(studentId, assignmentId);
      await get().fetchAttendance();
    } catch (err: any) {
      const norm = normalizeApiError(err);
      throw norm;
    }
  },

  clockOut: async () => {
    const studentId = useAuthStore.getState().user?.studentId;
    if (!studentId) throw new Error('Student ID not found');

    const attRes = await studentApiService.getAttendance(studentId);
    const assignmentId = attRes.assignment?.internshipAssignmentId;
    if (!assignmentId) throw new Error('No active internship assignment found');

    try {
      await studentApiService.clockOut(studentId, assignmentId);
      await get().fetchAttendance();
    } catch (err: any) {
      const norm = normalizeApiError(err);
      throw norm;
    }
  },
}));
