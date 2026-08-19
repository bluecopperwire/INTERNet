import React, { useState, useEffect, useRef } from 'react'
import {
  MapPin,
  Building2,
  ShieldCheck,
  CheckCircle2,
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
import { EditCompanyProfileModal } from '../components/EditCompanyProfileModal'
import { employerService } from '../services/employer.service'
import type { CompanyProfile } from '../types/employer.types'
import styles from './CompanyProfilePage.module.css'

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleSaveProfile = async (updated: CompanyProfile) => {
    try {
      const saved = await employerService.updateCompanyProfile(updated)
      setProfile(saved)
      setIsEditModalOpen(false)
    } catch (error) {
      console.error('Failed to update company profile:', error)
      alert('Failed to update profile.')
    }
  }

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
              <p className={styles.industryText}>{profile.company_type}</p>
              <div className={styles.locationText}>
                <MapPin size={16} />
                <span>{formatAddress(profile)}</span>
              </div>
            </div>
          </div>

          <button
            className={styles.editProfileBtn}
            onClick={() => setIsEditModalOpen(true)}
            type="button"
          >
            <span>Edit Profile*</span>
          </button>
        </div>
      </section>

      {/* Main 2-Column Cards Section */}
      <div className={styles.mainContent}>
        <div className={styles.profileGrid}>
          {/* Left Column: About & Verification */}
          <div className={styles.leftColumn}>
            {/* About Company Card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.iconCircle}>
                  <Building2 size={24} />
                </div>
                <h2 className={styles.cardTitle}>About Company</h2>
              </div>
              <p className={styles.aboutText}>{profile.description}</p>
            </div>

            {/* Company Verification Card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.iconCircle}>
                  <ShieldCheck size={24} />
                </div>
                <h2 className={styles.cardTitle}>Company Verification</h2>
              </div>

              <div className={styles.verificationBanner}>
                <div className={styles.verificationBannerText}>
                  <span className={styles.bannerTitle}>
                    Verified Partner Company
                  </span>
                  <span className={styles.bannerSubtitle}>
                    Your company has been verified by QC PESO
                  </span>
                </div>
                <div className={styles.verificationIcon}>
                  <CheckCircle2 size={32} color="#22c55e" />
                </div>
              </div>

              <div className={styles.verificationDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Verified by</span>
                  <span className={styles.detailValue}>{profile.verifiedBy ?? 'QC PESO'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Date Verified</span>
                  <span className={styles.detailValue}>
                    {profile.dateVerified ?? 'Not provided'}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Verification ID</span>
                  <span className={styles.detailValue}>
                    {profile.verificationId ?? 'Not provided'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Company Details */}
          <div className={styles.rightColumn}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.iconCircle}>
                  <Building2 size={24} />
                </div>
                <h2 className={styles.cardTitle}>Company Details</h2>
              </div>

              <div className={styles.detailsList}>
                <div className={styles.detailItem}>
                  <div className={styles.itemLabelGroup}>
                    <span className={styles.itemIcon}>
                      <Tag size={20} />
                    </span>
                    <span className={styles.itemLabel}>Company Type</span>
                  </div>
                  <span className={styles.itemValue}>{profile.company_type}</span>
                </div>

                <div className={styles.detailItem}>
                  <div className={styles.itemLabelGroup}>
                    <span className={styles.itemIcon}>
                      <MapPin size={20} />
                    </span>
                    <span className={styles.itemLabel}>Location</span>
                  </div>
                  <span className={styles.itemValue}>{formatAddress(profile)}</span>
                </div>

                <div className={styles.detailItem}>
                  <div className={styles.itemLabelGroup}>
                    <span className={styles.itemIcon}>
                      <User size={20} />
                    </span>
                    <span className={styles.itemLabel}>Contact Person</span>
                  </div>
                  <span className={styles.itemValue}>
                    {formatContactPerson(profile)}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <div className={styles.itemLabelGroup}>
                    <span className={styles.itemIcon}>
                      <Mail size={20} />
                    </span>
                    <span className={styles.itemLabel}>Email</span>
                  </div>
                  <span className={styles.itemValue}>{profile.contact_email}</span>
                </div>

                <div className={styles.detailItem}>
                  <div className={styles.itemLabelGroup}>
                    <span className={styles.itemIcon}>
                      <Phone size={20} />
                    </span>
                    <span className={styles.itemLabel}>Contact Number</span>
                  </div>
                  <span className={styles.itemValue}>
                    {profile.contact_number}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <div className={styles.itemLabelGroup}>
                    <span className={styles.itemIcon}>
                      <Globe size={20} />
                    </span>
                    <span className={styles.itemLabel}>Company Website</span>
                  </div>
                  <span className={styles.itemValue}>{profile.website_url ?? 'Not provided'}</span>
                </div>

                <div className={styles.detailItem}>
                  <div className={styles.itemLabelGroup}>
                    <span className={styles.itemIcon}>
                      <Calendar size={20} />
                    </span>
                    <span className={styles.itemLabel}>Year Established</span>
                  </div>
                  <span className={styles.itemValue}>
                    {profile.year_established ?? 'Not provided'}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <div className={styles.itemLabelGroup}>
                    <span className={styles.itemIcon}>
                      <Users size={20} />
                    </span>
                    <span className={styles.itemLabel}>Company Size</span>
                  </div>
                  <span className={styles.itemValue}>{profile.company_size ?? 'Not provided'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <EditCompanyProfileModal
          profile={profile}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveProfile}
        />
      )}
    </main>
  )
}

export default CompanyProfilePage
