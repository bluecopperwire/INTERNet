import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Filter, Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import headerImage from '../../../assets/requirements-header-image.png'
import suitcaseIcon from '../../../assets/suitcase.svg'
import { adminService } from '../services/admin.service'
import type { EmployerRecord } from '../types/admin.types'
import styles from './ManageStudentsPage.module.css'

export function ManageEmployersPage() {
  const [employers, setEmployers] = useState<EmployerRecord[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All Statuses')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(7)
  const navigate = useNavigate()

  useEffect(() => {
    adminService.getEmployerRecords().then(setEmployers)
  }, [])

  const filtered = useMemo(() => {
    return employers.filter((employer) => {
      const term = query.trim().toLowerCase()
      const matchesTerm =
        !term ||
        employer.companyName.toLowerCase().includes(term) ||
        employer.email.toLowerCase().includes(term)
      const matchesStatus = status === 'All Statuses' || employer.status === status
      return matchesTerm && matchesStatus
    })
  }, [employers, query, status])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const records = filtered.slice((page - 1) * pageSize, page * pageSize)

  const summary = {
    total: employers.length,
    active: employers.filter((record) => record.status === 'Active').length,
    suspended: employers.filter((record) => record.status === 'Suspended').length,
    deactivated: employers.filter((record) => record.status === 'Deactivated').length,
  }

  const badge = (value: EmployerRecord['status']) =>
    value === 'Active'
      ? styles.active
      : value === 'Deactivated'
        ? styles.deactivated
        : styles.inactive

  const summaryItems = [
    { label: 'Total Employer Accounts', value: summary.total },
    { label: 'Active Employer Accounts', value: summary.active },
    { label: 'Suspended Employer Accounts', value: summary.suspended },
    { label: 'Deactivated Employer Accounts', value: summary.deactivated },
  ]

  return (
    <main className={styles.pageContainer}>
      <header className={styles.hero}>
        <img src={headerImage} alt="" className={styles.heroImage} />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <h1>Manage Employers</h1>
          <p>View, update, and manage employer accounts.</p>
        </div>
      </header>

      <section className={styles.mainContent}>
        <div className={styles.summaryGrid}>
          {summaryItems.map((item) => (
            <article className={styles.summaryCard} key={item.label}>
              <h2>{item.label}</h2>
              <p>{item.value}</p>
              <img src={suitcaseIcon} alt="" />
            </article>
          ))}
        </div>

        <section className={styles.managementCard}>
          <div className={styles.toolbar}>
            <label className={styles.searchBox}>
              <Search size={19} aria-hidden="true" />
              <span className={styles.srOnly}>Search employers</span>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                }}
                placeholder="Search employers..."
              />
            </label>

            <div className={styles.toolbarActions}><label className={styles.statusFilter}>
              <Filter size={17} aria-hidden="true" />
              <span className={styles.srOnly}>Account status</span>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value)
                  setPage(1)
                }}
              >
                <option>All Statuses</option>
                <option>Active</option>
                <option>Suspended</option>
                <option>Deactivated</option>
              </select>
            </label><button type="button" className={styles.createButton} onClick={() => navigate('/admin/manage-employers/create')} aria-label="Create employer"><Plus size={20} /></button></div>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Email</th>
                  <th>Date Registered</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((employer) => (
                  <tr key={employer.id}>
                    <td>
                      <strong>{employer.companyName}</strong>
                    </td>
                    <td>{employer.email}</td>
                    <td>{employer.dateCreated}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${badge(employer.status)}`}>
                        {employer.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.manageButton}
                        onClick={() => navigate(`/admin/manage-employers/${employer.id}`)}
                      >
                        <Eye size={16} aria-hidden="true" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {!records.length && (
                  <tr>
                    <td className={styles.empty} colSpan={5}>
                      No employers match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <Pagination
          page={page}
          pages={pages}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={(value) => {
            setPageSize(value)
            setPage(1)
          }}
        />
      </section>
    </main>
  )
}

function Pagination({
  page,
  pages,
  pageSize,
  onPage,
  onPageSize,
}: {
  page: number
  pages: number
  pageSize: number
  onPage: (page: number) => void
  onPageSize: (value: number) => void
}) {
  return (
    <nav className={styles.pagination} aria-label="Employer pages">
      <label className={styles.pageSizeControl}>
        <span>View</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSize(Number(event.target.value))}
        >
          <option value={7}>7</option>
          <option value={14}>14</option>
          <option value={21}>21</option>
        </select>
        <span>Employers per page</span>
      </label>

      <div>
        <button
          type="button"
          aria-label="Previous page"
          disabled={page === 1}
          onClick={() => onPage(Math.max(1, page - 1))}
        >
          <ChevronLeft size={18} />
        </button>
        <span className={styles.currentPage}>{page}</span>
        <button
          type="button"
          aria-label="Next page"
          disabled={page === pages}
          onClick={() => onPage(Math.min(pages, page + 1))}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </nav>
  )
}

export default ManageEmployersPage
