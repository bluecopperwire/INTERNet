import type { StudentRecord, EmployerRecord, QCPesoRecord, AuditLog } from '../types/admin.types';

export const MOCK_STUDENT_RECORD: StudentRecord = {
  id: 'USER-STU-001',
  role: 'Student',
  fullName: 'Juan Dela Cruz',
  email: 'juan@email.com',
  status: 'Active',
  dateCreated: 'August 14, 2026',
  studentId: 'STU-0001',
  sex: 'Male',
  birthdate: '2004-05-15',
  contactNumber: '09123456789',
  fullAddress: '123 Main St, Brgy. San Jose, District 1, Quezon City',
  inquiryVia: 'Social Media',
  schoolName: 'Polytechnic University of the Philippines',
  programStrand: 'Bachelor of Science in Information Technology',
  yearLevel: 'Fourth Year College',
  requiredHours: '400',
  flexibleAssignment: true,
  preferredIndustries: ['Information Technology', 'Software Development'],
  scheduleAvailability: ['Monday', 'Wednesday', 'Friday'],
  startDate: '2026-09-01',
  hostOrgType: 'Private Corporation'
};

export const MOCK_EMPLOYER_RECORD: EmployerRecord = {
  id: 'USER-EMP-001',
  role: 'Employer',
  fullName: 'Maria Santos',
  email: 'hr@abc.com',
  status: 'Active',
  dateCreated: 'January 10, 2026',
  companyId: 'COMP-001',
  companyName: 'ABC Technologies Inc.',
  industry: 'Information Technology',
  companyType: 'Private',
  location: 'Quezon City, Metro Manila',
  companyWebsite: 'https://www.abctech.com',
  yearEstablished: '2010',
  companySize: '51-200 employees',
  contactPerson: 'Maria Santos',
  contactNumber: '09123456789',
  verificationStatus: 'Verified'
};

export const MOCK_QCPESO_RECORD: QCPesoRecord = {
  id: 'USER-QC-001',
  role: 'QC PESO Personnel',
  fullName: 'Maria Reyes',
  email: 'maria@quezoncity.gov.ph',
  status: 'Active',
  dateCreated: 'March 05, 2026',
  firstName: 'Maria',
  middleName: 'Santos',
  lastName: 'Reyes',
  birthdate: '1990-08-20',
  employeeId: 'QCPESO-001',
  position: 'Employment Officer',
  department: 'QC PESO Internship Division',
  contactNumber: '09123456789',
  verificationStatus: 'Approved'
};

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'LOG-001',
    timestamp: '2026-07-15T09:30:00Z',
    userId: 'USER-STU-001',
    userFullName: 'Juan Dela Cruz',
    userEmail: 'juan@student.com',
    role: 'Student',
    actionType: 'ACCOUNT_DEACTIVATED',
    actionPerformed: 'Account was deactivated by administrator.',
    ipAddress: '192.168.1.1',
    accountStatus: 'Deactivated',
    historyTable: 'USER_ACCOUNT_STATUS',
    moduleName: 'User Management',
    performedBy: 'Admin - Sarah Smith',
    details: {
      previousStatus: 'Active',
      newStatus: 'Deactivated',
      changedBy: 'Sarah Smith',
      changedDate: '2026-07-15T09:30:00Z'
    }
  },
  {
    id: 'LOG-002',
    timestamp: '2026-07-15T10:15:00Z',
    userId: 'USER-STU-002',
    userFullName: 'Maria Clara',
    userEmail: 'maria@student.com',
    role: 'Student',
    actionType: 'APPLICATION_SUBMIT',
    actionPerformed: 'Submitted a new application.',
    ipAddress: '192.168.1.5',
    accountStatus: 'Active',
    historyTable: 'APPLICATION_STATUS',
    moduleName: 'Applications',
    performedBy: 'Maria Clara',
    details: {
      student: 'Maria Clara',
      opportunity: 'Frontend Developer Intern at TechCorp',
      previousStatus: 'Draft',
      newStatus: 'Submitted',
      changedBy: 'Maria Clara'
    }
  },
  {
    id: 'LOG-003',
    timestamp: '2026-07-16T14:45:00Z',
    userId: 'USER-EMP-001',
    userFullName: 'TechCorp HR',
    userEmail: 'hr@techcorp.com',
    role: 'Employer',
    actionType: 'PROFILE_UPDATE',
    actionPerformed: 'Updated profile information.',
    ipAddress: '10.0.0.45',
    accountStatus: 'Active',
    historyTable: 'REFERRAL_STATUS',
    moduleName: 'Referrals',
    performedBy: 'TechCorp HR',
    details: {
      student: 'Jose Rizal',
      company: 'TechCorp',
      previousStatus: 'Pending Review',
      newStatus: 'Shortlisted',
      changedBy: 'TechCorp HR'
    }
  },
  {
    id: 'LOG-004',
    timestamp: '2026-07-17T08:00:00Z',
    userId: 'USER-QC-001',
    userFullName: 'QC PESO Admin',
    userEmail: 'admin@qcpeso.gov.ph',
    role: 'QC PESO Personnel',
    actionType: 'ACCOUNT_VERIFIED',
    actionPerformed: 'Verified a user account.',
    ipAddress: '172.16.0.12',
    accountStatus: 'Active',
    historyTable: 'INTERNSHIP_ASSIGNMENT_STATUS',
    moduleName: 'Internship Assignments',
    performedBy: 'QC PESO Admin',
    details: {
      student: 'Andres Bonifacio',
      company: 'InnovateInc',
      previousStatus: 'Pending Assignment',
      newStatus: 'Assigned',
      changedBy: 'QC PESO Admin'
    }
  },
  {
    id: 'LOG-005',
    timestamp: '2026-07-17T11:30:00Z',
    userId: 'USER-EMP-002',
    userFullName: 'BuildIT Corp',
    userEmail: 'info@buildit.com',
    role: 'Employer',
    actionType: 'ACCOUNT_VERIFIED',
    actionPerformed: 'Verified a user account.',
    ipAddress: '192.168.1.10',
    accountStatus: 'Active',
    historyTable: 'PESO_PERSONNEL_VERIFICATION',
    moduleName: 'Employer Verification',
    performedBy: 'QC PESO Admin',
    details: {
      personnelName: 'BuildIT Corp',
      previousStatus: 'Pending',
      newStatus: 'Verified',
      reviewer: 'QC PESO Admin',
      reviewDate: '2026-07-17T11:30:00Z'
    }
  }
];
