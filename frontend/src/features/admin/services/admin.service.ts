import { useAdminStore } from '../stores/useAdminStore';
import { adminApiService } from './admin-api.service';
import {
  adaptAdminStudentItem,
  adaptAdminEmployerItem,
  adaptAdminPesoItem,
} from '../adapters/admin.adapters';
import type {
  AdminRecord,
  StudentRecord,
  EmployerRecord,
  QCPesoRecord,
  AccountStatus,
  AuditLog,
  AdminDashboardSummary,
  AdminNotification,
} from '../types/admin.types';

export const adminService = {
  getStudentRecords: async (): Promise<StudentRecord[]> => {
    const store = useAdminStore.getState();
    await store.fetchStudents();
    return useAdminStore.getState().students;
  },

  getStudentRecord: async (id: string): Promise<StudentRecord | null> => {
    const raw = await adminApiService.getStudent(Number(id));
    return adaptAdminStudentItem(raw);
  },

  updateStudentRecord: async (id: string, updates: Partial<StudentRecord>): Promise<StudentRecord | null> => {
    const raw = await adminApiService.updateStudent(Number(id), updates);
    return adaptAdminStudentItem(raw);
  },

  getEmployerRecords: async (): Promise<EmployerRecord[]> => {
    const store = useAdminStore.getState();
    await store.fetchEmployers();
    return useAdminStore.getState().employers;
  },

  getEmployerRecord: async (id: string): Promise<EmployerRecord | null> => {
    const raw = await adminApiService.getEmployer(Number(id));
    return adaptAdminEmployerItem(raw);
  },

  updateEmployerRecord: async (id: string, updates: Partial<EmployerRecord>): Promise<EmployerRecord | null> => {
    const raw = await adminApiService.updateEmployer(Number(id), updates);
    return adaptAdminEmployerItem(raw);
  },

  createEmployerRecord: async (record: any): Promise<EmployerRecord> => {
    const raw = await adminApiService.createCompanyUser(record);
    return adaptAdminEmployerItem(raw);
  },

  getQCPesoRecords: async (): Promise<QCPesoRecord[]> => {
    const store = useAdminStore.getState();
    await store.fetchPesoUsers();
    return useAdminStore.getState().pesoUsers;
  },

  getQCPesoRecord: async (id: string): Promise<QCPesoRecord | null> => {
    const raw = await adminApiService.getPesoUser(Number(id));
    return adaptAdminPesoItem(raw);
  },

  updateQCPesoRecord: async (id: string, updates: Partial<QCPesoRecord>): Promise<QCPesoRecord | null> => {
    const raw = await adminApiService.updatePesoUser(Number(id), updates);
    return adaptAdminPesoItem(raw);
  },

  createQCPesoRecord: async (record: any): Promise<QCPesoRecord> => {
    const raw = await adminApiService.createPesoUser(record);
    return adaptAdminPesoItem(raw);
  },

  getDashboardSummary: async (): Promise<AdminDashboardSummary> => {
    const store = useAdminStore.getState();
    await store.fetchDashboard();
    return (
      store.summary || {
        totalStudents: 0,
        activeStudents: 0,
        totalEmployers: 0,
        totalAvailableOpportunities: 0,
        systemHealth: {
          serverStatus: 'Operational',
          uptime: '100%',
          databaseLoad: 'Normal',
          activeSessions: 0,
          lastBackup: 'N/A',
          storageUsedPercent: 0,
        },
      }
    );
  },

  getRecentAuditLogs: async (_limit: number = 4): Promise<AuditLog[]> => {
    return [];
  },

  getNotifications: async (): Promise<AdminNotification[]> => {
    return [];
  },

  markAllNotificationsAsRead: async (): Promise<void> => {
    return Promise.resolve();
  },

  getRecordById: async (id: string, role: string): Promise<AdminRecord> => {
    if (role === 'Student') {
      return (await adminService.getStudentRecord(id))!;
    }
    if (role === 'Employer') {
      return (await adminService.getEmployerRecord(id))!;
    }
    return (await adminService.getQCPesoRecord(id))!;
  },

  updateRecord: async (id: string, role: string, updates: Partial<AdminRecord>): Promise<AdminRecord> => {
    if (role === 'Student') {
      return (await adminService.updateStudentRecord(id, updates as Partial<StudentRecord>))!;
    }
    if (role === 'Employer') {
      return (await adminService.updateEmployerRecord(id, updates as Partial<EmployerRecord>))!;
    }
    return (await adminService.updateQCPesoRecord(id, updates as Partial<QCPesoRecord>))!;
  },

  toggleRecordStatus: async (userAccountId: string, role: string, newStatus: AccountStatus): Promise<boolean> => {
    const statusMap: Record<string, string> = {
      Active: 'active',
      Suspended: 'suspended',
      Deactivated: 'archived',
    };
    const mapped = statusMap[newStatus] || 'active';
    const store = useAdminStore.getState();

    if (role === 'Student') {
      await store.setStudentAccountStatus(Number(userAccountId), mapped);
    } else if (role === 'Employer') {
      await store.setEmployerAccountStatus(Number(userAccountId), mapped);
    } else {
      await store.setPesoAccountStatus(Number(userAccountId), mapped);
    }
    return true;
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    return [];
  },

  triggerManualBackup: async (): Promise<{ success: boolean; message: string }> => {
    return { success: false, message: 'Database backup is not configured on this server.' };
  },
};

export default adminService;
