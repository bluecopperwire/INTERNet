import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './LandingPage.module.css';
import heroPhoto from '../assets/landingpic.jpg';

interface LandingPageProps {
  isLoggedIn?: boolean;
}

// Inline SVGs for precise design matching without external libraries
const MenuIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
  </svg>
);

const SidebarToggleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h12M4 18h16" />
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const GridIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const UserOutlineIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const ArrowDownIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

const MapPinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const BookmarkIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </svg>
);

const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const StarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

export const LandingPage: React.FC<LandingPageProps> = ({ isLoggedIn = false }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const jobOffers = Array(6).fill({
    company: "Meta Company",
    title: "Product Designer",
    location: "Porto, Portugal (on Site)",
    tags: ["Easy Apply", "Multiple Candidate"],
    time: "1d"
  });

  const topCompanies = Array(4).fill({
    name: "Amazon Company",
    rating: "3.4",
    employees: "10.000 To 100.000 Employee",
    followers: "6.988.877 Followers",
    recommendation: "74% Recommendation Rate in Last 2 Years",
    tags: ["Hiring", "Confirmed Benefit"]
  });

  return (
    <main className={styles.pageContainer}>
      
      {/* Header with Sidebar Button */}
      <header className={styles.header}>
        <button 
          className={styles.menuBtn} 
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open sidebar"
        >
          <MenuIcon />
        </button>
      </header>

      {/* Sidebar Overlay & Menu */}
      <div 
        className={`${styles.sidebarOverlay} ${isSidebarOpen ? styles.open : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      />
      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
        
        {/* Sidebar Top Area */}
        <div className={styles.sidebarTop}>
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarBrandArea}>
              <div className={styles.sidebarLogoSquare}></div>
              <span className={styles.sidebarBrandText}>INTERNet</span>
            </div>
            <div className={styles.sidebarActions}>
              <button className={styles.iconBtn} aria-label="Notifications">
                <BellIcon />
              </button>
              <button className={styles.iconBtn} onClick={() => setIsSidebarOpen(false)} aria-label="Close sidebar">
                <SidebarToggleIcon />
              </button>
            </div>
          </div>

          <div className={styles.sidebarSearch}>
            <input type="text" placeholder="Search" className={styles.sidebarSearchInput} />
          </div>

          <nav className={styles.sidebarNav}>
            <Link to="/portal" className={`${styles.sidebarNavLink} ${styles.active}`}>
              <GridIcon /> Internship Portal
            </Link>
            <Link to="/profile" className={styles.sidebarNavLink}>
              <UserOutlineIcon /> User Profile
            </Link>
            <Link to="/cv" className={styles.sidebarNavLink}>
              <ShieldCheckIcon /> DigiCV
            </Link>
            <Link to="/requirements" className={styles.sidebarNavLink}>
              <BriefcaseIcon /> Requirements
            </Link>
          </nav>
        </div>

        {/* Sidebar Bottom Area */}
        <div className={styles.sidebarBottom}>
          <div className={styles.userProfileCard}>
            <img 
              src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=100&q=80" 
              alt="Kyle Ethan Porciuncula" 
              className={styles.userAvatar} 
            />
            <div className={styles.userInfo}>
              <span className={styles.userName}>Kyle Ethan Porciuncula</span>
              <span className={styles.userEmail}>flowforgestd@gmail.com</span>
            </div>
            <button className={styles.iconBtn} aria-label="External link">
              <ExternalLinkIcon />
            </button>
          </div>
          
          <button className={styles.logoutBtn}>
            <LogoutIcon /> Log out
          </button>
        </div>
        
      </aside>

      {/* Hero Section */}
      <section 
        className={styles.hero}
        style={{
          backgroundImage: `linear-gradient(to right, rgba(22, 14, 111, 0.8) 0%, rgba(22, 14, 111, 0.4) 50%, rgba(253, 209, 22, 0.2) 100%), url(${heroPhoto})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className={styles.heroContent}>
          <h2 className={styles.welcomeText}>WELCOME TO</h2>
          <h1 className={styles.heroTitle}>INTERNet!</h1>
          <p className={styles.heroSubtitle}>
            A Unified Work Immersion and Internship Platform<br />
            Integrated with Guided Digital CV Frameworks for<br />
            Quezon City
          </p>
        </div>
        
        <div className={styles.heroGalleryArea}>
          <div className={styles.singlePhotoBox}></div>
          <div className={styles.seeMoreIndicator}>
            <span className={styles.seeMoreText}>SEE MORE</span>
            <ArrowDownIcon />
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className={styles.searchSection}>
        <h2 className={styles.searchTitle}>Start Your Job Journey</h2>
        <div className={styles.searchBar}>
          <input 
            type="text" 
            placeholder="Junior / Intern Position" 
            className={styles.searchInput}
            aria-label="Search job title or position"
          />
          <div className={styles.searchDivider}></div>
          <div className={styles.searchIconWrapper}>
            <MapPinIcon />
          </div>
          <input 
            type="text" 
            placeholder="Location" 
            className={styles.searchInput}
            aria-label="Search location"
          />
          <button className={styles.searchBtn} aria-label="Search">
            <SearchIcon />
          </button>
        </div>
      </section>

      {/* Exclusive Offers */}
      <section className={styles.offersSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Exclusive Offers</h2>
          <div className={styles.navControls}>
            <button className={`${styles.controlBtn} ${styles.light}`} aria-label="Previous"><ChevronLeft /></button>
            <button className={`${styles.controlBtn} ${styles.light}`} aria-label="Next"><ChevronRight /></button>
          </div>
        </div>
        
        <div className={styles.cardsGrid}>
          {jobOffers.map((job, index) => (
            <article key={index} className={styles.jobCard}>
              <div className={styles.cardHeader}>
                <div className={styles.companyInfo}>
                  <div className={styles.logoCircle}></div>
                  <span className={styles.companyName}>{job.company}</span>
                </div>
                <button aria-label="Save job" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)' }}>
                  <BookmarkIcon />
                </button>
              </div>
              
              <h3 className={styles.jobTitle}>{job.title}</h3>
              <p className={styles.jobLocation}>{job.location}</p>
              
              <div className={styles.cardFooter}>
                <div className={styles.tags}>
                  {job.tags.map((tag: string, i: number) => (
                    <span key={i} className={styles.tag}>{tag}</span>
                  ))}
                </div>
                <span className={styles.timePosted}>{job.time}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Top Companies */}
      <section className={styles.companiesSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Top Companies</h2>
          <div className={styles.navControls}>
            <button className={`${styles.controlBtn} ${styles.dark}`} aria-label="Previous"><ChevronLeft /></button>
            <button className={`${styles.controlBtn} ${styles.light}`} aria-label="Next"><ChevronRight /></button>
          </div>
        </div>

        <div className={styles.companiesGrid}>
          {topCompanies.map((company, index) => (
            <article key={index} className={styles.companyCard}>
              <div className={styles.companyLogoLarge}></div>
              
              <div className={styles.companyTitleRow}>
                <h3>{company.name}</h3>
                <span className={styles.rating}>
                  <StarIcon /> {company.rating}
                </span>
              </div>
              
              <div className={styles.companyStats}>
                <span>{company.employees}</span>
                <span>{company.followers}</span>
                <span>{company.recommendation}</span>
              </div>

              <div className={styles.companyCardFooter}>
                <span className={styles.tag}>{company.tags[0]}</span>
                <span className={styles.tag}>{index === 0 ? "High Benefit" : company.tags[1]}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

    </main>
  );
};

export default LandingPage;