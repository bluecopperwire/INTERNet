import type { Opportunity, Applicant } from '../types/employer.types';

const mockOpportunities: Opportunity[] = [
  { id: '1', title: 'IT Intern', department: 'IT Department', slots: 5, duration: 200, status: 'Active', applicants: 24 },
  { id: '2', title: 'HR Intern', department: 'Human Resources', slots: 2, duration: 150, status: 'Active', applicants: 10 },
  { id: '3', title: 'Marketing Intern', department: 'Marketing', slots: 3, duration: 300, status: 'Closed', applicants: 45 },
  { id: '4', title: 'Finance Intern', department: 'Finance', slots: 1, duration: 250, status: 'Active', applicants: 8 },
];

export const employerService = {
  getOpportunities: async (): Promise<Opportunity[]> => {
    return new Promise((resolve) => setTimeout(() => resolve([...mockOpportunities]), 500));
  },
  getOpportunityById: async (id: string): Promise<Opportunity | undefined> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockOpportunities.find(opp => opp.id === id))
      }, 500)
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
      }, 500)
    })
  },
  deleteOpportunity: async (id: string): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, 500));
  },
  getAllApplicants: async (): Promise<Applicant[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Generate mock applicants across multiple opportunities
        const mockApplicants: Applicant[] = Array(20).fill(null).map((_, i) => ({
          id: `app-global-${i}`,
          name: `Global Student ${i + 1}`,
          opportunityId: `opp-${(i % 3) + 1}`,
          opportunityTitle: `Opportunity ${(i % 3) + 1}`,
          course: i % 2 === 0 ? 'BS Information Technology' : 'BS Computer Science',
          yearLevel: `${(i % 4) + 1}rd Year`,
          dateApplied: '10/12/2023',
          status: i % 4 === 0 ? 'Shortlisted' : (i % 3 === 0 ? 'Rejected' : (i % 2 === 0 ? 'For Review' : 'Pending')),
          email: `student${i + 1}@gmail.com`,
          phone: `0923478234${i % 10}`,
          location: 'Quezon City, Philippines',
          school: 'Quezon City University',
          preferredField: 'Information Technology',
          requiredHours: 200,
          availabilityDate: 'July 27, 2026'
        }))
        resolve(mockApplicants)
      }, 500)
    })
  },
  getApplicantsForOpportunity: async (opportunityId: string): Promise<Applicant[]> => {
    // Generate some mock applicants based on the opportunityId
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockApplicants: Applicant[] = Array(12).fill(null).map((_, i) => ({
          id: `app-${opportunityId}-${i}`,
          name: `Student Name ${i + 1}`,
          opportunityId: opportunityId,
          opportunityTitle: `Opportunity ${opportunityId}`, // We'll just mock the title here, UI passes the real one if needed
          course: i % 2 === 0 ? 'BS Information Technology' : 'BS Computer Science',
          yearLevel: `${(i % 4) + 1}rd Year`,
          dateApplied: '10/12/2023',
          status: i % 3 === 0 ? 'Under Review' : 'Pending',
          email: `student${i + 1}@gmail.com`,
          phone: `0923478234${i % 10}`,
          location: 'Quezon City, Philippines',
          school: 'Quezon City University',
          preferredField: 'Information Technology',
          requiredHours: 200,
          availabilityDate: 'July 27, 2026'
        }))
        resolve(mockApplicants)
      }, 500)
    })
  }
};
