export type ApplicationStage =
  | 'Application Submitted'
  | 'For Review (QC PESO)'
  | 'Endorsed to Company'
  | 'Company Review'
  | 'Final Decision'

export type ApplicationDisplayStatus =
  | 'For Review (QC PESO)'
  | 'Endorsed to Company'
  | 'Under Review (Company)'
  | 'Accepted'
  | 'Rejected'

export interface ApplicationProgress {
  stage: ApplicationStage
  status: 'Completed' | 'Current' | 'Pending'
  timestamp?: string
  notes?: string
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
