import type { ApplicationProgress, UserApplication } from '../types/application.types'

const submitted = (): ApplicationProgress => ({
  stage: 'Application Submission',
  state: 'completed',
  timestamp: 'July 20, 2026 11:15 am',
  message: 'You have submitted your application.',
})

const pendingStages = (): ApplicationProgress[] => [
  { stage: 'QC PESO Endorsement', state: 'pending', message: 'Your application is yet to be reviewed by QC PESO.' },
  { stage: 'Company Review', state: 'pending', message: 'Your application is yet to be reviewed by the company.' },
  { stage: 'Company Decision', state: 'pending', message: 'The company has yet to make their decision.' },
  { stage: 'Student Decision', state: 'pending', message: 'You are yet to make your decision.' },
]

export const MOCK_APPLICATIONS: UserApplication[] = [
  {
    id: 'app-1', companyName: 'Meta Company', position: 'Frontend Developer Intern', industry: 'Information Technology', location: 'Quezon City', status: 'Endorsed to Company', appliedDate: 'July 20, 2026',
    canWithdraw: true, canRespondToOffer: false, canHide: false,
    progress: [
      submitted(),
      { stage: 'QC PESO Endorsement', state: 'completed', timestamp: 'July 22, 2026 10:30 am', message: 'Your application has been endorsed by QC PESO.' },
      ...pendingStages().slice(1),
    ],
  },
  {
    id: 'app-2', companyName: 'Nexa Solutions', position: 'Business Analyst Intern', industry: 'Business Services', location: 'Pasig City', status: 'For Review (QC PESO)', appliedDate: 'July 20, 2026',
    canWithdraw: true, canRespondToOffer: false, canHide: false,
    progress: [submitted(), { stage: 'QC PESO Endorsement', state: 'current', message: 'Your application is under review by QC PESO.' }, ...pendingStages().slice(1)],
  },
  {
    id: 'app-3', companyName: 'CloudCore Systems', position: 'Software QA Intern', industry: 'Information Technology', location: 'Taguig City', status: 'Interview Scheduled', appliedDate: 'July 20, 2026',
    canWithdraw: true, canRespondToOffer: false, canHide: false,
    progress: [
      submitted(),
      { stage: 'QC PESO Endorsement', state: 'completed', timestamp: 'July 22, 2026 10:30 am', message: 'Your application has been endorsed by QC PESO.' },
      { stage: 'Company Review', state: 'interview-scheduled', timestamp: 'July 25, 2026 2:00 pm', message: 'The company has scheduled for an interview.', interview: { date: 'July 28, 2026', time: '10:00 AM', mode: 'online', meetingUrl: 'https://meet.example.com/cloudcore-interview', remark: 'Please prepare a short introduction and be ready to discuss your testing experience.' } },
      ...pendingStages().slice(2),
    ],
  },
  {
    id: 'app-4', companyName: 'PixelCraft Studio', position: 'Product Designer Intern', industry: 'Design and Technology', location: 'Makati City', status: 'Accepted', appliedDate: 'July 19, 2026',
    canWithdraw: true, canRespondToOffer: true, canHide: false,
    progress: [
      submitted(),
      { stage: 'QC PESO Endorsement', state: 'completed', timestamp: 'July 21, 2026 9:00 am', message: 'Your application has been endorsed by QC PESO.' },
      { stage: 'Company Review', state: 'completed', timestamp: 'July 24, 2026 3:00 pm', message: 'The company has made their final decision.' },
      { stage: 'Company Decision', state: 'completed', timestamp: 'July 24, 2026 3:00 pm', message: 'Your application has been accepted by the company.' },
      { stage: 'Student Decision', state: 'current', message: 'You are yet to make your decision.' },
    ],
  },
  {
    id: 'app-5', companyName: 'BrightPath Media', position: 'Marketing Intern', industry: 'Marketing and Media', location: 'Manila City', status: 'Rejected', appliedDate: 'July 18, 2026',
    canWithdraw: false, canRespondToOffer: false, canHide: true,
    progress: [
      submitted(),
      { stage: 'QC PESO Endorsement', state: 'rejected', timestamp: 'July 21, 2026 11:15 am', message: 'Your application has been rejected by QC PESO.', remark: 'Your submitted credentials are incomplete. Please upload the missing academic record before applying again.' },
      ...pendingStages().slice(1),
    ],
  },
  {
    id: 'app-6', companyName: 'CivicWorks PH', position: 'Administrative Intern', industry: 'Public Service', location: 'Mandaluyong City', status: 'Rejected', appliedDate: 'July 17, 2026',
    canWithdraw: false, canRespondToOffer: false, canHide: true,
    progress: [
      submitted(),
      { stage: 'QC PESO Endorsement', state: 'completed', timestamp: 'July 19, 2026 10:00 am', message: 'Your application has been endorsed by QC PESO.' },
      { stage: 'Company Review', state: 'completed', timestamp: 'July 23, 2026 1:30 pm', message: 'The company has made their final decision.' },
      { stage: 'Company Decision', state: 'rejected', timestamp: 'July 23, 2026 1:30 pm', message: 'Your application has been rejected by the company.', remark: 'The available administrative internship slots have been filled.' },
      { stage: 'Student Decision', state: 'pending', message: 'You are yet to make your decision.' },
    ],
  },
]
