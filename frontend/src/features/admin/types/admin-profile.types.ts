export interface AdminProfile {
  adminProfileId: number
  firstName: string
  middleName: string
  lastName: string
  extensionName: string
  fullName: string
  birthDate: string
  sex: '' | 'Male' | 'Female'
  addressLine: string
  addressBarangay: string
  addressDistrict: string
  addressCity: string
  contactEmail: string
  contactNumber: string
  accountEmail: string
  accountCode: string
  avatarUrl?: string
}
