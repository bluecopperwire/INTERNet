import { useStudentTrackingStore } from '../stores/useStudentTrackingStore';
import type {
  AttendanceMonth,
  InternshipDetails,
  TodayAttendance,
} from '../types/attendance.types';

export const attendanceService = {
  async getToday(): Promise<TodayAttendance> {
    const store = useStudentTrackingStore.getState();
    await store.fetchAttendance();
    const today = useStudentTrackingStore.getState().todayAttendance;
    if (!today) {
      return {
        date: new Date().toISOString().split('T')[0],
        status: 'not-checked-in',
        companyName: 'Not Assigned',
        workingDays: 'N/A',
        shiftStart: '08:00',
        shiftEnd: '17:00',
      };
    }
    return today;
  },

  async getInternshipDetails(): Promise<InternshipDetails> {
    const store = useStudentTrackingStore.getState();
    await store.fetchAttendance();
    const details = useStudentTrackingStore.getState().internshipDetails;
    if (!details) {
      return {
        companyName: 'Not Assigned',
        jobTitle: 'Intern',
        workingDays: 'weekdays',
        requiredHours: 0,
        startDate: 'N/A',
        expectedEndDate: 'N/A',
        shiftStart: '08:00',
        shiftEnd: '17:00',
        status: 'Pending',
        targetHours: 0,
        renderedHours: 0,
        remainingHours: 0,
      };
    }
    return details;
  },

  async getMonth(year: number, month: number): Promise<AttendanceMonth> {
    const store = useStudentTrackingStore.getState();
    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    await store.fetchAttendance({ startDate: startStr, endDate: endStr });
    const records = useStudentTrackingStore.getState().attendanceRecords;
    const summary = useStudentTrackingStore.getState().attendanceSummary || {
      daysPresent: 0,
      absences: 0,
      lateArrivals: 0,
      attendanceRate: 100,
    };

    return {
      year,
      month,
      records,
      summary,
    };
  },

  async checkIn(): Promise<TodayAttendance> {
    const store = useStudentTrackingStore.getState();
    await store.clockIn();
    return (await this.getToday());
  },

  async checkOut(): Promise<TodayAttendance> {
    const store = useStudentTrackingStore.getState();
    await store.clockOut();
    return (await this.getToday());
  },
};
