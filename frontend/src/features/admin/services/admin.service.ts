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

  getStudentRecord: async (id: string): Promise<StudentRecord | null> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(currentStudentRecords.find((record) => record.id === id) ?? null), 250)
    })
  },

  updateStudentRecord: async (id: string, updates: Partial<StudentRecord>): Promise<StudentRecord | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = currentStudentRecords.findIndex((record) => record.id === id)
        if (index < 0) {
          resolve(null)
          return
        }
        currentStudentRecords[index] = { ...currentStudentRecords[index], ...updates }
        resolve({ ...currentStudentRecords[index] })
      }, 250)
    })
  },

  getEmployerRecords: async (): Promise<EmployerRecord[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(currentEmployerRecords.map((record) => ({ ...record }))), 300)
    })
  },

  getEmployerRecord: async (id: string): Promise<EmployerRecord | null> => {
    return new Promise((resolve) => setTimeout(() => resolve(currentEmployerRecords.find((record) => record.id === id) ?? null), 250))
  },

  updateEmployerRecord: async (id: string, updates: Partial<EmployerRecord>): Promise<EmployerRecord | null> => {
    return new Promise((resolve) => setTimeout(() => {
      const index = currentEmployerRecords.findIndex((record) => record.id === id)
      if (index < 0) return resolve(null)
      currentEmployerRecords[index] = { ...currentEmployerRecords[index], ...updates }
      resolve({ ...currentEmployerRecords[index] })
    }, 250))
  },

  createEmployerRecord: async (record: EmployerRecord): Promise<EmployerRecord> => {
    return new Promise((resolve) => setTimeout(() => {
      currentEmployerRecords = [record, ...currentEmployerRecords]
      resolve({ ...record })
    }, 250))
  },

  getQCPesoRecords: async (): Promise<QCPesoRecord[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(currentQCPesoRecords.map((record) => ({ ...record }))), 300)
    })
  },

  getQCPesoRecord: async (id: string): Promise<QCPesoRecord | null> => {
    return new Promise((resolve) => setTimeout(() => resolve(currentQCPesoRecords.find((record) => record.id === id) ?? null), 250))
  },

  updateQCPesoRecord: async (id: string, updates: Partial<QCPesoRecord>): Promise<QCPesoRecord | null> => {
    return new Promise((resolve) => setTimeout(() => {
      const index = currentQCPesoRecords.findIndex((record) => record.id === id)
      if (index < 0) return resolve(null)
      currentQCPesoRecords[index] = { ...currentQCPesoRecords[index], ...updates }
      resolve({ ...currentQCPesoRecords[index] })
    }, 250))
  },

  createQCPesoRecord: async (record: QCPesoRecord): Promise<QCPesoRecord> => {
    return new Promise((resolve) => setTimeout(() => {
      currentQCPesoRecords = [record, ...currentQCPesoRecords]
      resolve({ ...record })
    }, 250))
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

  getRecordById: async (_id: string, role: string): Promise<AdminRecord> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (role === 'Student') resolve(currentStudentRecord)
        else if (role === 'Employer') resolve(currentEmployerRecord)
        else resolve(currentQCPesoRecord)
      }, 300)
    })
  },
  
  updateRecord: async (_id: string, role: string, updates: Partial<AdminRecord>): Promise<AdminRecord> => {
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

  toggleRecordStatus: async (_id: string, role: string, newStatus: AccountStatus): Promise<boolean> => {
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
