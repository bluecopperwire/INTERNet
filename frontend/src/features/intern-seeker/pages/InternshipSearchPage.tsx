import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useInternshipPortal } from '../hooks/useInternshipPortal'
import type { InternshipOpportunity } from '../types/internship.types'
import OpportunityDetail from '../components/OpportunityDetail'
import { InternshipPortalHero } from './InternshipPortalPage'
import styles from './InternshipSearchPage.module.css'

const FILTERS = ['Easy Apply', 'On-site', 'Remote', 'Hybrid', 'Not Applied', 'Exclusive Offer']

function InternshipSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const [inputQuery, setInputQuery] = useState(query)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [dateOrder, setDateOrder] = useState<'recent' | 'oldest'>('recent')
  const { data, isLoading, error, search } = useInternshipPortal()

  useEffect(() => {
    const timeout = window.setTimeout(() => void search({ query }), 250)
    return () => window.clearTimeout(timeout)
  }, [query, search])

  const results = useMemo(() => {
    return data.opportunities
      .filter((opportunity) =>
        activeFilters.every((filter) => {
          if (filter === 'Easy Apply') return opportunity.tags.includes('Easy Apply')
          if (filter === 'On-site' || filter === 'Remote' || filter === 'Hybrid') {
            return opportunity.workSetup === filter
          }
          if (filter === 'Not Applied') return !opportunity.isApplied
          if (filter === 'Exclusive Offer') return opportunity.isExclusive
          return true
        }),
      )
      .sort((first, second) => {
        const firstAge = Number.parseInt(first.postedAt, 10)
        const secondAge = Number.parseInt(second.postedAt, 10)
        return dateOrder === 'recent' ? firstAge - secondAge : secondAge - firstAge
      })
  }, [activeFilters, data.opportunities, dateOrder])

  const requestedOpportunityId = searchParams.get('opportunity')
  const selectedOpportunity =
    results.find((opportunity) => opportunity.id === requestedOpportunityId) ?? results[0]

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextQuery = inputQuery.trim()
    setSearchParams(nextQuery ? { q: nextQuery } : {})
  }

  const selectOpportunity = (opportunity: InternshipOpportunity) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('opportunity', opportunity.id)
    setSearchParams(nextParams)
  }

  const toggleFilter = (filter: string) => {
    setActiveFilters((current) =>
      current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter],
    )
  }

  return (
    <main className={styles.page}>
      <InternshipPortalHero />

      <section className={styles.searchArea} aria-label="Internship search results">
        <form className={styles.searchBar} onSubmit={submitSearch}>
          <label>
            <span className={styles.srOnly}>Search internships</span>
            <input value={inputQuery} onChange={(event) => setInputQuery(event.target.value)} placeholder="Search positions, companies, or locations" type="search" />
          </label>
          <button type="submit" aria-label="Search"><Search /></button>
        </form>

        <div className={styles.filters} aria-label="Search filters">
          <span className={styles.filterLabel}>Type</span>
          {FILTERS.map((filter) => (
            <button className={activeFilters.includes(filter) ? styles.activeFilter : ''} key={filter} type="button" aria-pressed={activeFilters.includes(filter)} onClick={() => toggleFilter(filter)}>{filter}</button>
          ))}
          <button type="button" onClick={() => setDateOrder((current) => current === 'recent' ? 'oldest' : 'recent')}>
            Date Posted: {dateOrder === 'recent' ? 'Recent' : 'Oldest'}
          </button>
        </div>

        {error && <p className={styles.feedback} role="alert">{error}</p>}
        {isLoading && <p className={styles.feedback}>Searching opportunities...</p>}

        {!isLoading && (
          <div className={styles.resultsLayout}>
            <aside className={styles.resultsList} aria-label={`${results.length} search results`}>
              {results.map((opportunity) => (
                <button className={`${styles.resultCard} ${selectedOpportunity?.id === opportunity.id ? styles.selectedResult : ''}`} key={opportunity.id} type="button" onClick={() => selectOpportunity(opportunity)}>
                  <span className={styles.resultCompany}><span className={styles.companyDot} />{opportunity.companyName}</span>
                  <strong>{opportunity.position}</strong>
                  <small>{opportunity.location} ({opportunity.workSetup})</small>
                  <span className={styles.resultFooter}><span>{opportunity.tags[0]}</span><time>{opportunity.postedAt}</time></span>
                </button>
              ))}
              {results.length === 0 && <p className={styles.noResults}>No opportunities match your search and filters.</p>}
            </aside>

            {selectedOpportunity && <OpportunityDetail opportunity={selectedOpportunity} />}
          </div>
        )}
      </section>
    </main>
  )
}

export default InternshipSearchPage
