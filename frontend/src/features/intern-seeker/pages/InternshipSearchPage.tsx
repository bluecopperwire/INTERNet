import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useInternshipPortal } from '../hooks/useInternshipPortal'
import type { InternshipOpportunity } from '../types/internship.types'
import OpportunityDetail from '../components/OpportunityDetail'
import { InternshipPortalHero } from './InternshipPortalPage'
import styles from './InternshipSearchPage.module.css'

const WORK_ARRANGEMENT_FILTERS = ['On-site', 'Remote', 'Hybrid']

function InternshipSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const companyId = searchParams.get('company') ?? undefined
  const [inputQuery, setInputQuery] = useState(query)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [dateOrder, setDateOrder] = useState<'recent' | 'oldest'>('recent')
  const [withAllowanceOnly, setWithAllowanceOnly] = useState(false)
  const { data, isLoading, error, search } = useInternshipPortal()

  useEffect(() => {
    const timeout = window.setTimeout(() => void search({ query, companyId }), 250)
    return () => window.clearTimeout(timeout)
  }, [companyId, query, search])

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return data.opportunities
      .filter((opportunity) => !companyId || opportunity.companyId === companyId)
      .filter((opportunity) => !normalizedQuery || [
        opportunity.position,
        opportunity.companyName,
        opportunity.location,
      ].some((value) => value.toLowerCase().startsWith(normalizedQuery)))
      .filter((opportunity) =>
        activeFilters.every((filter) => {
          return opportunity.workSetup === filter
        }),
      )
      .filter((opportunity) => !withAllowanceOnly || hasAllowance(opportunity.details.allowance))
      .sort((first, second) => {
        const firstAge = Number.parseInt(first.postedAt, 10)
        const secondAge = Number.parseInt(second.postedAt, 10)
        return dateOrder === 'recent' ? firstAge - secondAge : secondAge - firstAge
      })
  }, [activeFilters, companyId, data.opportunities, dateOrder, query, withAllowanceOnly])

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
    setActiveFilters((current) => current.includes(filter) ? [] : [filter])
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
          <span className={styles.filterLabel}>Filters:</span>
          {WORK_ARRANGEMENT_FILTERS.map((filter) => (
            <button className={activeFilters.includes(filter) ? styles.activeFilter : ''} key={filter} type="button" aria-pressed={activeFilters.includes(filter)} onClick={() => toggleFilter(filter)}>{filter}</button>
          ))}
          <button type="button" onClick={() => setDateOrder((current) => current === 'recent' ? 'oldest' : 'recent')}>
            Date Posted: {dateOrder === 'recent' ? 'Recent' : 'Oldest'}
          </button>
          <button className={withAllowanceOnly ? styles.activeFilter : ''} type="button" aria-pressed={withAllowanceOnly} onClick={() => setWithAllowanceOnly((current) => !current)}>
            Allowance: {withAllowanceOnly ? 'With Allowance' : 'With or Without'}
          </button>
        </div>

        {error && <p className={styles.feedback} role="alert">{error}</p>}
        {isLoading && <p className={styles.feedback}>Searching opportunities...</p>}

        {!isLoading && (
          <div className={styles.resultsLayout}>
            <aside className={styles.resultsList} aria-label={`${results.length} search results`}>
              {results.map((opportunity) => (
                <button className={`${styles.resultCard} ${selectedOpportunity?.id === opportunity.id ? styles.selectedResult : ''}`} key={opportunity.id} type="button" onClick={() => selectOpportunity(opportunity)}>
                  <span className={styles.resultCompany}><span className={styles.companyDot}>{opportunity.companyName.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span>{opportunity.companyName}</span>
                  <strong>{opportunity.position}</strong>
                  <small>{opportunity.location}</small>
                  <span className={styles.resultFooter}><span>{opportunity.workSetup}</span><time>{opportunity.postedAt}</time></span>
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

function hasAllowance(allowance: string) {
  return !/^(subject to|none|unpaid|n\/a)/i.test(allowance.trim())
}

export default InternshipSearchPage
