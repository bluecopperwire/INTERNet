export type ReferralStatus = 'Under Review' | 'Endorsed to Employer' | 'Approved' | 'Rejected' | 'Pending'

export type InternStatus = 'Ongoing' | 'Completed' | 'Paused' | 'For Placement'

export interface DTRLog {
  id: string
  date: string
  timeIn: string
  timeOut: string
  hoursRendered: number
  status: 'Present' | 'Late' | 'Absent'
  remarks?: string
}

export interface ReferralItem {
  id: string
  studentName: string
  email: string
  phone: string
  targetEmployer: string
  position: string
  dateForwarded: string
  status: ReferralStatus
  submittedDocuments: string[]
  course?: string
  school?: string
  notes?: string
}

export interface InternItem {
  id: string
  studentName: string
  email: string
  phone: string
  matchedEmployer: string
  acceptedRole: string
  dateOfPlacement: string
  status: InternStatus
  submittedDocuments: string[]
  renderedHours: number
  targetHours: number
  dtrLogs: DTRLog[]
  course?: string
  school?: string
}

export interface PaginationState {
  currentPage: number
  itemsPerPage: number
  totalItems: number
}
