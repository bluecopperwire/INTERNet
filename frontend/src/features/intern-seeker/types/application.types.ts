export type ApplicationStage =
  | 'Application Submission'
  | 'QC PESO Endorsement'
  | 'Company Review'
  | 'Company Decision'
  | 'Student Decision'

export type ApplicationProgressState =
  | 'completed'
  | 'current'
  | 'pending'
  | 'rejected'
  | 'interview-scheduled'
  | 'withdrawn'

export type ApplicationDisplayStatus =
  | 'For Review (QC PESO)'
  | 'Endorsed to Company'
  | 'Under Review (Company)'
  | 'Interview Scheduled'
  | 'Accepted'
  | 'Rejected'
  | 'Withdrawn'

export interface InterviewDetails {
  date: string
  time: string
  mode: 'online' | 'in-person'
  meetingUrl?: string
  location?: string
  remark?: string
}

export interface ApplicationProgress {
  stage: ApplicationStage
  state: ApplicationProgressState
  message: string
  timestamp?: string
  remark?: string
  interview?: InterviewDetails
}

export interface UserApplication {
  id: string
  companyName: string
  position: string
  industry: string
  location: string
  status: ApplicationDisplayStatus
  appliedDate: string
  progress: ApplicationProgress[]
}
