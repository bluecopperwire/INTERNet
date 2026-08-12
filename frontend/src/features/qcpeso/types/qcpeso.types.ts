export type ReferralStatus = 'Under Review' | 'Endorsed to Employer' | 'Approved' | 'Rejected' | 'Pending'

export type InternStatus = 'Ongoing' | 'Completed' | 'Paused' | 'For Placement'

export interface DTRLog {
  id: string
  date: string
  timeIn: string
  timeOut: string
  hoursRendered: number
  status: 'Present' | 'Late' | 'Absent'
  remarks?: string
}

export interface ReferralItem {
  id: string
  studentName: string
  email: string
  phone: string
  targetEmployer: string
  position: string
  dateForwarded: string
  status: ReferralStatus
  submittedDocuments: string[]
  course?: string
  school?: string
  notes?: string
}

export interface InternItem {
  id: string
  studentName: string
  email: string
  phone: string
  matchedEmployer: string
  acceptedRole: string
  dateOfPlacement: string
  status: InternStatus
  submittedDocuments: string[]
  renderedHours: number
  targetHours: number
  dtrLogs: DTRLog[]
  course?: string
  school?: string
}

export type ApplicationStatus = 'Pending' | 'Verified' | 'Rejected' | 'Flagged'

export interface ApplicationItem {
  id: string
  studentName: string
  email: string
  phone: string
  school: string
  program: string
  dateSubmitted: string
  gwa: string
  verificationStatus: ApplicationStatus
  submittedDocuments: string[]
  appliedFor: string
}

export type EmployerStatus = 'Active' | 'Pending' | 'Suspended' | 'Rejected'

export interface EmployerItem {
  id: string
  companyName: string
  email: string
  phone: string
  representativeName: string
  opportunitiesOffered: string[]
  activeOpportunities: number
  accountStatus: EmployerStatus
  createdOn: string
}

export interface PaginationState {
  currentPage: number
  itemsPerPage: number
  totalItems: number
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
}

export interface EmployerOpportunity {
  id: string;
  name: string;
  rep: string;
  opportunities: number;
  status: string;
  email: string;
  phone: string;
  employerStatus: string;
  createdOn: string;
  opportunitiesOffered: string[];
}

export interface QCPesoProfile {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  birthdate: string;
  employeeIdNumber: string;
  position: string;
  department: string;
  fullName: string;
  role: string;
  location: string;
  qcpesoPosition: string;
  city: string;
}