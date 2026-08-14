import type { 
  Opportunity, 
  Applicant, 
  CompanyProfile, 
  EmployerDashboardSummary, 
  EmployerNotification 
} from '../types/employer.types'

const mockOpportunities: Opportunity[] = [
  { id: '1', title: 'IT Intern', department: 'IT Department', slots: 5, duration: 200, status: 'Active', applicants: 24 },
  { id: '2', title: 'HR Intern', department: 'Human Resources', slots: 2, duration: 150, status: 'Active', applicants: 10 },
  { id: '3', title: 'Marketing Intern', department: 'Marketing', slots: 3, duration: 300, status: 'Closed', applicants: 45 },
  { id: '4', title: 'Finance Intern', department: 'Finance', slots: 1, duration: 250, status: 'Active', applicants: 8 },
]

let mockCompanyProfile: CompanyProfile = {
  companyName: 'ABC Company',
  location: 'Quezon City, Philippines',
  industry: 'Information Technology',
  about: 'Short description here short description here short description here short description here',
  verified: true,
  verifiedBy: 'QC PESO',
  dateVerified: 'July 19, 2026',
  verificationId: 'QCP-2026-1234',
  contactPerson: 'Juan Dela Cruz',
  email: 'abccompany.hr@gmail.com',
  contactNumber: '(02)1234-5678',
  website: 'abc.company.com',
  yearEstablished: '2015',
  companySize: '51-200 employees',
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
    status: 'For Review',
    email: 'kyleporciuncula@gmail.com',
    phone: '09123456789',
    location: 'Quezon City, Philippines',
    school: 'Polytechnic University of the Philippines',
    preferredField: 'UI/UX Design',
    requiredHours: 200,
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
    availabilityDate: 'August 16, 2026',
  },
  ...Array(16).fill(null).map((_, i) => ({
    id: `app-global-${i + 5}`,
    name: `Student Name ${i + 5}`,
    opportunityId: `opp-${(i % 3) + 1}`,
    opportunityTitle: `Opportunity ${(i % 3) + 1}`,
    course: i % 2 === 0 ? 'BS Information Technology' : 'BS Computer Science',
    yearLevel: `${(i % 4) + 1}th Year`,
    dateApplied: 'August 08, 2026',
    status: (i % 4 === 0 ? 'Accepted' : (i % 3 === 0 ? 'Rejected' : (i % 2 === 0 ? 'For Review' : 'Pending'))) as Applicant['status'],
    email: `student${i + 5}@gmail.com`,
    phone: `0923478234${i % 10}`,
    location: 'Quezon City, Philippines',
    school: 'Quezon City University',
    preferredField: 'Information Technology',
    requiredHours: 200,
    availabilityDate: 'August 25, 2026',
  })),
]

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

export const employerService = {
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
    return new Promise((resolve) => setTimeout(() => resolve([...mockOpportunities]), 300))
  },

  getOpportunityById: async (id: string): Promise<Opportunity | undefined> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockOpportunities.find(opp => opp.id === id))
      }, 300)
    })
  },

  saveOpportunity: async (opp: Opportunity): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = mockOpportunities.findIndex(o => o.id === opp.id)
        if (index > -1) {
          mockOpportunities[index] = opp
        } else {
          mockOpportunities.push({ ...opp, id: Math.random().toString(36).substr(2, 9), status: 'Active', applicants: 0 })
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
        const activeOpportunities = mockOpportunities.filter(o => o.status === 'Active').length
        const totalApplicants = mockApplicantsList.length
        const pendingReviews = mockApplicantsList.filter(a => ['Pending', 'For Review', 'Under Review'].includes(a.status)).length
        const acceptedCount = mockApplicantsList.filter(a => a.status === 'Accepted').length
        const rejectedCount = mockApplicantsList.filter(a => a.status === 'Rejected').length

        const evaluatedTotal = acceptedCount + rejectedCount
        const acceptedPercentage = evaluatedTotal > 0 ? Math.round((acceptedCount / evaluatedTotal) * 100) : 40
        const rejectedPercentage = evaluatedTotal > 0 ? Math.round((rejectedCount / evaluatedTotal) * 100) : 60
        const acceptanceRate = totalApplicants > 0 ? Math.round((acceptedCount / totalApplicants) * 100) : 0

        resolve({
          companyName: mockCompanyProfile.companyName,
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