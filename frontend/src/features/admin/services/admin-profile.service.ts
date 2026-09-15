import { api } from '../../../services/api'
import { normalizeDistrictOption } from '../../../utils/district'
import { publicUploadUrl } from '../../../utils/public-upload-url'
import { toDateOnly } from '../../../utils/date-only'
import type { AdminProfile } from '../types/admin-profile.types'

const adaptProfile = (raw: Record<string, any>): AdminProfile => {
  const firstName = raw.firstName || ''
  const middleName = raw.middleName || ''
  const lastName = raw.lastName || ''
  const extensionName = raw.extensionName || ''
  return {
    adminProfileId: Number(raw.adminProfileId),
    firstName,
    middleName,
    lastName,
    extensionName,
    fullName: [firstName, middleName, lastName, extensionName].filter(Boolean).join(' ') || 'Administrator',
    birthDate: toDateOnly(raw.birthDate),
    sex: raw.sex === 'female' ? 'Female' : raw.sex === 'male' ? 'Male' : '',
    addressLine: raw.addressLine || '',
    addressBarangay: raw.addressBarangay || '',
    addressDistrict: normalizeDistrictOption(raw.addressDistrict),
    addressCity: raw.addressCity || '',
    contactEmail: raw.contactEmail || '',
    contactNumber: raw.contactNumber || '',
    accountEmail: raw.accountEmail || '',
    accountCode: raw.accountCode || '',
    avatarUrl: publicUploadUrl(raw.photoFilePath, raw.updatedAt),
  }
}

const updatePayload = (profile: AdminProfile) => ({
  firstName: profile.firstName.trim(),
  middleName: profile.middleName.trim(),
  lastName: profile.lastName.trim(),
  extensionName: profile.extensionName.trim(),
  birthDate: profile.birthDate,
  sex: profile.sex.toLowerCase(),
  addressLine: profile.addressLine.trim(),
  addressBarangay: profile.addressBarangay.trim(),
  addressDistrict: profile.addressDistrict,
  addressCity: profile.addressCity.trim(),
  contactEmail: profile.contactEmail.trim(),
  contactNumber: profile.contactNumber.trim(),
})

export const adminProfileService = {
  async getProfile(): Promise<AdminProfile> {
    const response = await api.get<Record<string, any>>('/users/admin/profile')
    return adaptProfile(response.data)
  },

  async updateProfile(profile: AdminProfile): Promise<AdminProfile> {
    const response = await api.patch<Record<string, any>>(
      '/users/admin/profile',
      updatePayload(profile),
    )
    return adaptProfile(response.data)
  },

  async uploadProfilePicture(file: File): Promise<AdminProfile> {
    const body = new FormData()
    body.append('image', file)
    const response = await api.put<Record<string, any>>(
      '/users/admin/profile/image',
      body,
    )
    return adaptProfile(response.data)
  },
}
