export type AccountStatus = 'Active' | 'Inactive' | 'Pending' | 'Deactivated';
export type UserRole = 'Student' | 'Employer' | 'QC PESO Personnel';

export interface BaseRecord {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  status: AccountStatus;
  dateCreated: string;
  profileImageUrl?: string;
}

export interface StudentRecord extends BaseRecord {
  role: 'Student';
  studentId: string;
  sex: string;
  birthdate: string;
  contactNumber: string;
  fullAddress: string;
  inquiryVia: string;
  schoolName: string;
  programStrand: string;
  yearLevel: string;
  requiredHours: string;
  flexibleAssignment: boolean;
  preferredIndustries: string[];
  scheduleAvailability: string[];
  startDate: string;
  hostOrgType: string;
}

export interface EmployerRecord extends BaseRecord {
  role: 'Employer';
  companyId: string;
  companyName: string;
  industry: string;
  companyType: string;
  location: string;
  companyWebsite: string;
  yearEstablished: string;
  companySize: string;
  contactPerson: string;
  contactNumber: string;
  verificationStatus: string;
}

export interface QCPesoRecord extends BaseRecord {
  role: 'QC PESO Personnel';
  firstName: string;
  middleName: string;
  lastName: string;
  birthdate: string;
  employeeId: string;
  position: string;
  department: string;
  contactNumber: string;
  verificationStatus: string;
}

export type AdminRecord = StudentRecord | EmployerRecord | QCPesoRecord;

export type AuditLogType = 'LOGIN' | 'PROFILE_UPDATE' | 'APPLICATION_SUBMIT' | 'ACCOUNT_VERIFIED' | 'ACCOUNT_DEACTIVATED' | 'REQUIREMENTS_UPLOAD' | 'PASSWORD_CHANGE';

export type HistoryTableType = 'USER_ACCOUNT_STATUS' | 'APPLICATION_STATUS' | 'REFERRAL_STATUS' | 'INTERNSHIP_ASSIGNMENT_STATUS' | 'PESO_PERSONNEL_VERIFICATION' | 'GENERAL';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  role: UserRole | 'Admin';
  actionType: AuditLogType;
  actionPerformed: string;
  ipAddress: string;
  accountStatus: AccountStatus;
  historyTable: HistoryTableType;
  moduleName: string;
  performedBy: string;
  details: Record<string, any>;
}
