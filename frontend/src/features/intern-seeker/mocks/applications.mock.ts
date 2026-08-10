import type { UserApplication } from '../types/application.types'

const baseProgress = () => [
  { stage: 'Application Submitted' as const, status: 'Completed' as const, timestamp: 'July 20, 2026 11:15 am' },
  { stage: 'For Review (QC PESO)' as const, status: 'Completed' as const, timestamp: 'July 22, 2026 10:30 am', notes: 'Your application has been reviewed by QC PESO.' },
  { stage: 'Endorsed to Company' as const, status: 'Current' as const, timestamp: 'July 22, 2026 1:30 pm', notes: 'Your application has been endorsed to the company.' },
  { stage: 'Company Review' as const, status: 'Pending' as const },
  { stage: 'Final Decision' as const, status: 'Pending' as const },
]

export const MOCK_APPLICATIONS: UserApplication[] = [
  { id: 'app-1', companyName: 'ABC Company', position: 'IT Intern', industry: 'Information Technology', location: 'Quezon City', status: 'Endorsed to Company', appliedDate: 'July 20, 2026', progress: baseProgress() },
  { id: 'app-2', companyName: 'Nexa Solutions', position: 'Business Analyst Intern', industry: 'Business Services', location: 'Eastwood City', status: 'For Review (QC PESO)', appliedDate: 'July 20, 2026', progress: baseProgress().map((step, index) => index === 1 ? { ...step, status: 'Current' as const } : index > 1 ? { ...step, status: 'Pending' as const, timestamp: undefined, notes: undefined } : step) },
  { id: 'app-3', companyName: 'CloudCore Systems', position: 'Software QA Intern', industry: 'Information Technology', location: 'UP Technohub', status: 'Under Review (Company)', appliedDate: 'July 20, 2026', progress: baseProgress().map((step, index) => index === 2 ? { ...step, status: 'Completed' as const } : index === 3 ? { ...step, status: 'Current' as const, timestamp: 'July 23, 2026 9:00 am', notes: 'The company is reviewing your application.' } : step) },
  { id: 'app-4', companyName: 'PixelCraft Studio', position: 'Product Designer Intern', industry: 'Design and Technology', location: 'Cubao, Quezon City', status: 'Accepted', appliedDate: 'July 19, 2026', progress: baseProgress().map((step) => ({ ...step, status: 'Completed' as const, timestamp: step.timestamp ?? 'July 25, 2026 3:00 pm' })) },
  { id: 'app-5', companyName: 'BrightPath Media', position: 'Marketing Intern', industry: 'Marketing and Media', location: 'Quezon City', status: 'Rejected', appliedDate: 'July 18, 2026', progress: baseProgress().map((step) => ({ ...step, status: 'Completed' as const, timestamp: step.timestamp ?? 'July 24, 2026 2:15 pm' })) },
  { id: 'app-6', companyName: 'CivicWorks PH', position: 'Administrative Intern', industry: 'Public Service', location: 'Quezon City Hall', status: 'For Review (QC PESO)', appliedDate: 'July 17, 2026', progress: baseProgress().map((step, index) => index === 1 ? { ...step, status: 'Current' as const } : index > 1 ? { ...step, status: 'Pending' as const, timestamp: undefined, notes: undefined } : step) },
]
