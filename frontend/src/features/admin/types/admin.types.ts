export type AccountStatus = 'Active' | 'Inactive' | 'Suspended' | 'Deactivated' | 'Pending'

export interface BaseRecord {
  id: string
  fullName: string
  email: string
  status: AccountStatus
  dateCreated: string
  profileImageUrl?: string
}

export interface StudentRecord extends BaseRecord {
  role: 'Student'
  studentId: string
  firstName?: string
  middleName?: string
  lastName?: string
  suffix?: string
  sex: 'Male' | 'Female' | 'Other'
  birthdate: string
  contactNumber: string
  fullAddress: string
  addressStreet?: string
  addressBarangay?: string
  addressDistrict?: string
  addressCity?: string
  linkedinUrl?: string
  inquiryVia: string
  schoolName: string
  programStrand: string
  yearLevel: string
  requiredHours: string
  flexibleAssignment: boolean
  preferredIndustries: string[]
  otherPreferredField?: string
  scheduleAvailability: string[]
  startDate: string
  hostOrgType: string
}

export interface EmployerRecord extends BaseRecord {
  role: 'Employer'
  companyId: string
  companyName: string
  description?: string
  industry: string
  companyType: string
  location: string
  addressLine?: string
  addressBarangay?: string
  addressDistrict?: string
  addressCity?: string
  companyWebsite: string
  yearEstablished: string
  companySize: string
  contactPerson: string
  contactFirstName?: string
  contactMiddleName?: string
  contactLastName?: string
  contactSuffix?: string
  contactNumber: string
  verificationStatus: 'Verified' | 'Pending' | 'Rejected'
}

export interface QCPesoRecord extends BaseRecord {
  role: 'QC PESO Personnel'
  firstName: string
  middleName: string
  lastName: string
  suffix?: string
  birthdate: string
  sex?: 'Male' | 'Female' | 'Other'
  addressLine?: string
  barangay?: string
  district?: string
  city?: string
  employeeId: string
  position: string
  department: string
  contactNumber: string
  verificationStatus: 'Approved' | 'Pending' | 'Rejected'
}

export type AdminRecord = StudentRecord | EmployerRecord | QCPesoRecord

export interface AuditLogDetails {
  previousStatus?: string
  newStatus?: string
  changedBy?: string
  changedDate?: string
  student?: string
  opportunity?: string
  company?: string
  personnelName?: string
  reviewer?: string
  reviewDate?: string
  [key: string]: unknown
}

export interface AuditLog {
  id: string
  timestamp: string
  userId: string
  userFullName: string
  userEmail: string
  role: string
  actionType: string
  actionPerformed: string
  ipAddress: string
  accountStatus: string
  historyTable: string
  moduleName: string
  performedBy: string
  details?: AuditLogDetails
}

export interface SystemHealthStatus {
  serverStatus: 'Operational' | 'Degraded' | 'Maintenance'
  uptime: string
  databaseLoad: string
  activeSessions: number
  lastBackup: string
  storageUsedPercent: number
}

export interface AdminDashboardSummary {
  totalStudents: number
  activeStudents: number
  totalEmployers: number
  totalAvailableOpportunities: number
  systemHealth: SystemHealthStatus
}

export interface AdminNotification {
  id: string
  title: string
  message: string
  timeAgo: string
  isRead: boolean
}

export type BackupTriggerType = 'Automated' | 'Manual'
export type BackupStatus = 'Successful' | 'In Progress' | 'Failed'

export interface BackupRecord {
  id: string
  filename: string
  timestamp: string
  triggerType: BackupTriggerType
  fileSize: string
  status: BackupStatus
  downloadUrl?: string
}
