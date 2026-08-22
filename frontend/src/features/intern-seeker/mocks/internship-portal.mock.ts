import type { InternshipPortalData, UserProfile, Resume } from '../types/internship.types'

const DEFAULT_DETAILS = {
  department: 'Information Technology',
  internshipDuration: '250 hours',
  numberOfSlots: 5,
  applicationDeadline: 'September 15, 2026',
  workplace: '123 Aurora Boulevard, Cubao, District 3, Quezon City',
  description: 'Support the development team by building and refining user-facing interfaces, collaborating with mentors, and contributing to real project deliverables.',
  qualifications: 'Currently enrolled in a relevant program, with a basic understanding of HTML, CSS, JavaScript, and responsive design. Strong communication, attention to detail, and willingness to learn are required.',
  allowance: 'Subject to employer policy',
}

export const MOCK_INTERNSHIP_PORTAL_DATA: InternshipPortalData = {
  opportunities: [
    {
      id: 'opp-1', companyId: 'company-1', companyName: 'Meta Company', position: 'Frontend Developer Intern', location: 'Quezon City', workSetup: 'On-site', postedAt: '1d', tags: ['Easy Apply', 'Multiple Candidates'], isApplied: false, isExclusive: true,
      details: DEFAULT_DETAILS,
    },
    {
      id: 'opp-2', companyId: 'company-2', companyName: 'PixelCraft Studio', position: 'Product Designer Intern', location: 'Makati City', workSetup: 'Hybrid', postedAt: '1d', tags: ['Easy Apply', 'Creative Role'], isApplied: false, isExclusive: false,
      details: { ...DEFAULT_DETAILS, department: 'Product Design', internshipDuration: '300 hours', numberOfSlots: 2, applicationDeadline: 'September 10, 2026', workplace: '225 Chino Roces Avenue, Legazpi Village, Makati City', allowance: '₱500 per day', description: 'Help the product design team create clear, accessible interfaces and support design research for active client projects.', qualifications: 'Currently enrolled in a design-related program or with a portfolio that demonstrates visual design skills. Familiarity with Figma and a willingness to accept feedback are required.' },
    },
    {
      id: 'opp-3', companyId: 'company-3', companyName: 'Nexa Solutions', position: 'Business Analyst Intern', location: 'Pasig City', workSetup: 'On-site', postedAt: '2d', tags: ['Multiple Candidates', 'Mentorship'], isApplied: true, isExclusive: false,
      details: { ...DEFAULT_DETAILS, department: 'Business Strategy', internshipDuration: '400 hours', numberOfSlots: 3, applicationDeadline: 'September 18, 2026', workplace: '9F Rockwell Business Center, Ortigas Avenue, Pasig City', allowance: '₱6,000 monthly', description: 'Assist business analysts in documenting processes, gathering requirements, and preparing insights for product and operations teams.', qualifications: 'Currently enrolled in business, management, information systems, or a related program. Strong analytical thinking, spreadsheet skills, and clear written communication are preferred.' },
    },
    {
      id: 'opp-4', companyId: 'company-4', companyName: 'BrightPath Media', position: 'Marketing Intern', location: 'Manila City', workSetup: 'Remote', postedAt: '2d', tags: ['Easy Apply', 'Remote'], isApplied: false, isExclusive: true,
      details: { ...DEFAULT_DETAILS, department: 'Marketing and Communications', internshipDuration: '250 hours', numberOfSlots: 4, applicationDeadline: 'September 20, 2026', workplace: 'BrightPath Media, 1890 Taft Avenue, Malate, Manila City', allowance: '₱4,500 monthly', description: 'Support campaign planning, social media content preparation, and performance reporting for local brand accounts.', qualifications: 'Currently enrolled in marketing, communications, multimedia, or a related program. Basic social media, copywriting, and organizational skills are required.' },
    },
    {
      id: 'opp-5', companyId: 'company-5', companyName: 'CloudCore Systems', position: 'Software QA Intern', location: 'Taguig City', workSetup: 'Hybrid', postedAt: '3d', tags: ['Training Provided', 'Multiple Candidates'], isApplied: false, isExclusive: false,
      details: { ...DEFAULT_DETAILS, department: 'Quality Assurance', internshipDuration: '320 hours', numberOfSlots: 3, applicationDeadline: 'September 12, 2026', workplace: '18F W Global Center, 30th Street, Bonifacio Global City, Taguig City', allowance: '₱550 per day', description: 'Help test web applications, document issues, and collaborate with developers to improve product quality.', qualifications: 'Currently enrolled in computer science, information technology, or a related program. Familiarity with software testing concepts and careful attention to detail are preferred.' },
    },
    {
      id: 'opp-6', companyId: 'company-6', companyName: 'CivicWorks PH', position: 'Administrative Intern', location: 'Mandaluyong City', workSetup: 'On-site', postedAt: '3d', tags: ['Easy Apply', 'Public Service'], isApplied: true, isExclusive: true,
      details: { ...DEFAULT_DETAILS, department: 'Administrative Services', internshipDuration: '250 hours', numberOfSlots: 6, applicationDeadline: 'September 25, 2026', workplace: 'Mandaluyong City Hall, Maysilo Circle, Mandaluyong City', allowance: 'Subject to government internship guidelines', description: 'Provide administrative support through records organization, client assistance, and coordination of daily office activities.', qualifications: 'Currently enrolled in public administration, office administration, business, or a related program. Professional communication and basic document-management skills are required.' },
    },
  ],
  companies: [
    { id: 'company-1', name: 'Meta Company', summary: 'Technology and digital services', description: 'Build practical experience with a collaborative technology team.', tags: ['On-site'] },
    { id: 'company-2', name: 'PixelCraft Studio', summary: 'Product design and creative services', description: 'Create accessible digital experiences with mentorship from product designers.', tags: ['Hybrid'] },
    { id: 'company-3', name: 'Nexa Solutions', summary: 'Business strategy and analytics', description: 'Support data-informed projects with a collaborative business team.', tags: ['On-site'] },
    { id: 'company-4', name: 'BrightPath Media', summary: 'Marketing and communications', description: 'Contribute to local brand campaigns through content and reporting work.', tags: ['Remote'] },
    { id: 'company-5', name: 'CloudCore Systems', summary: 'Cloud technology and quality assurance', description: 'Learn practical software testing with a structured engineering team.', tags: ['Hybrid'] },
    { id: 'company-6', name: 'CivicWorks PH', summary: 'Public service and administration', description: 'Support community-focused office operations and public-service initiatives.', tags: ['On-site'] },
  ],
}

export const MOCK_USER_PROFILE: UserProfile = {
  id: 'usr-123',
  firstName: 'Kyle Ethan',
  middleName: 'Candelario',
  lastName: 'Porciuncula',
  extensionName: '',
  role: 'UI/UX Designer',
  location: 'Quezon City, Philippines',
  email: 'flowforgestd@gmail.com',
  linkedinUrl: 'linkedin.com/in/kyle-porciuncula',
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
    schoolName: 'Polytechnic University of the Philippines',
    program: 'Bachelor of Science in Computer Science',
    yearLevel: '4th Year',
  },
  preferences: {
    requiredHours: 250,
    willingToAssignOutside: true,
    preferredIndustries: ['Information Technology', 'Other'],
    otherPreferredField: 'UI/UX Design',
    schedule: ['Weekdays'],
    startDate: '2026-09-01',
    hostOrgType: 'Government',
  }
}

export const MOCK_RESUMES: Resume[] = [
  { id: 'res-1', fileName: 'Filip Resume.Pdf', dateAdded: 'July 20, 2026', url: '#' }
]

