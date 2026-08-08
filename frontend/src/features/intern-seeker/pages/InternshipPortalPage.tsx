import { type FormEvent, useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Search,
  Star,
} from 'lucide-react'
import headerImage from '../../../assets/header-image.svg'
import qcLogos from '../../../assets/qc-logos.svg'
import { useNavigate } from 'react-router-dom'
import { useInternshipPortal } from '../hooks/useInternshipPortal'
import type { InternshipOpportunity, PartnerCompany } from '../types/internship.types'
import OpportunityDetail from '../components/OpportunityDetail'
import styles from './InternshipPortalPage.module.css'

const SLIDE_COUNT = 3

function InternshipPortalPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOpportunity, setSelectedOpportunity] = useState<InternshipOpportunity | null>(null)
  const opportunityGridRef = useRef<HTMLDivElement>(null)
  const companyRailRef = useRef<HTMLDivElement>(null)
  const { data, isLoading, error } = useInternshipPortal()
  const navigate = useNavigate()

  useEffect(() => {
    if (!selectedOpportunity) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedOpportunity(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [selectedOpportunity])

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = searchQuery.trim()
    if (query) navigate(`/intern-seeker/search?q=${encodeURIComponent(query)}`)
  }

  const scrollSection = (target: 'opportunities' | 'companies', direction: -1 | 1) => {
    const element = target === 'opportunities' ? opportunityGridRef.current : companyRailRef.current
    element?.scrollBy({ left: direction * Math.min(element.clientWidth * 0.8, 760), behavior: 'smooth' })
  }

  return (
    <main className={styles.page}>
      <InternshipPortalHero />

      <section className={styles.searchSection} aria-labelledby="internship-search-title">
        <h2 id="internship-search-title">Start Your Internship Journey</h2>
        <form className={styles.searchBar} onSubmit={submitSearch}>
          <label className={styles.combinedSearchField}>
            <span className={styles.srOnly}>Search by position, company, or location</span>
            <input
              type="search"
              placeholder="Search positions, companies, or locations"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <button type="submit" aria-label="Search opportunities">
            <Search aria-hidden="true" />
          </button>
        </form>
        {error && <p className={styles.statusMessage} role="alert">{error}</p>}
      </section>

      <section className={styles.opportunitySection} aria-labelledby="available-opportunities-title">
        <SectionHeading
          id="available-opportunities-title"
          title="Available Opportunities"
          onPrevious={() => scrollSection('opportunities', -1)}
          onNext={() => scrollSection('opportunities', 1)}
          light
        />
        <div className={styles.opportunityGrid} ref={opportunityGridRef}>
          {!isLoading && data.opportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} onSelect={setSelectedOpportunity} />
          ))}
        </div>
        {isLoading && <p className={styles.loadingMessage}>Loading opportunities...</p>}
        {!isLoading && data.opportunities.length === 0 && (
          <p className={styles.loadingMessage}>No opportunities match your search.</p>
        )}
      </section>

      <section className={styles.companySection} aria-labelledby="open-for-internship-title">
        <SectionHeading
          id="open-for-internship-title"
          title="Open For Internship"
          onPrevious={() => scrollSection('companies', -1)}
          onNext={() => scrollSection('companies', 1)}
        />
        <div className={styles.companyRail} ref={companyRailRef}>
          {data.companies.map((company) => <CompanyCard key={company.id} company={company} />)}
        </div>
      </section>

      {selectedOpportunity && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setSelectedOpportunity(null)}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-label={`${selectedOpportunity.position} details`} onMouseDown={(event) => event.stopPropagation()}>
            <OpportunityDetail opportunity={selectedOpportunity} />
          </section>
        </div>
      )}
    </main>
  )
}

export function InternshipPortalHero() {
  const [activeSlide, setActiveSlide] = useState(0)

  return (
    <header className={styles.hero} style={{ backgroundImage: `url(${headerImage})` }}>
      <div className={styles.heroCopy}>
        <div className={styles.welcomeLine}>
          <span>WELCOME TO</span>
          <img src={qcLogos} alt="Quezon City Government and QC PESO" />
        </div>
        <h1>INTERNet!</h1>
        <p>A Unified Work Immersion and Internship Platform<br />Integrated with Guided Digital CV Frameworks for<br />Quezon City</p>
      </div>
      <section className={styles.carousel} aria-label="Featured announcements">
        <div className={styles.blankSlide} aria-label={`Blank carousel slide ${activeSlide + 1} of ${SLIDE_COUNT}`} />
        <div className={styles.carouselControls}>
          <button type="button" onClick={() => setActiveSlide((activeSlide - 1 + SLIDE_COUNT) % SLIDE_COUNT)} aria-label="Previous slide"><ChevronUp /></button>
          <div className={styles.indicators} aria-label="Select carousel slide">
            {Array.from({ length: SLIDE_COUNT }, (_, index) => (
              <button className={index === activeSlide ? styles.activeIndicator : ''} key={index} type="button" aria-label={`Show slide ${index + 1}`} aria-current={index === activeSlide} onClick={() => setActiveSlide(index)} />
            ))}
          </div>
          <button type="button" onClick={() => setActiveSlide((activeSlide + 1) % SLIDE_COUNT)} aria-label="Next slide"><ChevronDown /></button>
        </div>
      </section>
      <div className={styles.seeMore} aria-hidden="true"><span>SEE MORE</span><ArrowDown /></div>
    </header>
  )
}

interface SectionHeadingProps {
  id: string
  title: string
  light?: boolean
  onPrevious: () => void
  onNext: () => void
}

function SectionHeading({ id, title, light = false, onPrevious, onNext }: SectionHeadingProps) {
  return (
    <div className={`${styles.sectionHeading} ${light ? styles.lightHeading : ''}`}>
      <h2 id={id}>{title}</h2>
      <div className={styles.sectionArrows}>
        <button type="button" onClick={onPrevious} aria-label={`Previous ${title}`}><ArrowLeft /></button>
        <button type="button" onClick={onNext} aria-label={`Next ${title}`}><ArrowRight /></button>
      </div>
    </div>
  )
}

function OpportunityCard({ opportunity, onSelect }: { opportunity: InternshipOpportunity; onSelect: (opportunity: InternshipOpportunity) => void }) {
  return (
    <button className={styles.opportunityCard} type="button" onClick={() => onSelect(opportunity)}>
      <div className={styles.cardCompanyRow}>
        <span className={styles.companyMark} aria-hidden="true" />
        <span>{opportunity.companyName}</span>
      </div>
      <h3>{opportunity.position}</h3>
      <p>{opportunity.location} ({opportunity.workSetup})</p>
      <div className={styles.cardFooter}>
        <div className={styles.tags}>{opportunity.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        <time>{opportunity.postedAt}</time>
      </div>
    </button>
  )
}

function CompanyCard({ company }: { company: PartnerCompany }) {
  return (
    <article className={styles.companyCard}>
      <span className={styles.companyLogoPlaceholder} aria-hidden="true" />
      <div className={styles.companyTitleRow}>
        <h3>{company.name}</h3>
        <span><Star aria-hidden="true" /> {company.rating}</span>
      </div>
      <p>{company.summary}</p>
      {company.isOpen && <strong>Open For Internship</strong>}
      <p>{company.description}</p>
      <div className={styles.tags}>{company.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
    </article>
  )
}

export default InternshipPortalPage
