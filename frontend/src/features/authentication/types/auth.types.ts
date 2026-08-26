import type {
  UserRole as BackendRole,
  AccountStatus,
  VerificationStatus,
} from '../../../types/api';

export type LoginTabRole = 'intern-seeker' | 'company' | 'qcpeso' | 'admin';

export interface SignUpData {
  role: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  middleName: string;
  lastName: string;
  extensionName: string;
  sex: string;
  birthDate: string;
  contactNumber: string;
  streetAddress: string;
  barangay: string;
  district: string;
  city: string;
  inquiryChannel: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface StudentRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
  sex: string;
  birthDate: string;
  contactNumber: string;
  contactEmail?: string;
  linkedinUrl?: string;
  addressLine: string;
  addressBarangay: string;
  addressDistrict: string;
  addressCity: string;
  inquiryMethod: string;
}

export interface PesoRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
  sex: string;
  birthDate: string;
  addressLine: string;
  addressBarangay: string;
  addressDistrict: string;
  addressCity: string;
  contactNumber: string;
  contactEmail?: string;
  employeeId: string;
  position: string;
  department: string;
  employeeIdFileName: string;
  employeeIdFileMimeType: string;
  employeeIdFileBase64: string;
}

export interface GoogleStudentCompletionRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
  sex: string;
  birthDate: string;
  contactNumber: string;
  addressLine: string;
  addressBarangay: string;
  addressDistrict: string;
  addressCity: string;
  inquiryMethod: string;
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  password: string;
}

export interface AuthState {
  status: 'anonymous' | 'bootstrapping' | 'authenticated' | 'error';
  user: {
    userAccountId: number;
    email: string;
    userRole: BackendRole;
    accountStatus: AccountStatus;
    verificationStatus: VerificationStatus | null;
    studentId: number | null;
    companyId: number | null;
    pesoPersonnelId: number | null;
  } | null;
  accessToken: string | null;
  error: string | null;
}
