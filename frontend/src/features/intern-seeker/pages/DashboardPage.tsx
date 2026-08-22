import React, { useRef, useState } from 'react'
import { Building2, Camera, GraduationCap, Mail, MapPin, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import headerImage from '../../../assets/requirements-header-image.png'
import { useInternshipPortal } from '../hooks/useInternshipPortal'
import styles from './DashboardPage.module.css'

const displayValue = (value: string | number | null | undefined) => value || 'Not provided'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { profile, isLoading } = useInternshipPortal()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  if (isLoading) return <div className={styles.loading}>Loading profile...</div>
  if (!profile) return <div className={styles.loading}>Unable to load profile.</div>

  const fullName = [profile.firstName, profile.middleName, profile.lastName, profile.extensionName]
    .filter((name) => name && name !== 'NA')
    .join(' ')
  const fullAddress = [profile.address.street, profile.address.barangay, profile.address.district && `District ${profile.address.district}`, profile.address.city]
    .filter(Boolean)
    .join(', ')

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) return
    setAvatarPreview(URL.createObjectURL(file))
  }

  return (
    <main className={styles.pageContainer}>
      <input ref={avatarInputRef} className={styles.fileInput} type="file" accept="image/png,image/jpeg" onChange={handleAvatarChange} />

      <header className={styles.hero}>
        <img className={styles.heroImage} src={headerImage} alt="" />
        <div className={styles.heroOverlay} />
      </header>

      <section className={styles.profileHeader}>
        <div className={styles.headerContent}>
          <div className={styles.profileIdentity}>
            <button className={styles.avatarButton} type="button" aria-label="Change profile photo" onClick={() => avatarInputRef.current?.click()}>
              {avatarPreview ? <span className={styles.avatarImage}><img src={avatarPreview} alt="" /></span> : <span className={styles.avatarPlaceholder}><UserRound aria-hidden="true" /></span>}
              <span className={styles.avatarOverlay}><Camera aria-hidden="true" /><span>Upload</span></span>
              <span className={styles.cameraBadge}><Camera aria-hidden="true" /></span>
            </button>
            <div className={styles.identityCopy}>
              <h1>{fullName}</h1>
              <div className={styles.contactDetails}>
                <span><MapPin aria-hidden="true" />{fullAddress}</span>
                <span><Mail aria-hidden="true" />{profile.email}</span>
              </div>
            </div>
          </div>
          <button className={styles.editButton} type="button" onClick={() => navigate('/intern-seeker/profile/edit')}>Edit Profile</button>
        </div>
      </section>

      <section className={styles.content} aria-label="Profile information">
        <ProfileCard icon={<UserRound />} title="Personal Information" items={[
          ['Full Name', fullName],
          ['Address', fullAddress],
          ['Birthdate', profile.birthdate],
          ['Sex', profile.sex],
        ]} />
        <ProfileCard icon={<Mail />} title="Contact Information" items={[
          ['Email Address', profile.email],
          ['Mobile Number', profile.contactNumber],
          ['LinkedIn', profile.linkedinUrl],
        ]} />
        <ProfileCard icon={<GraduationCap />} title="Current Academic Information" items={[
          ['School', profile.academic.schoolName],
          ['Program', profile.academic.program],
          ['Year Level', profile.academic.yearLevel],
        ]} />
        <ProfileCard icon={<Building2 />} title="Internship Preferences" items={[
          ['Internship Required Hours', profile.preferences.requiredHours ? `${profile.preferences.requiredHours} hours` : 'Not provided'],
          ['Preferred Host Organization Type', profile.preferences.hostOrgType],
          ['Internship Days Availability', profile.preferences.schedule.join(', ')],
          ['Internship Start Date Availability', profile.preferences.startDate],
          ['Preferred Field of Internship', profile.preferences.preferredIndustries.join(', ')],
          ['Willing to Be Assigned Outside Preferred Field', profile.preferences.willingToAssignOutside === null ? 'Not provided' : profile.preferences.willingToAssignOutside ? 'Yes' : 'No'],
        ]} />
      </section>
    </main>
  )
}

function ProfileCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: Array<[string, string | number]> }) {
  return (
    <article className={styles.profileCard}>
      <header className={styles.cardHeader}>
        <span className={styles.cardIcon}>{icon}</span>
        <h2>{title}</h2>
      </header>
      <dl className={styles.detailsList}>
        {items.map(([label, value]) => (
          <div className={styles.detailRow} key={label}>
            <dt>{label}</dt>
            <dd>{displayValue(value)}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}
