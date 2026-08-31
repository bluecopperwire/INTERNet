export const SIGNUP_SEX_OPTIONS = ['Female', 'Male'] as const

export const SIGNUP_INQUIRY_OPTIONS = [
  'Walk in',
  'Email/ Online',
  'Phone Call',
  'School',
] as const

export type StudentSex = 'female' | 'male'
export type StudentInquiryMethod = 'walk_in' | 'online' | 'phone_call' | 'school'

const sexValues: Record<string, StudentSex> = {
  Female: 'female',
  Male: 'male',
}

const inquiryValues: Record<string, StudentInquiryMethod> = {
  'Walk in': 'walk_in',
  'Email/ Online': 'online',
  'Phone Call': 'phone_call',
  School: 'school',
}

export function toStudentSex(value: string): StudentSex | undefined {
  return sexValues[value]
}

export function toStudentInquiryMethod(value: string): StudentInquiryMethod | undefined {
  return inquiryValues[value]
}
