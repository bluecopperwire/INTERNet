import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './DashboardPage.module.css'
import { useInternshipPortal } from '../hooks/useInternshipPortal'
import { OnboardingModal } from '../components/OnboardingModal'
import { ApplicationTracker } from '../components/ApplicationTracker'
import { ProfileDetailsModal } from '../components/ProfileDetailsModal'
import type { UserApplication } from '../types/internship.types'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { profile, resumes, applications, isLoading } = useInternshipPortal()
  

  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [selectedApp, setSelectedApp] = useState<UserApplication | null>(null)
  const [activeTab, setActiveTab] = useState<'About' | 'Resume' | 'Recent Activities'>('About')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)


  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)


  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([])


  useEffect(() => {
    if (profile && !profile.academic?.schoolName) {
      setShowOnboarding(true)
    }
  }, [profile])

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    if (applications.length > 0 && bookmarkedIds.length === 0) {
      setBookmarkedIds([applications[0].id])
    }
  }, [applications])

  if (isLoading) return <div className={styles.loading}>Loading dashboard...</div>
  if (!profile) return <div className={styles.loading}>Error loading profile.</div>

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    avatarInputRef.current?.click()
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
      if (!validTypes.includes(file.type)) {
        alert('Please upload a valid PNG or JPG file only.')
        return
      }
      
      const imageUrl = URL.createObjectURL(file)
      setAvatarPreview(imageUrl)
      alert(`Profile photo "${file.name}" selected! (API integration pending)`)
    }
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  const handleAddMoreClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Please upload a valid PDF file.')
        return
      }
      alert(`File "${file.name}" selected for upload! (API integration pending)`)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setOpenMenuId(prev => (prev === id ? null : id))
  }

  const handleDeleteResume = (id: string) => {
    alert(`Resume with ID ${id} deleted! (API integration pending)`)
  }

  const toggleBookmark = (e: React.MouseEvent, appId: string) => {
    e.stopPropagation() 
    setBookmarkedIds(prev => 
      prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
    )
  }

  const EditIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
  )
  const ArrowRightCircle = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>
  )
  const BookmarkIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
  )
  const BookmarkOutlineIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
  )
  const FileIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
  )

  return (
    <div className={styles.pageWrapper}>
      <input 
        type="file" 
        accept=".pdf,application/pdf" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileChange} 
      />

      <input 
        type="file" 
        accept=".png,.jpg,.jpeg,image/png,image/jpeg" 
        ref={avatarInputRef} 
        style={{ display: 'none' }} 
        onChange={handleAvatarChange} 
      />

      <div className={styles.mainContainer}>
        

        <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} onStart={() => { setShowOnboarding(false); navigate('/intern-seeker/profile/edit') }} />
        <ApplicationTracker application={selectedApp} onClose={() => setSelectedApp(null)} />
        <ProfileDetailsModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} profile={profile} />


        <div className={styles.banner}>
          <button className={styles.editProfileBtn} onClick={() => navigate('/intern-seeker/profile/edit')}>
            Edit Profile <span className={styles.asterisk}>*</span>
          </button>
          
          <div className={styles.bannerContent}>
            <div className={styles.avatarContainer}>
              <div 
                className={styles.avatar}
                style={avatarPreview ? { backgroundImage: `url(${avatarPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              ></div>
              <div className={styles.avatarEditBadge} onClick={handleAvatarClick}>
                <EditIcon />
              </div>
            </div>
            <div className={styles.bannerInfo}>
              <h2>{profile.firstName} {profile.lastName}</h2>
              <p>{profile.role}</p>
              <p>{profile.location}</p>
            </div>
          </div>
        </div>

        <div className={styles.contentArea}>
          <div className={styles.tabsContainer}>
            <div className={styles.tabs}>
              <button className={`${styles.tab} ${activeTab === 'About' ? styles.active : ''}`} onClick={() => setActiveTab('About')}>About</button>
              <button className={`${styles.tab} ${activeTab === 'Resume' ? styles.active : ''}`} onClick={() => setActiveTab('Resume')}>Resume</button>
              <button className={`${styles.tab} ${activeTab === 'Recent Activities' ? styles.active : ''}`} onClick={() => setActiveTab('Recent Activities')}>Recent Activities</button>
            </div>
          </div>

          {activeTab === 'About' && (
            <section className={styles.sectionBlock}>
              <div className={styles.sectionHeader}>
                <h3>About <span className={styles.headerEditIcon} onClick={() => navigate('/intern-seeker/profile/edit')}><EditIcon /></span></h3>
                <p className={styles.subtitle}>Updating your information will offer you the most relevent content</p>
              </div>

              <div className={styles.aboutGrid}>
                <div className={styles.infoItem}>
                  <label>Internship Status <span className={styles.asterisk}>*</span></label>
                  <span>{profile.internshipStatus}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>Full Name <span className={styles.asterisk}>*</span></label>
                  <span>{profile.firstName === 'Kyle Ethan' ? 'Filip Maya' : `${profile.firstName} ${profile.lastName}`}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>Intern Position <span className={styles.asterisk}>*</span></label>
                  <span>{profile.role}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>Location <span className={styles.asterisk}>*</span></label>
                  <span>{profile.address?.city || 'Quezon City'}</span>
                </div>
              </div>

              <div className={styles.sectionFooter}>
                <button className={styles.showAllBtn} onClick={() => setShowProfileModal(true)}>
                  Show All Info <ArrowRightCircle />
                </button>
              </div>
            </section>
          )}

          {activeTab === 'Resume' && (
            <section className={styles.sectionBlock}>
              <div className={styles.sectionHeader}>
                <h3>Resume</h3>
              </div>
              
              <div className={styles.resumeList}>
                {resumes.length > 0 ? resumes.map((res, idx) => (
                  <div key={res.id || idx} className={styles.resumeCard}>
                    <div className={styles.resumeInfo}>
                      <div className={styles.resumeIcon}><FileIcon /></div>
                      <div className={styles.resumeText}>
                        <span className={styles.resumeName}>{res.fileName}</span>
                        <span className={styles.resumeDate}>{res.dateAdded || 'August 8, 2026'}</span>
                      </div>
                    </div>
                    
                    <div className={styles.resumeActionWrapper}>
                      <button 
                        className={styles.resumeActionBtn}
                        onClick={(e) => toggleMenu(res.id, e)}
                      >
                        •••
                      </button>
                      
                      {openMenuId === res.id && (
                        <div className={styles.resumeMenu}>
                          <button onClick={() => { handleAddMoreClick(); setOpenMenuId(null); }}>
                            Reupload
                          </button>
                          <button className={styles.deleteOption} onClick={() => { handleDeleteResume(res.id); setOpenMenuId(null); }}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )) : (
                  <p className={styles.emptyText}>No resumes uploaded yet.</p>
                )}
              </div>
              
              <button className={styles.addMoreBtn} onClick={handleAddMoreClick}>+ Add More</button>
            </section>
          )}

          {activeTab === 'Recent Activities' && (
            <section className={styles.sectionBlock}>
              <div className={styles.sectionHeader}>
                <h3>My Applications</h3>
              </div>
              
              <div className={styles.appGrid}>
                {(applications.length > 0 ? applications.slice(0, 3) : []).map((app: any, idx) => {
                  const companyName = app.companyName || 'Amazon Company'
                  const position = app.position || 'Product Designer'
                  const location = app.location || 'Porto, Portugal (On Site)'
                  const isBookmarked = bookmarkedIds.includes(app.id)

                  return (
                    <div key={app.id || idx} className={styles.appCard} onClick={() => app.id && setSelectedApp(app)}>
                      <div className={styles.appHeader}>
                        <div className={styles.companyMeta}>
                          <div className={styles.companyLogoPlaceholder}></div>
                          <span className={styles.companyName}>{companyName}</span>
                        </div>
                        <button 
                          className={styles.bookmarkWrapper} 
                          onClick={(e) => toggleBookmark(e, app.id)}
                          aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                        >
                          {isBookmarked ? <BookmarkIcon /> : <BookmarkOutlineIcon />}
                        </button>
                      </div>
                      
                      <div className={styles.appBody}>
                        <h4 className={styles.appPosition}>{position}</h4>
                        <p className={styles.appLocation}>{location}</p>
                      </div>
                      
                      <div className={styles.appFooter}>
                        <span className={styles.appliedBadge}>Applied</span>
                        <span className={styles.timeAgo}>1d</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className={styles.sectionFooter}>
                <hr className={styles.divider} />
                <button className={styles.showAllBtn}>
                  Show All Info <ArrowRightCircle />
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}