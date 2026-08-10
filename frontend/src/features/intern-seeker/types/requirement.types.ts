export type RequirementStatus = 'submitted' | 'pending'

export interface RequirementDocument {
  fileName: string
  mimeType: string
  size: number
  uploadedAt: string
  previewUrl?: string
}

export interface InternshipRequirement {
  id: string
  title: string
  description: string
  status: RequirementStatus
  recipientLines?: string[]
  document?: RequirementDocument
}

export interface RequirementUploadInput {
  requirementId: string
  file: File
}
