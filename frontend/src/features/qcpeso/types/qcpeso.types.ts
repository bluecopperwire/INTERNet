import type { ApplicationStatus as ApiApplicationStatus } from "../../../types/api";

export type ApplicationStatus = "Pending" | "Verified" | "Rejected" | "Flagged";

export interface ApplicationItem {
  id: string;
  studentName: string;
  email: string;
  phone: string;
  school: string;
  program: string;
  dateSubmitted: string;
  gwa: string;
  verificationStatus: ApplicationStatus;
  submittedDocuments: string[];
  appliedFor: string;
}

export type EmployerStatus = "Active" | "Pending" | "Suspended" | "Rejected";

export interface EmployerItem {
  id: string;
  companyName: string;
  email: string;
  phone: string;
  representativeName: string;
  opportunitiesOffered: string[];
  activeOpportunities: number;
  accountStatus: EmployerStatus;
  createdOn: string;
}

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

export interface QCPesoDashboardSummary {
  pendingApplications: number;
  activeEmployers: number;
  verifiedRequirements: number;
  availableOpportunities: number;
}

export interface StudentApplication {
  id: string;
  name: string;
  school: string;
  program: string;
  date: string;
  status: string;
  email: string;
  phone: string;
  gwa: string;
  submittedDocuments: string[];
  appliedFor: string;
  applicationStatus?: ApiApplicationStatus;
}

export type MonitorUserStatus = "Active" | "Suspended";

export interface MonitoredStudentUser {
  id: string;
  studentName: string;
  email: string;
  mobileNumber: string;
  linkedIn: string;
  dateRegistered: string;
  status: MonitorUserStatus;
  address: string;
  birthdate: string;
  sex: string;
  school: string;
  program: string;
  yearLevel: string;
  requiredHours: string;
  preferredHostOrganizationType: string;
  internshipDaysAvailability: string;
  internshipStartDateAvailability: string;
  preferredField: string;
  willingOutsidePreferredField: string;
  profileImageUrl?: string;
}

export interface MonitoredCompanyUser {
  id: string;
  companyName: string;
  email: string;
  contactNumber: string;
  dateRegistered: string;
  status: MonitorUserStatus;
  description: string;
  address: string;
  companyType: string;
  industry: string;
  companySize: string;
  yearEstablished: string;
  websiteUrl: string;
  contactPerson: string;
  profileImageUrl?: string;
}

export interface CreateEmployerPayload {
  companyName: string;
  companyType: "Government" | "Private";
  industry: string;
  companySize: string;
  yearEstablished: string;
  websiteUrl: string;
  description: string;
  addressLine: string;
  barangay: string;
  district: string;
  city: string;
  contactFirstName: string;
  contactMiddleName: string;
  contactLastName: string;
  contactSuffix: string;
  contactEmail: string;
  contactNumber: string;
  loginEmail: string;
  password: string;
}

export type QCPesoApplicationStatus = "Pending" | "Accepted" | "Rejected";

export interface QCPesoDocument {
  id: string;
  name: string;
  typeName?: string;
  filePath: string;
  submittedAt?: string;
}

export interface QCPesoReviewApplicant {
  id: string;
  studentName: string;
  company: string;
  jobTitle: string;
  program: string;
  yearLevel: string;
  dateApplied: string;
  status: QCPesoApplicationStatus;
  applicationStatus?: ApiApplicationStatus;
  email: string;
  phone: string;
  address: string;
  school: string;
  requiredHours: number;
  availableDays: string;
  availableStartingDate: string;
  opportunityId: string;
  profileImageUrl?: string;
  documents?: QCPesoDocument[];
}

export interface QCPesoReferral {
  id: string;
  studentName: string;
  company: string;
  jobTitle: string;
  referralDate: string;
  companyResponse: "Pending" | "For Interview" | "Accepted" | "Rejected";
  studentResponse: "Pending" | "Accepted" | "Rejected";
  email: string;
  phone: string;
  address: string;
  profileImageUrl?: string;
  documents?: QCPesoDocument[];
}

export interface QCPesoOpportunity {
  id: string;
  title: string;
  company: string;
  department: string;
  workArrangement: string;
  slots: number;
  duration: number;
  allowance: string;
  applicationDeadline: string;
  jobDescription: string;
  qualifications: string;
}

export type QCPesoInternshipStatus =
  | "On Going"
  | "Completed"
  | "Awaiting Completion"
  | "Withdrawn by Student"
  | "Cancelled";

export interface QCPesoInternshipRecord {
  id: string;
  studentName: string;
  company: string;
  jobTitle: string;
  workingDays: string;
  requiredHours: number;
  startDate: string;
  expectedEndDate: string;
  shiftStartTime: string;
  shiftEndTime: string;
  status: QCPesoInternshipStatus;
  renderedHours: number;
}

export interface QCPesoAttendanceRecord {
  id: string;
  internshipId: string;
  studentName: string;
  company: string;
  jobTitle: string;
  date: string;
  timeIn: string;
  timeOut: string;
  status: "Present" | "Absent" | "Late";
  hoursRendered: number;
}

export interface QCPesoProfile {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  birthdate: string;
  sex: "Male" | "Female";
  addressLine: string;
  barangay: string;
  district: string;
  city: string;
  email: string;
  mobileNumber: string;
  employeeIdNumber: string;
  position: string;
  department: string;
  fullName: string;
  role: string;
  location: string;
  qcpesoPosition: string;
  avatarUrl?: string;
}
