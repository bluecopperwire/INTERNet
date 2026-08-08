import type { InternshipPortalData, UserProfile, Resume, UserApplication } from '../types/internship.types'

const DEFAULT_DETAILS = {
  workplace: 'Quezon City',
  interviewProcess: 'Two stages including an HR conversation and a role-focused interview.',
  tools: ['Collaboration tools', 'Productivity software'],
  reportingTo: 'Internship Supervisor',
  team: 'A collaborative cross-functional team focused on meaningful local projects.',
  description: 'Build practical experience through guided work, mentorship, and real project responsibilities.',
  responsibilities: ['Support active team projects and documentation.', 'Collaborate with mentors and fellow interns.', 'Present progress and incorporate feedback.'],
  requirements: ['Currently enrolled in a relevant academic program.', 'Strong communication and collaboration skills.', 'Willingness to learn and work responsibly.'],
  benefits: ['Structured mentorship and practical training.', 'Flexible learning opportunities.', 'Certificate upon successful completion.'],
  allowance: 'Subject to employer policy',
  companySize: '100 to 500 employees',
  founded: '2010',
  companyType: 'Private',
  industry: 'Professional Services',
}

export const MOCK_INTERNSHIP_PORTAL_DATA: InternshipPortalData = {
  opportunities: [
    { id: 'opp-1', companyName: 'Meta Company', position: 'Frontend Developer Intern', location: 'Quezon City', workSetup: 'On-site', postedAt: '1d', tags: ['Easy Apply', 'Multiple Candidates'], isApplied: false, isExclusive: true, details: DEFAULT_DETAILS },
    { id: 'opp-2', companyName: 'PixelCraft Studio', position: 'Product Designer Intern', location: 'Cubao, Quezon City', workSetup: 'Hybrid', postedAt: '1d', tags: ['Easy Apply', 'Creative Role'], isApplied: false, isExclusive: false, details: { ...DEFAULT_DETAILS, tools: ['Figma', 'Miro'], industry: 'Design and Technology' } },
    { id: 'opp-3', companyName: 'Nexa Solutions', position: 'Business Analyst Intern', location: 'Eastwood City', workSetup: 'On-site', postedAt: '2d', tags: ['Multiple Candidates', 'Mentorship'], isApplied: true, isExclusive: false, details: DEFAULT_DETAILS },
    { id: 'opp-4', companyName: 'BrightPath Media', position: 'Marketing Intern', location: 'Quezon City', workSetup: 'Remote', postedAt: '2d', tags: ['Easy Apply', 'Remote'], isApplied: false, isExclusive: true, details: DEFAULT_DETAILS },
    { id: 'opp-5', companyName: 'CloudCore Systems', position: 'Software QA Intern', location: 'UP Technohub', workSetup: 'Hybrid', postedAt: '3d', tags: ['Training Provided', 'Multiple Candidates'], isApplied: false, isExclusive: false, details: DEFAULT_DETAILS },
    { id: 'opp-6', companyName: 'CivicWorks PH', position: 'Administrative Intern', location: 'Quezon City Hall', workSetup: 'On-site', postedAt: '3d', tags: ['Easy Apply', 'Public Service'], isApplied: true, isExclusive: true, details: DEFAULT_DETAILS },
  ],
  companies: [
    { id: 'company-1', name: 'Amazon Company', rating: 3.4, summary: 'Technology and digital services', description: 'Build practical experience with a collaborative technology team.', tags: ['Hiring', 'High Benefit'], isOpen: true },
    { id: 'company-2', name: 'Innovate Labs', rating: 4.7, summary: 'Product and software development', description: 'Work with mentors on products used by growing local businesses.', tags: ['Hiring', 'Confirmed Benefit'], isOpen: true },
    { id: 'company-3', name: 'Creative House', rating: 4.5, summary: 'Design and media production', description: 'Develop your portfolio through real creative campaigns and projects.', tags: ['Creative', 'Confirmed Benefit'], isOpen: true },
    { id: 'company-4', name: 'PeopleFirst Co.', rating: 4.6, summary: 'Human resources and operations', description: 'Learn modern people operations in a supportive professional setting.', tags: ['Hiring', 'Mentorship'], isOpen: true },
    { id: 'company-5', name: 'Greenline Group', rating: 4.3, summary: 'Sustainability and community programs', description: 'Support community-centered programs with measurable local impact.', tags: ['Community', 'High Benefit'], isOpen: true },
  ],
}

export const MOCK_USER_PROFILE: UserProfile = {
  id: 'usr-123',
  firstName: 'Kyle Ethan',
  middleName: 'Candelario',
  lastName: 'Porciuncula',
  extensionName: 'NA',
  role: 'UI/UX Designer',
  location: 'Quezon City, Philippines',
  email: 'flowforgestd@gmail.com',
  internshipStatus: 'Not Employed',
  sex: 'Male',
  birthdate: '2004-08-05',
  contactNumber: '09123456789',
  address: {
    street: '309 Katipunan Ave',
    barangay: 'Loyola Heights',
    district: '3',
    city: 'Quezon City',
  },
  inquiryVia: 'Walk-in',
  academic: {
    schoolName: '',
    program: '',
    yearLevel: '',
  },
  preferences: {
    requiredHours: '',
    willingToAssignOutside: null,
    preferredIndustries: [],
    schedule: [],
    startDate: '',
    hostOrgType: '',
  }
}

export const MOCK_RESUMES: Resume[] = [
  { id: 'res-1', fileName: 'Filip Resume.Pdf', dateAdded: 'July 20, 2026', url: '#' }
]

export const MOCK_APPLICATIONS: UserApplication[] = [
  {
    id: 'app-1',
    companyName: 'ABC Company',
    position: 'IT Intern',
    location: 'Quezon City',
    status: 'Applied',
    appliedDate: 'July 20, 2026 11:15 am',
    progress: [
      { stage: 'Application Submitted', status: 'Completed', timestamp: 'July 20, 2026 11:15 am' },
      { stage: 'For Review (QC PESO)', status: 'Completed', timestamp: 'July 22, 2026 10:30 am', notes: 'Your application has been reviewed by QC PESO' },
      { stage: 'Endorsed to Company', status: 'Completed', timestamp: 'July 22, 2026 1:30 pm', notes: 'Your application has been endorsed to company' },
      { stage: 'Company Review', status: 'Pending' },
      { stage: 'Final Decision', status: 'Pending' }
    ]
  },
  {
    id: 'app-2',
    companyName: 'Amazon Company',
    position: 'Product Designer',
    location: 'Porto, Portugal (On Site)',
    status: 'Applied',
    appliedDate: '1d',
    progress: [
      { stage: 'Application Submitted', status: 'Completed', timestamp: 'July 19, 2026 09:00 am' },
      { stage: 'For Review (QC PESO)', status: 'Pending' },
      { stage: 'Endorsed to Company', status: 'Pending' },
      { stage: 'Company Review', status: 'Pending' },
      { stage: 'Final Decision', status: 'Pending' }
    ]
  }
]
