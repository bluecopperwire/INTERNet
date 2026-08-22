import React, { useState, useEffect, useRef } from 'react'
import {
  MapPin,
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  Calendar,
  Users,
  Camera,
  Tag,
} from 'lucide-react'
import { EmployerHero } from '../components/EmployerHero'
import { employerService } from '../services/employer.service'
import type { CompanyProfile } from '../types/employer.types'
import styles from './CompanyProfilePage.module.css'
import { useNavigate } from 'react-router-dom'

const formatAddress = (profile: CompanyProfile) => [
  profile.address_line,
  profile.address_barangay,
  profile.address_district,
  profile.address_city,
].filter(Boolean).join(', ')

const formatContactPerson = (profile: CompanyProfile) => [
  profile.contact_person_first_name,
  profile.contact_person_middle_name,
  profile.contact_person_last_name,
  profile.contact_person_extension_name,
].filter(Boolean).join(' ')

export function CompanyProfilePage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const fetchProfile = async () => {
    setIsLoading(true)
    try {
      const data = await employerService.getCompanyProfile()
      setProfile(data)
    } catch (error) {
      console.error('Failed to fetch company profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handlePfpClick = () => {
    fileInputRef.current?.click()
  }

  const handlePfpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const imageUrl = event.target?.result as string
        if (imageUrl && profile) {
          const updated = { ...profile, logoUrl: imageUrl }
          setProfile(updated)
          await employerService.updateCompanyProfile(updated)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  if (isLoading || !profile) {
    return (
      <main className={styles.pageContainer}>
        <div className={styles.loading}>Loading Company Profile...</div>
      </main>
    )
  }

  return (
    <main className={styles.pageContainer}>
      {/* Hidden file input for logo / PFP upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handlePfpChange}
      />

      {/* Top Hero Banner */}
      <EmployerHero
        title=""
        subtitle=""
        comfortableSpacing={false}
      />

      {/* White Header Section below Hero Banner */}
      <section className={styles.headerSection}>
        <div className={styles.headerContainer}>
          <div className={styles.companyMainInfo}>
            {/* PFP Avatar overlapping top hero banner, sitting in white header */}
            <div
              className={styles.pfpWrapper}
              onClick={handlePfpClick}
              title="Click to upload company logo/picture"
              role="button"
              tabIndex={0}
            >
              {profile.logoUrl ? (
                <img
                  src={profile.logoUrl}
                  alt={profile.company_name}
                  className={styles.pfpImage}
                />
              ) : (
                <div className={styles.pfpPlaceholder}>
                  <Building2 size={68} />
                </div>
              )}
              {/* Permanent camera badge icon at bottom right */}
              <div className={styles.cameraBadge}>
                <Camera size={18} />
              </div>
              <div className={styles.pfpOverlay}>
                <Camera size={22} />
                <span>Upload</span>
              </div>
            </div>

            {/* Company Meta text cleanly rendered inside white header */}
            <div className={styles.companyMeta}>
              <h1 className={styles.companyTitle}>{profile.company_name}</h1>
              <div className={styles.contactDetails}>
                <span><MapPin size={16} />{formatAddress(profile)}</span>
                <span><Mail size={16} />{profile.contact_email}</span>
              </div>
            </div>
          </div>

          <button
            className={styles.editProfileBtn}
            onClick={() => navigate('/employer/profile/edit')}
            type="button"
          >
            <span>Edit Profile</span>
          </button>
        </div>
      </section>

      {/* Main 2-Column Cards Section */}
      <div className={styles.mainContent}>
        <div className={styles.profileGrid}>
          <ProfileSection icon={<Building2 size={24} />} title="About Company">
            <p className={styles.aboutText}>{profile.description}</p>
          </ProfileSection>

          <ProfileSection icon={<Building2 size={24} />} title="Company Information">
            <div className={styles.detailsList}>
              <DetailItem icon={<Building2 size={20} />} label="Company Name" value={profile.company_name} />
              <DetailItem icon={<Tag size={20} />} label="Company Type" value={profile.company_type} />
              <DetailItem icon={<Tag size={20} />} label="Industry" value={profile.industry} />
              <DetailItem icon={<MapPin size={20} />} label="Company Address" value={formatAddress(profile)} />
              <DetailItem icon={<Users size={20} />} label="Company Size" value={profile.company_size ?? 'Not provided'} />
              <DetailItem icon={<Calendar size={20} />} label="Company Year Established" value={profile.year_established ?? 'Not provided'} />
              <DetailItem icon={<Globe size={20} />} label="Website URL" value={profile.website_url ?? 'Not provided'} />
            </div>
          </ProfileSection>

          <ProfileSection icon={<User size={24} />} title="Contact Information">
            <div className={styles.detailsList}>
              <DetailItem icon={<User size={20} />} label="Contact Person" value={formatContactPerson(profile)} />
              <DetailItem icon={<Mail size={20} />} label="Contact Email" value={profile.contact_email} />
              <DetailItem icon={<Phone size={20} />} label="Contact Number" value={profile.contact_number} />
            </div>
          </ProfileSection>
        </div>
      </div>

    </main>
  )
}

export default CompanyProfilePage

function ProfileSection({ children, icon, title }: { children: React.ReactNode; icon: React.ReactNode; title: string }) {
  return <section className={styles.card}><header className={styles.cardHeader}><span className={styles.iconCircle}>{icon}</span><h2 className={styles.cardTitle}>{title}</h2></header>{children}</section>
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className={styles.detailItem}><div className={styles.itemLabelGroup}><span className={styles.itemIcon}>{icon}</span><span className={styles.itemLabel}>{label}</span></div><span className={styles.itemValue}>{value}</span></div>
}
