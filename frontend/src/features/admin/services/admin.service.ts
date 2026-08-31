import { useAdminStore } from '../stores/useAdminStore';
import { adminApiService } from './admin-api.service';
import { referenceService } from '../../../services/reference.service';
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
    const current = await adminApiService.getStudent(Number(id));
    const payload: Record<string, unknown> = compact({
      firstName: updates.firstName,
      middleName: updates.middleName,
      lastName: updates.lastName,
      extensionName: updates.suffix,
      birthDate: updates.birthdate,
      sex: updates.sex,
      addressLine: updates.addressStreet,
      addressBarangay: updates.addressBarangay,
      addressDistrict: updates.addressDistrict,
      addressCity: updates.addressCity,
      contactNumber: updates.contactNumber,
      linkedinUrl: updates.linkedinUrl,
      schoolName: updates.schoolName,
      yearLevel: mapYearLevel(updates.yearLevel),
      strandProgram: updates.programStrand,
      requiredHours: updates.requiredHours ? Number(updates.requiredHours) : undefined,
      availableDays: updates.scheduleAvailability?.[0]?.toLowerCase(),
      startDate: updates.startDate,
      preferredCompanyType: updates.hostOrgType?.toLowerCase(),
      allowsOutsidePreferredField: updates.flexibleAssignment,
    });
    if (updates.preferredIndustries) {
      payload.preferredIndustries = await mapPreferredIndustries(
        updates.preferredIndustries,
        updates.otherPreferredField,
      );
    }
    if (Object.keys(payload).length) {
      await adminApiService.updateStudent(Number(id), payload);
    }
    await applyStatusChange(current, updates);
    return adaptAdminStudentItem(await adminApiService.getStudent(Number(id)));
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
    const current = await adminApiService.getEmployer(Number(id));
    const payload: Record<string, unknown> = compact({
      companyName: updates.companyName,
      companyType: updates.companyType?.toLowerCase(),
      companySize: updates.companySize ? Number(updates.companySize) : undefined,
      yearEstablished: updates.yearEstablished ? Number(updates.yearEstablished) : undefined,
      websiteUrl: updates.companyWebsite || undefined,
      description: updates.description,
      addressLine: updates.addressLine,
      addressBarangay: updates.addressBarangay,
      addressDistrict: updates.addressDistrict,
      addressCity: updates.addressCity,
      contactPersonFirstName: updates.contactFirstName,
      contactPersonMiddleName: updates.contactMiddleName,
      contactPersonLastName: updates.contactLastName,
      contactPersonExtensionName: updates.contactSuffix,
      contactEmail: updates.contactEmail,
      contactNumber: updates.contactNumber,
    });
    if (updates.industry && updates.industry !== 'N/A') {
      payload.industryId = await industryIdFor(updates.industry);
    }
    if (Object.keys(payload).length) {
      await adminApiService.updateEmployer(Number(id), payload);
    }
    await applyStatusChange(current, updates);
    return adaptAdminEmployerItem(await adminApiService.getEmployer(Number(id)));
  },

  createEmployerRecord: async (record: any): Promise<EmployerRecord> => {
    let websiteUrl = record.companyWebsite?.trim() || null;
    if (websiteUrl && !/^https?:\/\//i.test(websiteUrl)) {
      websiteUrl = `https://${websiteUrl}`;
    }

    const payload: Record<string, unknown> = {
      accountEmail: record.email,
      initialPassword: record.temporaryPassword,
      companyName: record.companyName,
      companyType: record.companyType.toLowerCase(),
      industryId: await industryIdFor(record.industry),
      websiteUrl,
      description: record.description,
      addressLine: record.addressLine,
      addressBarangay: record.addressBarangay,
      addressDistrict: record.addressDistrict || null,
      addressCity: record.addressCity,
      contactPersonFirstName: record.contactFirstName,
      contactPersonMiddleName: record.contactMiddleName || null,
      contactPersonLastName: record.contactLastName,
      contactPersonExtensionName: record.contactSuffix || null,
      contactEmail: record.contactEmail,
      contactNumber: record.contactNumber,
    };

    if (record.companySize && String(record.companySize).trim() !== '') {
      const parsedSize = Number(record.companySize);
      if (!Number.isNaN(parsedSize) && parsedSize > 0) {
        payload.companySize = parsedSize;
      }
    }

    if (record.yearEstablished && String(record.yearEstablished).trim() !== '') {
      const parsedYear = Number(record.yearEstablished);
      if (!Number.isNaN(parsedYear) && parsedYear >= 1800) {
        payload.yearEstablished = parsedYear;
      }
    }

    const raw = await adminApiService.createCompanyUser(payload);
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
    const current = await adminApiService.getPesoUser(Number(id));
    const payload = compact({
      firstName: updates.firstName,
      middleName: updates.middleName,
      lastName: updates.lastName,
      extensionName: updates.suffix,
      birthDate: updates.birthdate,
      sex: updates.sex,
      addressLine: updates.addressLine,
      addressBarangay: updates.barangay,
      addressDistrict: updates.district,
      addressCity: updates.city,
      contactEmail: updates.contactEmail,
      contactNumber: updates.contactNumber,
      employeeId: updates.employeeId,
      department: updates.department,
      position: updates.position,
    });
    if (Object.keys(payload).length) {
      await adminApiService.updatePesoUser(Number(id), payload);
    }
    await applyStatusChange(current, updates);
    return adaptAdminPesoItem(await adminApiService.getPesoUser(Number(id)));
  },

  createQCPesoRecord: async (record: any): Promise<QCPesoRecord> => {
    const raw = await adminApiService.createPesoUser({
      accountEmail: record.email,
      initialPassword: record.temporaryPassword,
      firstName: record.firstName,
      middleName: record.middleName || null,
      lastName: record.lastName,
      extensionName: record.suffix || null,
      addressLine: record.addressLine,
      addressBarangay: record.barangay,
      addressDistrict: record.district,
      addressCity: record.city,
      birthDate: record.birthdate,
      sex: record.sex,
      contactEmail: record.contactEmail,
      contactNumber: record.contactNumber,
      employeeId: record.employeeId,
      department: record.department,
      position: record.position,
    });
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

function compact(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  );
}

