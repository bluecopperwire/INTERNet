import type { 
  InternItem, 
  ReferralItem,
  QCPesoDashboardSummary, 
  QCPesoProfile, 
  StudentApplication, 
  EmployerOpportunity 
} from '../types/qcpeso.types'

export const MOCK_REFERRALS: ReferralItem[] = [
  {
    id: 'REF-2026-001',
    studentName: 'Kyle Ethan Porciuncula',
    email: 'kyleporciuncula@gmail.com',
    phone: '09123456789',
    targetEmployer: 'Metropolitan Tech Solutions',
    position: 'Full Stack Web Developer Intern',
    dateForwarded: '2026-08-01',
    status: 'Under Review',
    submittedDocuments: ['Curriculum vitae', 'Proof of Residency', 'COR / Credentials', 'Letter of Intent'],
    course: 'BS Computer Science',
    school: 'Quezon City University',
    notes: 'Complete pre-referral documents submitted. Outstanding DigiCV portfolio.',
  },
  {
    id: 'REF-2026-002',
    studentName: 'Maria Santos',
    email: 'maria.santos@gmail.com',
    phone: '09171234567',
    targetEmployer: 'Quezon City IT Department',
    position: 'UI/UX Design Intern',
    dateForwarded: '2026-08-02',
    status: 'Endorsed to Employer',
    submittedDocuments: ['Curriculum vitae', 'Proof of Residency', 'Letter of Recommendation'],
    course: 'BS Information Technology',
    school: 'Polytechnic University of the Philippines',
  }
]

export const MOCK_INTERNS: InternItem[] = [
  {
    id: 'INT-2026-001',
    studentName: 'Kyle Ethan Porciuncula',
    email: 'kyleporciuncula@gmail.com',
    phone: '09123456789',
    matchedEmployer: 'Metropolitan Tech Solutions',
    acceptedRole: 'Full Stack Web Developer Intern',
    dateOfPlacement: '2026-07-15',
    status: 'Ongoing',
    submittedDocuments: ['Curriculum vitae', 'Proof of Residency', 'COR / Credentials', 'Letter of Intent'],
    renderedHours: 120,
    targetHours: 200,
    course: 'BS Computer Science',
    school: 'Quezon City University',
    dtrLogs: []
  }
]

export const MOCK_QCPESO_SUMMARY: QCPesoDashboardSummary = {
  pendingApplications: 1291,
  activeEmployers: 100,
  verifiedRequirements: 1200,
  availableOpportunities: 522
}

export const MOCK_QCPESO_PROFILE: QCPesoProfile = {
  id: 'qcp-1',
  firstName: 'Kyle Ethan',
  middleName: 'Santos',
  lastName: 'Porciuncula',
  birthdate: '2004-05-15',
  employeeIdNumber: 'QCPESO-2026-089',
  position: 'UI/UX Designer',
  department: 'Information Technology Division',
  fullName: 'Kyle Ethan Santos Porciuncula',
  role: 'UI/UX Designer',
  location: 'Quezon City, Philippines',
  qcpesoPosition: 'UI/UX Designer',
  city: 'Quezon City'
}

export const MOCK_STUDENTS: StudentApplication[] = [
  { 
    id: '1', 
    name: 'Kyle Ethan Porciuncula', 
    school: 'Polytechnic University of the Philippines', 
    program: 'BS Computer Science', 
    date: 'July 1, 2026', 
    status: 'Pending',
    email: 'kyleporciuncula@gmail.com',
    phone: '09123456789',
    gwa: '1.25',
    submittedDocuments: ['Curriculum Vitae', 'Lorem Ipsum'],
    appliedFor: 'Lorem Ipsum'
  },
  { 
    id: '2', 
    name: 'Juan Dela Cruz', 
    school: 'Quezon City University', 
    program: 'BS Information Technology', 
    date: 'July 2, 2026', 
    status: 'Verified',
    email: 'juandelacruz@gmail.com',
    phone: '09171234567',
    gwa: '1.50',
    submittedDocuments: ['Curriculum Vitae', 'Proof of Residency'],
    appliedFor: 'Software Engineer Intern'
  }
]

export const MOCK_EMPLOYERS: EmployerOpportunity[] = [
  { 
    id: '1', 
    name: 'ABC Company', 
    rep: 'Polytechnic University of the Philippines', 
    opportunities: 5, 
    status: 'Active',
    email: 'ABCcompany@gmail.com',
    phone: '09123456789',
    employerStatus: 'Ongoing',
    createdOn: 'July 1, 2026',
    opportunitiesOffered: [
      'Lorem ipsum dolor sit amet',
      'Lorem ipsum dolor sit amet',
      'Lorem ipsum dolor sit amet',
      'Lorem ipsum dolor sit amet',
      'Lorem ipsum dolor sit amet',
      'Lorem ipsum dolor sit amet'
    ]
  },
  { 
    id: '2', 
    name: 'Meta Company', 
    rep: 'John Doe', 
    opportunities: 12, 
    status: 'Pending Review',
    email: 'contact@meta.com',
    phone: '09181112222',
    employerStatus: 'Under Review',
    createdOn: 'July 5, 2026',
    opportunitiesOffered: [
      'Frontend Developer Intern',
      'UI/UX Researcher'
    ]
  },
  { 
    id: '3', 
    name: 'Innovate Tech', 
    rep: 'Mark Reyes', 
    opportunities: 2, 
    status: 'Inactive',
    email: 'careers@innovatetech.ph',
    phone: '09199998888',
    employerStatus: 'Paused',
    createdOn: 'June 15, 2026',
    opportunitiesOffered: [
      'QA Tester Intern',
      'Data Encoder'
    ]
  }
]