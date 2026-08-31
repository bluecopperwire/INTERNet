import React, { useEffect, useRef, useState } from 'react'
import { Building2, Camera, Mail, MapPin, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { EmployerHero } from '../../employer/components/EmployerHero'
import { qcpesoService } from '../services/qcpeso.service'
import type { QCPesoProfile } from '../types/qcpeso.types'
import styles from './QCPesoProfilePage.module.css'
import { useToastStore } from '../../../stores/useToastStore'

const formatAddress = (profile: QCPesoProfile) =>
  [
    profile.addressLine,
    profile.barangay,
    profile.district && `District ${profile.district}`,
    profile.city,
  ]
    .filter(Boolean)
    .join(', ')

export function QCPesoProfilePage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<QCPesoProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToastStore()

  useEffect(() => {
    qcpesoService
      .getProfile()
      .then(setProfile)
      .finally(() => setIsLoading(false))
  }, [])

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !profile) return
    if (
      !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(
        file.type,
      )
    ) {
      toast.error('Profile picture must be JPEG, PNG, WebP, or GIF.')
      return
    }
    try {
      setProfile(await qcpesoService.uploadProfilePicture(file))
      toast.success('Profile picture updated successfully!')
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Profile picture upload failed.',
      )
    }
  }

  if (isLoading || !profile)
    return (
      <main className={styles.pageContainer}>
        <div className={styles.loading}>Loading QC PESO profile...</div>
      </main>
    )

  return (
    <main className={styles.pageContainer}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className={styles.hiddenInput}
        onChange={handleImageChange}
      />
      <EmployerHero title="" subtitle="" comfortableSpacing={false} />

      <section className={styles.headerSection}>
        <div className={styles.headerContainer}>
          <div className={styles.profileMainInfo}>
            <button
              type="button"
              className={styles.avatarButton}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload profile picture"
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  className={styles.avatarImage}
                />
              ) : (
                <span className={styles.avatarPlaceholder}>
                  <UserRound size={68} />
                </span>
              )}
              <span className={styles.cameraBadge}>
                <Camera size={19} />
              </span>
              <span className={styles.avatarOverlay}>
                <Camera size={22} />
                <span>Upload</span>
              </span>
            </button>
            <div className={styles.profileMeta}>
              <h1>{profile.fullName}</h1>
              <span className={styles.contactLine}>
                <MapPin size={16} />
                {formatAddress(profile)}
              </span>
              <span className={styles.contactLine}>
                <Mail size={16} />
                {profile.email}
              </span>
            </div>
          </div>
          <button
            type="button"
            className={styles.editButton}
            onClick={() => navigate('/qcpeso/profile/edit')}
          >
            Edit Profile
          </button>
        </div>
      </section>

      <div className={styles.mainContent}>
        <div className={styles.profileGrid}>
          <ProfileSection
            icon={<UserRound size={22} />}
            title="Personal Information"
          >
            <DetailsList>
              <DetailItem label="Full Name" value={profile.fullName} />
              <DetailItem label="Address" value={formatAddress(profile)} />
              <DetailItem
                label="Birthdate"
                value={new Date(
                  `${profile.birthdate}T00:00:00`,
                ).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              />
              <DetailItem label="Sex" value={profile.sex} />
            </DetailsList>
          </ProfileSection>

          <ProfileSection icon={<Mail size={22} />} title="Contact Information">
            <DetailsList>
              <DetailItem label="Email Address" value={profile.email} />
              <DetailItem label="Mobile Number" value={profile.mobileNumber} />
            </DetailsList>
          </ProfileSection>

          <ProfileSection
            icon={<Building2 size={22} />}
            title="Work Information"
            fullWidth
          >
            <DetailsList>
              <DetailItem
                label="Employee ID"
                value={profile.employeeIdNumber}
              />
              <DetailItem label="Department" value={profile.department} />
              <DetailItem label="Position" value={profile.position} />
            </DetailsList>
          </ProfileSection>
        </div>
      </div>
    </main>
  )
}

function ProfileSection({
  children,
  icon,
  title,
  fullWidth = false,
}: {
  children: React.ReactNode
  icon: React.ReactNode
  title: string
  fullWidth?: boolean
}) {
  return (
    <section
      className={`${styles.card} ${fullWidth ? styles.fullWidthCard : ''}`}
    >
      <header className={styles.cardHeader}>
        <span className={styles.iconCircle}>{icon}</span>
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  )
}

function DetailsList({ children }: { children: React.ReactNode }) {
  return <div className={styles.detailsList}>{children}</div>
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detailItem}>
      <span>{label}</span>
      <strong>{value || 'Not provided'}</strong>
    </div>
  )
}
