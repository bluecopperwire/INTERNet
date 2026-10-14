import { useEffect, useRef, useState } from 'react'
import { Camera, LockKeyhole, Mail, MapPin, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { EmployerHero } from '../../employer/components/EmployerHero'
import { districtAddressPart } from '../../../utils/district'
import { formatDateOnly } from '../../../utils/date-only'
import { getErrorMessage } from '../../../utils/error-message'
import { useToastStore } from '../../../stores/useToastStore'
import { adminProfileService } from '../services/admin-profile.service'
import type { AdminProfile } from '../types/admin-profile.types'
import styles from '../../qcpeso/pages/QCPesoProfilePage.module.css'

const address = (profile: AdminProfile) =>
  [
    profile.addressLine,
    profile.addressBarangay,
    districtAddressPart(profile.addressDistrict),
    profile.addressCity,
  ]
    .filter(Boolean)
    .join(', ')

export function AdminProfilePage() {
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const showError = useToastStore((state) => state.error)
  const showSuccess = useToastStore((state) => state.success)

  useEffect(() => {
    adminProfileService
      .getProfile()
      .then(setProfile)
      .catch((error: unknown) =>
        showError(getErrorMessage(error, 'Failed to load Admin profile.')),
      )
      .finally(() => setIsLoading(false))
  }, [showError])

  const uploadPicture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      showError('Profile picture must be JPEG, PNG, WebP, or GIF.')
      return
    }
    try {
      setProfile(await adminProfileService.uploadProfilePicture(file))
      showSuccess('Profile picture updated successfully!')
    } catch (error: unknown) {
      showError(getErrorMessage(error, 'Profile picture upload failed.'))
    }
  }

  if (isLoading) {
    return <main className={styles.pageContainer}><div className={styles.loading}>Loading Admin profile...</div></main>
  }
  if (!profile) return null

  const formattedAddress = address(profile)
  return (
    <main className={styles.pageContainer}>
      <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={styles.hiddenInput} onChange={uploadPicture} />
      <EmployerHero title="" subtitle="" comfortableSpacing={false} />

      <section className={styles.headerSection}>
        <div className={styles.headerContainer}>
          <div className={styles.profileMainInfo}>
            <button type="button" className={styles.avatarButton} onClick={() => fileInput.current?.click()} aria-label="Upload profile picture">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.fullName} className={styles.avatarImage} /> : <span className={styles.avatarPlaceholder}><UserRound size={68} /></span>}
              <span className={styles.cameraBadge}><Camera size={19} /></span>
              <span className={styles.avatarOverlay}><Camera size={22} /><span>Upload</span></span>
            </button>
            <div className={styles.profileMeta}>
              <h1>{profile.fullName}</h1>
              <span className={styles.contactLine}><MapPin size={16} />{formattedAddress || 'Address not provided'}</span>
              <span className={styles.contactLine}><Mail size={16} />{profile.contactEmail}</span>
            </div>
          </div>
          <button type="button" className={styles.editButton} onClick={() => navigate('/admin/profile/edit')}>Edit Profile</button>
        </div>
      </section>

      <div className={styles.mainContent}>
        <div className={styles.profileGrid}>
          <ProfileSection icon={<UserRound size={22} />} title="Personal Information">
            <DetailsList>
              <DetailItem label="Full Name" value={profile.fullName} />
              <DetailItem label="Address" value={formattedAddress} />
              <DetailItem label="Birthdate" value={formatDateOnly(profile.birthDate)} />
              <DetailItem label="Sex" value={profile.sex} />
            </DetailsList>
          </ProfileSection>

          <ProfileSection icon={<Mail size={22} />} title="Contact Information">
            <DetailsList>
              <DetailItem label="Email Address" value={profile.contactEmail} />
              <DetailItem label="Contact Number" value={profile.contactNumber} />
            </DetailsList>
          </ProfileSection>

          <ProfileSection icon={<LockKeyhole size={22} />} title="Account Information">
            <DetailsList>
              <DetailItem label="Account Email Address" value={profile.accountEmail} />
              <DetailItem label="Account User Code" value={profile.accountCode} />
            </DetailsList>
          </ProfileSection>
        </div>
      </div>
    </main>
  )
}

function ProfileSection({ children, icon, title }: { children: React.ReactNode; icon: React.ReactNode; title: string }) {
  return <section className={styles.card}><header className={styles.cardHeader}><span className={styles.iconCircle}>{icon}</span><h2>{title}</h2></header>{children}</section>
}

function DetailsList({ children }: { children: React.ReactNode }) {
  return <div className={styles.detailsList}>{children}</div>
}

function DetailItem({ label, value }: { label: string; value?: string }) {
  return <div className={styles.detailItem}><span>{label}</span><strong>{value || 'Not provided'}</strong></div>
}
