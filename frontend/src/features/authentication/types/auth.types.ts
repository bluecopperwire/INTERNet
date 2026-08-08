export type UserRole = 'intern-seeker' | 'company' | 'qcpeso'

export interface LoginCredentials {
  email: string
  password: string
  rememberMe: boolean
  role: UserRole
}

export type SignUpRole = Extract<UserRole, 'intern-seeker' | 'qcpeso'>

export interface SignUpData {
  role: SignUpRole
  email: string
  password: string
  confirmPassword: string
  firstName: string
  middleName: string
  lastName: string
  extensionName: string
  sex: string
  birthDate: string
  contactNumber: string
  streetAddress: string
  barangay: string
  district: string
  city: string
  inquiryChannel: string
  employeeIdNumber: string
  position: string
  department: string
  employeeIdFile: File | null
}
