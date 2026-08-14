import type { AdminRecord, StudentRecord, EmployerRecord, QCPesoRecord, AccountStatus } from '../types/admin.types';
import { MOCK_STUDENT_RECORD, MOCK_EMPLOYER_RECORD, MOCK_QCPESO_RECORD, MOCK_AUDIT_LOGS } from '../mocks/admin.mock';

let currentStudentRecord = { ...MOCK_STUDENT_RECORD };
let currentEmployerRecord = { ...MOCK_EMPLOYER_RECORD };
let currentQCPesoRecord = { ...MOCK_QCPESO_RECORD };
let currentAuditLogs = [ ...MOCK_AUDIT_LOGS ];

export const adminService = {
  getRecordById: async (id: string, role: string): Promise<AdminRecord> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (role === 'Student') {
          resolve(currentStudentRecord);
        } else if (role === 'Employer') {
          resolve(currentEmployerRecord);
        } else {
          resolve(currentQCPesoRecord);
        }
      }, 500);
    });
  },
  
  updateRecord: async (id: string, role: string, updates: Partial<AdminRecord>): Promise<AdminRecord> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (role === 'Student') {
          currentStudentRecord = { ...currentStudentRecord, ...updates } as StudentRecord;
          resolve(currentStudentRecord);
        } else if (role === 'Employer') {
          currentEmployerRecord = { ...currentEmployerRecord, ...updates } as EmployerRecord;
          resolve(currentEmployerRecord);
        } else {
          currentQCPesoRecord = { ...currentQCPesoRecord, ...updates } as QCPesoRecord;
          resolve(currentQCPesoRecord);
        }
      }, 500);
    });
  },

  toggleRecordStatus: async (id: string, role: string, newStatus: AccountStatus): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (role === 'Student') currentStudentRecord.status = newStatus;
        else if (role === 'Employer') currentEmployerRecord.status = newStatus;
        else currentQCPesoRecord.status = newStatus;
        resolve(true);
      }, 500);
    });
  },

  getAuditLogs: async (): Promise<any[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(currentAuditLogs);
      }, 500);
    });
  }
};


