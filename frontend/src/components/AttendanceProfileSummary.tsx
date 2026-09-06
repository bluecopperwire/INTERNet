import { Mail, MapPin, Phone, User } from 'lucide-react'
import { publicUploadUrl } from '../utils/public-upload-url'
import styles from '../features/intern-seeker/components/StudentInternshipDetails.module.css'

export interface AttendanceProfileSummaryData {
  studentFullName: string
  studentContactEmail?: string | null
  studentContactNumber?: string | null
  studentAddress?: string | null
  studentPhotoFilePath?: string | null
  studentProfileUpdatedAt?: string | null
  jobTitle: string
  companyName: string
}

export function AttendanceProfileSummary({ profile }: { profile: AttendanceProfileSummaryData }) {
  const profileImageUrl = publicUploadUrl(profile.studentPhotoFilePath, profile.studentProfileUpdatedAt)
  const email = displayValue(profile.studentContactEmail)
  const phone = displayValue(profile.studentContactNumber)

  return (
    <aside className={styles.profileSummary} aria-label="Intern profile summary">
      <div className={styles.profileIdentity}>
        <div className={styles.avatar}>
          {profileImageUrl ? <img src={profileImageUrl} alt={`${profile.studentFullName} profile`} /> : <User size={30} />}
        </div>
        <div className={styles.profileInfo}>
          <h2>{displayValue(profile.studentFullName)}</h2>
          <div className={styles.contactMeta}>
            {profile.studentContactEmail ? <a href={`mailto:${profile.studentContactEmail}`}><Mail size={14} />{email}</a> : <span><Mail size={14} />{email}</span>}
            {profile.studentContactNumber ? <a href={`tel:${profile.studentContactNumber}`}><Phone size={14} />{phone}</a> : <span><Phone size={14} />{phone}</span>}
          </div>
          <p><MapPin size={14} />{displayValue(profile.studentAddress)}</p>
        </div>
      </div>
      <div className={styles.profileDivider} />
      <div className={styles.internAs}>
        <span>INTERN AS</span>
        <h3>{displayValue(profile.jobTitle)}</h3>
        <p>{displayValue(profile.companyName)}</p>
      </div>
    </aside>
  )
}

function displayValue(value?: string | null): string {
  return value?.trim() || 'Not specified'
}
