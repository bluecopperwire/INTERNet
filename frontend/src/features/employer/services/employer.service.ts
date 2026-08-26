import type { 
  Opportunity, 
  Applicant, 
  CompanyProfile, 
  EmployerDashboardSummary, 
  EmployerNotification,
  EmployerAttendanceRecord,
  EmployerInternshipDetails,
  InternshipAssignment
} from '../types/employer.types'

export function isOpportunityDeadlineExpired(applicationDeadline: string): boolean {
  if (!applicationDeadline) return false

  const deadline = new Date(`${applicationDeadline}T00:00:00`)
  if (Number.isNaN(deadline.getTime())) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return today >= deadline
}

export function formatOpportunityDeadline(applicationDeadline: string): string {
  const [year, month, day] = applicationDeadline.split('-').map(Number)
  if (!year || !month || !day) return applicationDeadline

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function closeExpiredOpportunities() {
  mockOpportunities.forEach((opportunity) => {
    if (isOpportunityDeadlineExpired(opportunity.applicationDeadline)) {
      opportunity.status = 'Closed'
    }
  })
}

const mockOpportunities: Opportunity[] = [
  { id: '1', title: 'IT Intern', department: 'IT Department', workArrangement: 'On-site', slots: 5, duration: 200, allowance: 'PHP 500 per day', applicationDeadline: '2026-09-15', jobDescription: 'Support the IT team with documentation, testing, and daily technical operations.', qualifications: 'Currently enrolled in an IT-related program with basic programming and communication skills.', status: 'Open', applicants: 24 },
  { id: '2', title: 'HR Intern', department: 'Human Resources', workArrangement: 'Hybrid', slots: 2, duration: 150, allowance: 'N/A', applicationDeadline: '2026-09-08', jobDescription: 'Assist with recruitment coordination and employee records.', qualifications: 'Currently enrolled in Psychology, HR, or a related program.', status: 'Open', applicants: 10 },
  { id: '3', title: 'Marketing Intern', department: 'Marketing', workArrangement: 'Remote', slots: 3, duration: 300, allowance: 'PHP 400 per day', applicationDeadline: '2026-08-01', jobDescription: 'Support campaign planning and social media content preparation.', qualifications: 'Currently enrolled in Marketing, Communications, or a related program.', status: 'Closed', applicants: 45 },
  { id: '4', title: 'Finance Intern', department: 'Finance', workArrangement: 'On-site', slots: 1, duration: 250, allowance: 'PHP 450 per day', applicationDeadline: '2026-09-22', jobDescription: 'Assist with financial records, reports, and administrative tasks.', qualifications: 'Currently enrolled in Accounting, Finance, or a related program.', status: 'Open', applicants: 8 },
]

let mockCompanyProfile: CompanyProfile = {
  company_name: 'ABC Company',
  company_type: 'Private',
  industry: 'Information Technology',
  description: 'ABC Company creates practical technology solutions and provides structured internship opportunities for students pursuing careers in information technology.',
  website_url: 'https://abccompany.com',
  year_established: '2015',
  company_size: '200',
  address_line: '123 Aurora Boulevard',
  address_barangay: 'Cubao',
  address_district: 'District 3',
  address_city: 'Quezon City',
  contact_email: 'abccompany.hr@gmail.com',
  contact_number: '(02)1234-5678',
  contact_person_first_name: 'Juan',
  contact_person_middle_name: 'Mendoza',
  contact_person_last_name: 'Dela Cruz',
  contact_person_extension_name: 'Jr',
}

const mockApplicantsList: Applicant[] = [
  {
    id: 'app-1',
    name: 'Marie Santos',
    opportunityId: '1',
    opportunityTitle: 'IT Intern',
    course: 'BS Information Technology',
    yearLevel: '3rd Year',
    dateApplied: 'August 14, 2026',
    status: 'Pending',
    email: 'mariesantos@gmail.com',
    phone: '09171234567',
    location: 'Quezon City, Philippines',
    school: 'Polytechnic University of the Philippines',
    preferredField: 'Information Technology',
    requiredHours: 200,
    availabilityDays: 'Weekdays',
    availabilityDate: 'August 20, 2026',
  },
  {
    id: 'app-2',
    name: 'John Doe',
    opportunityId: '2',
    opportunityTitle: 'HR Intern',
    course: 'BS Psychology',
    yearLevel: '4th Year',
    dateApplied: 'August 13, 2026',
    status: 'Accepted',
    email: 'johndoe@gmail.com',
    phone: '09181112222',
    location: 'Quezon City, Philippines',
    school: 'Quezon City University',
    preferredField: 'Human Resources',
    requiredHours: 150,
    availabilityDays: 'Weekdays',
    availabilityDate: 'August 18, 2026',
  },
  {
    id: 'app-3',
    name: 'Kyle Ethan Porciuncula',
    opportunityId: '1',
    opportunityTitle: 'IT Intern',
    course: 'BS Computer Science',
    yearLevel: '3rd Year',
    dateApplied: 'August 12, 2026',
    status: 'For Interview',
    email: 'kyleporciuncula@gmail.com',
    phone: '09123456789',
    location: 'Quezon City, Philippines',
    school: 'Polytechnic University of the Philippines',
    preferredField: 'UI/UX Design',
    requiredHours: 200,
    availabilityDays: 'Flexible',
    availabilityDate: 'August 15, 2026',
  },
  {
    id: 'app-4',
    name: 'Angelica Reyes',
    opportunityId: '1',
    opportunityTitle: 'IT Intern',
    course: 'BS Information Systems',
    yearLevel: '4th Year',
    dateApplied: 'August 10, 2026',
    status: 'Rejected',
    email: 'angelica.reyes@gmail.com',
    phone: '09223334455',
    location: 'Quezon City, Philippines',
    school: 'Far Eastern University',
    preferredField: 'Quality Assurance',
    requiredHours: 200,
    availabilityDays: 'Weekdays',
    availabilityDate: 'August 16, 2026',
    rejectionRemark: 'The current opening requires experience with automated testing tools.',
  },
  ...Array(16).fill(null).map((_, i) => ({
    id: `app-global-${i + 5}`,
    name: `Student Name ${i + 5}`,
    opportunityId: `${(i % 4) + 1}`,
    opportunityTitle: ['IT Intern', 'HR Intern', 'Marketing Intern', 'Finance Intern'][i % 4] ?? 'IT Intern',
    course: i % 2 === 0 ? 'BS Information Technology' : 'BS Computer Science',
    yearLevel: `${(i % 4) + 1}th Year`,
    dateApplied: 'August 08, 2026',
    status: (i % 4 === 0 ? 'Accepted' : (i % 3 === 0 ? 'Rejected' : (i % 2 === 0 ? 'For Interview' : 'Pending'))) as Applicant['status'],
    email: `student${i + 5}@gmail.com`,
    phone: `0923478234${i % 10}`,
    location: 'Quezon City, Philippines',
    school: 'Quezon City University',
    preferredField: 'Information Technology',
    requiredHours: 200,
    availabilityDays: 'Weekdays',
    availabilityDate: 'August 25, 2026',
  })),
]

function withApplicantCount(opportunity: Opportunity): Opportunity {
  return {
    ...opportunity,
    applicants: mockApplicantsList.filter((applicant) => applicant.opportunityId === opportunity.id).length,
  }
}

let mockNotificationsList: EmployerNotification[] = [
  {
    id: 'notif-1',
    title: 'New Referral',
    message: 'QC PESO referred 5 students for the IT intern position',
    timeAgo: '12 mins ago',
    isRead: false,
  },
  {
    id: 'notif-2',
    title: 'New Application',
    message: 'Marie Santos applied for IT intern position',
    timeAgo: '12 mins ago',
    isRead: false,
  },
  {
    id: 'notif-3',
    title: 'Status Update',
    message: 'You accepted John Doe for HR Intern position',
    timeAgo: '12 mins ago',
    isRead: false,
  },
  {
    id: 'notif-4',
    title: 'System Notification',
    message: 'Your company profile has been approved.',
    timeAgo: '12 mins ago',
    isRead: false,
  },
  {
    id: 'notif-5',
    title: 'New Referral',
    message: 'QC PESO referred 5 students for the IT intern position',
    timeAgo: '12 mins ago',
    isRead: true,
  },
  {
    id: 'notif-6',
    title: 'New Referral',
    message: 'QC PESO referred 5 students for the IT intern position',
    timeAgo: '12 mins ago',
    isRead: true,
  },
]

const mockAttendanceRecords: EmployerAttendanceRecord[] = [
  { id: 'attendance-1', applicantId: 'app-2', studentName: 'John Doe', role: 'HR Intern', company: 'ABC Company', date: '2026-08-10', timeIn: '8:00 AM', timeOut: '5:00 PM', status: 'Present', hoursRendered: 8, requiredHours: 150 },
  { id: 'attendance-2', applicantId: 'app-2', studentName: 'John Doe', role: 'HR Intern', company: 'ABC Company', date: '2026-08-11', timeIn: '8:11 AM', timeOut: '5:00 PM', status: 'Late', hoursRendered: 7.8, requiredHours: 150 },
  { id: 'attendance-3', applicantId: 'app-2', studentName: 'John Doe', role: 'HR Intern', company: 'ABC Company', date: '2026-08-12', timeIn: '8:00 AM', timeOut: '5:00 PM', status: 'Present', hoursRendered: 8, requiredHours: 150 },
  { id: 'attendance-4', applicantId: 'app-2', studentName: 'John Doe', role: 'HR Intern', company: 'ABC Company', date: '2026-08-13', timeIn: '—', timeOut: '—', status: 'Absent', hoursRendered: 0, requiredHours: 150 },
  { id: 'attendance-5', applicantId: 'app-2', studentName: 'John Doe', role: 'HR Intern', company: 'ABC Company', date: '2026-08-14', timeIn: '8:00 AM', timeOut: '4:00 PM', status: 'Present', hoursRendered: 7, requiredHours: 150 },
  { id: 'attendance-6', applicantId: 'app-2', studentName: 'John Doe', role: 'HR Intern', company: 'ABC Company', date: '2026-08-16', timeIn: '8:00 AM', timeOut: '6:00 PM', status: 'Present', hoursRendered: 9, requiredHours: 150 },
]

const mockInternshipDetails: EmployerInternshipDetails[] = [
  { applicantId: 'app-2', studentName: 'John Doe', company: 'ABC Company', jobTitle: 'HR Intern', workingDays: 'Weekdays', requiredHours: 150, startDate: 'August 10, 2026', expectedEndDate: 'September 18, 2026', shiftStartTime: '8:00 AM', shiftEndTime: '5:00 PM', status: 'On Going', renderedHours: 32 },
  { applicantId: 'app-global-5', studentName: 'Student Name 5', company: 'ABC Company', jobTitle: 'IT Intern', workingDays: 'Weekdays', requiredHours: 200, startDate: 'August 5, 2026', expectedEndDate: 'September 12, 2026', shiftStartTime: '9:00 AM', shiftEndTime: '6:00 PM', status: 'On Going', renderedHours: 120 },
  { applicantId: 'app-global-6', studentName: 'Student Name 6', company: 'ABC Company', jobTitle: 'HR Intern', workingDays: 'Weekdays', requiredHours: 150, startDate: 'June 2, 2026', expectedEndDate: 'July 10, 2026', shiftStartTime: '8:00 AM', shiftEndTime: '5:00 PM', status: 'Completed', renderedHours: 150 },
  { applicantId: 'app-global-7', studentName: 'Student Name 7', company: 'ABC Company', jobTitle: 'Marketing Intern', workingDays: 'Flexible', requiredHours: 300, startDate: 'July 20, 2026', expectedEndDate: 'September 30, 2026', shiftStartTime: '9:00 AM', shiftEndTime: '6:00 PM', status: 'Awaiting Completion', renderedHours: 300 },
  { applicantId: 'app-global-8', studentName: 'Student Name 8', company: 'ABC Company', jobTitle: 'Finance Intern', workingDays: 'Weekdays', requiredHours: 250, startDate: 'July 8, 2026', expectedEndDate: 'August 30, 2026', shiftStartTime: '8:00 AM', shiftEndTime: '5:00 PM', status: 'Cancelled', renderedHours: 64 },
  { applicantId: 'app-global-9', studentName: 'Student Name 9', company: 'ABC Company', jobTitle: 'IT Intern', workingDays: 'Weekdays', requiredHours: 200, startDate: 'July 15, 2026', expectedEndDate: 'August 28, 2026', shiftStartTime: '9:00 AM', shiftEndTime: '6:00 PM', status: 'Withdrawn by Student', renderedHours: 56 },
]

const mockInternshipAssignments: InternshipAssignment[] = [
  { id: 'assignment-1', applicantId: 'app-2', studentName: 'John Doe', company: 'ABC Company', jobTitle: 'HR Intern', acceptanceDate: 'August 16, 2026', studentResponse: 'Pending Response', workingDays: 'Weekdays', requiredHours: 150, startDate: 'August 24, 2026', expectedEndDate: 'October 2, 2026', shiftStartTime: '8:00 AM', shiftEndTime: '5:00 PM' },
  { id: 'assignment-2', applicantId: 'app-global-5', studentName: 'Student Name 5', company: 'ABC Company', jobTitle: 'IT Intern', acceptanceDate: 'August 15, 2026', studentResponse: 'Accepted', workingDays: 'Weekdays', requiredHours: 200, startDate: 'August 22, 2026', expectedEndDate: 'September 18, 2026', shiftStartTime: '9:00 AM', shiftEndTime: '6:00 PM' },
  { id: 'assignment-3', applicantId: 'app-global-9', studentName: 'Student Name 9', company: 'ABC Company', jobTitle: 'IT Intern', acceptanceDate: 'August 13, 2026', studentResponse: 'Rejected', workingDays: 'Weekdays', requiredHours: 200, startDate: 'August 20, 2026', expectedEndDate: 'September 17, 2026', shiftStartTime: '9:00 AM', shiftEndTime: '6:00 PM' },
]

export const employerService = {
  getInternshipAssignments: async (): Promise<InternshipAssignment[]> => {
    return new Promise((resolve) => setTimeout(() => resolve([...mockInternshipAssignments]), 300))
  },

  getInternshipAssignmentById: async (id: string): Promise<InternshipAssignment | undefined> => {
    return new Promise((resolve) => setTimeout(() => resolve(mockInternshipAssignments.find((assignment) => assignment.id === id)), 300))
  },

  getAttendanceRecords: async (): Promise<EmployerAttendanceRecord[]> => {
    return new Promise((resolve) => setTimeout(() => resolve([...mockAttendanceRecords]), 300))
  },

  getInternshipDetails: async (applicantId: string): Promise<EmployerInternshipDetails | undefined> => {
    return new Promise((resolve) => setTimeout(() => resolve(mockInternshipDetails.find((item) => item.applicantId === applicantId)), 300))
  },

  getAllInternshipDetails: async (): Promise<EmployerInternshipDetails[]> => {
    return new Promise((resolve) => setTimeout(() => resolve([...mockInternshipDetails]), 300))
  },

  updateInternshipDetails: async (applicantId: string, updates: Partial<EmployerInternshipDetails>): Promise<EmployerInternshipDetails | undefined> => {
    return new Promise((resolve) => setTimeout(() => {
      const internship = mockInternshipDetails.find((item) => item.applicantId === applicantId)
      if (internship) Object.assign(internship, updates)
      resolve(internship ? { ...internship } : undefined)
    }, 300))
  },

  deleteInternshipDetails: async (applicantId: string): Promise<void> => {
    return new Promise((resolve) => setTimeout(() => {
      const index = mockInternshipDetails.findIndex((item) => item.applicantId === applicantId)
      if (index >= 0) mockInternshipDetails.splice(index, 1)
      resolve()
    }, 300))
  },

  getCompanyProfile: async (): Promise<CompanyProfile> => {
    return new Promise((resolve) => setTimeout(() => resolve({ ...mockCompanyProfile }), 300))
  },

  updateCompanyProfile: async (updated: Partial<CompanyProfile>): Promise<CompanyProfile> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        mockCompanyProfile = { ...mockCompanyProfile, ...updated }
        resolve({ ...mockCompanyProfile })
      }, 300)
    })
  },

  getOpportunities: async (): Promise<Opportunity[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        closeExpiredOpportunities()
        resolve(mockOpportunities.map(withApplicantCount))
      }, 300)
    })
  },

  getOpportunityById: async (id: string): Promise<Opportunity | undefined> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        closeExpiredOpportunities()
        const opportunity = mockOpportunities.find((item) => item.id === id)
        resolve(opportunity ? withApplicantCount(opportunity) : undefined)
      }, 300)
    })
  },

  saveOpportunity: async (opp: Opportunity): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const normalizedOpportunity: Opportunity = {
          ...opp,
          status: isOpportunityDeadlineExpired(opp.applicationDeadline) ? 'Closed' : opp.status,
        }
        const index = mockOpportunities.findIndex(o => o.id === normalizedOpportunity.id)
        if (index > -1) {
          mockOpportunities[index] = normalizedOpportunity
        } else {
          mockOpportunities.push({
            ...normalizedOpportunity,
            id: Math.random().toString(36).substr(2, 9),
            status: isOpportunityDeadlineExpired(normalizedOpportunity.applicationDeadline) ? 'Closed' : 'Open',
            applicants: 0,
          })
        }
        resolve()
      }, 300)
    })
  },

  deleteOpportunity: async (id: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = mockOpportunities.findIndex((o) => o.id === id)
        if (index > -1) mockOpportunities.splice(index, 1)
        resolve()
      }, 300)
    })
  },

  getAllApplicants: async (): Promise<Applicant[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...mockApplicantsList])
      }, 300)
    })
  },

  getApplicantById: async (id: string): Promise<Applicant | undefined> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockApplicantsList.find((applicant) => applicant.id === id))
      }, 300)
    })
  },

  updateApplicantStatus: async (id: string, status: Applicant['status'], rejectionRemark?: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const applicant = mockApplicantsList.find((item) => item.id === id)
        if (applicant) {
          applicant.status = status
          if (status === 'Rejected') {
            applicant.rejectionRemark = rejectionRemark?.trim() || undefined
          } else {
            delete applicant.rejectionRemark
          }
        }
        resolve()
      }, 300)
    })
  },

  getApplicantsForOpportunity: async (opportunityId: string): Promise<Applicant[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockApplicantsList.filter(app => app.opportunityId === opportunityId))
      }, 300)
    })
  },

  getDashboardSummary: async (): Promise<EmployerDashboardSummary> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const activeOpportunities = mockOpportunities.filter(o => o.status === 'Open').length
        const totalApplicants = mockApplicantsList.length
        const pendingReviews = mockApplicantsList.filter(a => ['Pending', 'For Review', 'Under Review', 'For Interview'].includes(a.status)).length
        const acceptedCount = mockApplicantsList.filter(a => a.status === 'Accepted').length
        const rejectedCount = mockApplicantsList.filter(a => a.status === 'Rejected').length

        const evaluatedTotal = acceptedCount + rejectedCount
        const acceptedPercentage = evaluatedTotal > 0 ? Math.round((acceptedCount / evaluatedTotal) * 100) : 40
        const rejectedPercentage = evaluatedTotal > 0 ? Math.round((rejectedCount / evaluatedTotal) * 100) : 60
        const acceptanceRate = totalApplicants > 0 ? Math.round((acceptedCount / totalApplicants) * 100) : 0

        resolve({
          companyName: mockCompanyProfile.company_name,
          activeOpportunities,
          totalApplicants,
          acceptedPercentage,
          rejectedPercentage,
          pendingReviews,
          acceptanceRate,
        })
      }, 300)
    })
  },

  getRecentApplicants: async (limit: number = 4): Promise<Applicant[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockApplicantsList.slice(0, limit))
      }, 300)
    })
  },

  getNotifications: async (): Promise<EmployerNotification[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...mockNotificationsList])
      }, 300)
    })
  },

  markAllNotificationsAsRead: async (): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        mockNotificationsList = mockNotificationsList.map((n) => ({ ...n, isRead: true }))
        resolve()
      }, 200)
    })
  },
}
