import type { 
  AdminRecord, 
  StudentRecord, 
  EmployerRecord, 
  QCPesoRecord, 
  AccountStatus,
  AuditLog,
  AdminDashboardSummary,
  AdminNotification
} from '../types/admin.types'
import { 
  MOCK_STUDENT_RECORD, 
  MOCK_STUDENT_RECORDS,
  MOCK_EMPLOYER_RECORD, 
  MOCK_EMPLOYER_RECORDS,
  MOCK_QCPESO_RECORD, 
  MOCK_QCPESO_RECORDS,
  MOCK_AUDIT_LOGS,
  MOCK_ADMIN_SUMMARY,
  MOCK_ADMIN_NOTIFICATIONS
} from '../mocks/admin.mock'

let currentStudentRecord = { ...MOCK_STUDENT_RECORD }
let currentStudentRecords = MOCK_STUDENT_RECORDS.map((record) => ({ ...record }))
let currentEmployerRecord = { ...MOCK_EMPLOYER_RECORD }
let currentEmployerRecords = MOCK_EMPLOYER_RECORDS.map((record) => ({ ...record }))
let currentQCPesoRecord = { ...MOCK_QCPESO_RECORD }
let currentQCPesoRecords = MOCK_QCPESO_RECORDS.map((record) => ({ ...record }))
let currentAuditLogs = [ ...MOCK_AUDIT_LOGS ]
let currentSummary = { ...MOCK_ADMIN_SUMMARY }
let currentNotifications = [ ...MOCK_ADMIN_NOTIFICATIONS ]

export const adminService = {
  getStudentRecords: async (): Promise<StudentRecord[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(currentStudentRecords.map((record) => ({ ...record }))), 300)
    })
  },

  getEmployerRecords: async (): Promise<EmployerRecord[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(currentEmployerRecords.map((record) => ({ ...record }))), 300)
    })
  },

  getQCPesoRecords: async (): Promise<QCPesoRecord[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(currentQCPesoRecords.map((record) => ({ ...record }))), 300)
    })
  },

  getDashboardSummary: async (): Promise<AdminDashboardSummary> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ ...currentSummary }), 300)
    })
  },

  getRecentAuditLogs: async (limit: number = 4): Promise<AuditLog[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(currentAuditLogs.slice(0, limit)), 300)
    })
  },

  getNotifications: async (): Promise<AdminNotification[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...currentNotifications]), 300)
    })
  },

  markAllNotificationsAsRead: async (): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        currentNotifications = currentNotifications.map((n) => ({ ...n, isRead: true }))
        resolve()
      }, 200)
    })
  },

  getRecordById: async (id: string, role: string): Promise<AdminRecord> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (role === 'Student') resolve(currentStudentRecord)
        else if (role === 'Employer') resolve(currentEmployerRecord)
        else resolve(currentQCPesoRecord)
      }, 300)
    })
  },
  
  updateRecord: async (id: string, role: string, updates: Partial<AdminRecord>): Promise<AdminRecord> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (role === 'Student') {
          currentStudentRecord = { ...currentStudentRecord, ...updates } as StudentRecord
          resolve(currentStudentRecord)
        } else if (role === 'Employer') {
          currentEmployerRecord = { ...currentEmployerRecord, ...updates } as EmployerRecord
          resolve(currentEmployerRecord)
        } else {
          currentQCPesoRecord = { ...currentQCPesoRecord, ...updates } as QCPesoRecord
          resolve(currentQCPesoRecord)
        }
      }, 300)
    })
  },

  toggleRecordStatus: async (id: string, role: string, newStatus: AccountStatus): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (role === 'Student') currentStudentRecord.status = newStatus
        else if (role === 'Employer') currentEmployerRecord.status = newStatus
        else currentQCPesoRecord.status = newStatus
        resolve(true)
      }, 300)
    })
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(currentAuditLogs), 300)
    })
  },

  triggerManualBackup: async (): Promise<{ success: boolean; message: string }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: 'Database backup initiated successfully.' })
      }, 800)
    })
  },
}

export default adminService