function mapYearLevel(value?: string): string | undefined {
  if (!value) return undefined;
  const levels: Record<string, string> = {
    'Grade 11': 'grade_11',
    'Grade 12': 'grade_12',
    '1st Year': 'first_year_college',
    '2nd Year': 'second_year_college',
    '3rd Year': 'third_year_college',
    '4th Year': 'fourth_year_college',
  };
  return levels[value] || value;
}

function normalizeIndustryName(value: string): string {
  return value.toLowerCase().replace(/\s*\/\s*/g, '/').trim();
}

async function industryIdFor(name: string): Promise<number> {
  const industries = await referenceService.getIndustries();
  const match = industries.find(
    (item) => normalizeIndustryName(item.industryName) === normalizeIndustryName(name),
  );
  if (!match) throw new Error(`Unknown industry: ${name}`);
  return match.industryId;
}

async function mapPreferredIndustries(names: string[], customName?: string) {
  const industries = await referenceService.getIndustries();
  return names.map((name) => {
    if (name === 'Other') {
      const custom = industries.find((item) => item.isCustomText);
      if (!custom) throw new Error('The custom industry reference is not configured.');
      return { industryId: custom.industryId, customIndustryName: customName };
    }
    const match = industries.find(
      (item) => normalizeIndustryName(item.industryName) === normalizeIndustryName(name),
    );
    if (!match) throw new Error(`Unknown industry: ${name}`);
    return { industryId: match.industryId };
  });
}

async function applyStatusChange(
  current: { userAccountId: number; accountStatus: string },
  updates: { status?: AccountStatus; suspensionDaysRemaining?: number },
) {
  if (!updates.status) return;
  const statuses: Record<AccountStatus, string> = {
    Active: 'active',
    Inactive: 'archived',
    Suspended: 'suspended',
    Deactivated: 'archived',
    Pending: 'active',
  };
  const status = statuses[updates.status];
  if (status === current.accountStatus) return;
  await adminApiService.setAccountStatus(
    Number(current.userAccountId),
    status,
    status === 'suspended' ? updates.suspensionDaysRemaining : undefined,
  );
}
