import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EmployerHero } from '../components/EmployerHero'
import { employerService } from '../services/employer.service'
import type { InternshipAssignment } from '../types/employer.types'
import styles from './InternshipWorkflowPages.module.css'

export function CreateInternshipAssignmentPage() {
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState<InternshipAssignment[]>([])
  const [search, setSearch] = useState('')
  const [response, setResponse] = useState('All')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(7)

  useEffect(() => {
    employerService.getInternshipAssignments().then(setAssignments)
  }, [])

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase()
    return assignments.filter((assignment) => (
      (!query || `${assignment.studentName} ${assignment.jobTitle}`.toLowerCase().includes(query))
      && (response === 'All' || assignment.studentResponse === response)
    ))
  }, [assignments, response, search])
  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / perPage))
  const visibleAssignments = filteredAssignments.slice((page - 1) * perPage, page * perPage)
  const resetPage = () => setPage(1)

  return (
    <main className={styles.heroOnlyPage}>
      <EmployerHero
        title="Create Internship Assignment"
        subtitle="Review accepted offers and track each student's response before assigning their internship."
        comfortableSpacing
      />
      <section className={styles.assignmentContent}>
        <div className={styles.assignmentToolbar}>
          <label className={styles.assignmentSearch}>
            <Search size={17} aria-hidden="true" />
            <span className={styles.srOnly}>Search accepted offers</span>
            <input value={search} onChange={(event) => { setSearch(event.target.value); resetPage() }} placeholder="Search student or job title..." />
          </label>
          <label className={styles.assignmentFilter}>
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span className={styles.srOnly}>Filter by student response</span>
            <select value={response} onChange={(event) => { setResponse(event.target.value); resetPage() }}>
              <option value="All">All Responses</option>
              <option value="Pending Response">Pending Response</option>
              <option value="Accepted">Accepted</option>
              <option value="Rejected">Rejected</option>
            </select>
          </label>
        </div>

        <div className={styles.assignmentTableCard}>
          <div className={styles.assignmentTableScroller}>
            <table className={styles.assignmentTable}>
              <thead><tr><th>Student Name</th><th>Job Title</th><th>Acceptance Date</th><th>Student Response</th><th>Action</th></tr></thead>
              <tbody>{visibleAssignments.map((assignment) => <tr key={assignment.id}>
                <td><strong>{assignment.studentName}</strong></td>
                <td>{assignment.jobTitle}</td>
                <td>{assignment.acceptanceDate}</td>
                <td><span className={`${styles.responsePill} ${styles[assignment.studentResponse.replaceAll(' ', '').toLowerCase()]}`}>{assignment.studentResponse}</span></td>
                <td><button type="button" className={styles.reviewButton} onClick={() => navigate(`/employer/internship-assignments/${assignment.id}`)}><Eye size={16} />Review</button></td>
              </tr>)}</tbody>
            </table>
          </div>
          {visibleAssignments.length === 0 && <p className={styles.assignmentEmpty}>No accepted offers match the selected filters.</p>}
        </div>

        <div className={styles.assignmentPagination}>
          <div className={styles.assignmentPageSize}>
            <span>View</span>
            <span className={styles.pageSizeValue}><select value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); resetPage() }} aria-label="Students per page"><option value={7}>7</option><option value={10}>10</option><option value={15}>15</option></select></span>
            <span>Students per page</span>
          </div>
          <div className={styles.paginationButtons}>
            <button type="button" disabled={page === 1} onClick={() => setPage(current => current - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>
            <button type="button" className={styles.currentPage}>{page}</button>
            <button type="button" disabled={page === totalPages} onClick={() => setPage(current => current + 1)} aria-label="Next page"><ChevronRight size={18} /></button>
          </div>
        </div>
      </section>
    </main>
  )
}

export function ReviewInternshipAssignmentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState<InternshipAssignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState(createEmptyAssignmentForm)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    employerService.getInternshipAssignmentById(id).then((data) => setAssignment(data ?? null)).finally(() => setLoading(false))
  }, [id])

  if (loading) return <main className={styles.assignmentFeedback}>Loading internship assignment...</main>
  if (!assignment) return <main className={styles.assignmentFeedback}>Internship assignment not found.</main>

  const isAssignmentLocked = assignment.studentResponse !== 'Accepted'

  return (
    <main className={styles.assignmentDetailPage}>
      <div className={styles.assignmentDetailWrap}>
        <button type="button" className={styles.assignmentBackButton} onClick={() => navigate('/employer/internship-assignments')}><ArrowLeft size={19} />Back to Internship Assignments</button>

        <section className={`${styles.assignmentDetailCard} ${isAssignmentLocked ? styles.assignmentRejected : ''}`}>
          <header className={styles.assignmentDetailHeader}>
            <h1>Create Internship Assignment</h1>
            <p>Enter the internship placement and schedule details for {assignment.studentName}.</p>
          </header>

          <form onSubmit={(event) => event.preventDefault()} aria-disabled={isAssignmentLocked}>
            <div className={styles.assignmentDetailGrid}>
              <AssignmentField label="Company" name="company" value={formData.company} placeholder="Enter company name" disabled={isAssignmentLocked} onChange={setFormData} />
              <AssignmentField label="Job Title" name="jobTitle" value={formData.jobTitle} placeholder="Enter job title" disabled={isAssignmentLocked} onChange={setFormData} />
              <AssignmentField label="Working Days" name="workingDays" value={formData.workingDays} disabled={isAssignmentLocked} onChange={setFormData} />
              <AssignmentField label="Required Hours" name="requiredHours" value={formData.requiredHours} placeholder="Enter required hours" inputMode="numeric" disabled={isAssignmentLocked} onChange={setFormData} />
              <AssignmentField label="Start Date" name="startDate" value={formData.startDate} type="date" disabled={isAssignmentLocked} onChange={setFormData} />
              <AssignmentField label="Expected End Date" name="expectedEndDate" value={formData.expectedEndDate} type="date" disabled={isAssignmentLocked} onChange={setFormData} />
              <AssignmentField label="Shift Start Time" name="shiftStartTime" value={formData.shiftStartTime} type="time" disabled={isAssignmentLocked} onChange={setFormData} />
              <AssignmentField label="Shift End Time" name="shiftEndTime" value={formData.shiftEndTime} type="time" disabled={isAssignmentLocked} onChange={setFormData} />
            </div>

            <footer className={styles.assignmentDetailFooter}>
              <button type="submit" className={styles.createAssignmentButton} disabled={isAssignmentLocked}>Create Internship Assignment</button>
              <button type="button" className={styles.withdrawInternshipButton}>Withdraw Acceptance</button>
            </footer>
          </form>
        </section>
      </div>
    </main>
  )
}

type AssignmentFormData = {
  company: string
  jobTitle: string
  workingDays: string
  requiredHours: string
  startDate: string
  expectedEndDate: string
  shiftStartTime: string
  shiftEndTime: string
}

type AssignmentFieldName = keyof AssignmentFormData

function createEmptyAssignmentForm(): AssignmentFormData {
  return { company: '', jobTitle: '', workingDays: '', requiredHours: '', startDate: '', expectedEndDate: '', shiftStartTime: '', shiftEndTime: '' }
}

interface AssignmentFieldProps {
  label: string
  name: AssignmentFieldName
  value: string
  placeholder?: string
  type?: 'text' | 'date' | 'time'
  inputMode?: 'numeric'
  disabled?: boolean
  onChange: Dispatch<SetStateAction<AssignmentFormData>>
}

function AssignmentField({ label, name, value, placeholder, type = 'text', inputMode, disabled = false, onChange }: AssignmentFieldProps) {
  const updateValue = (nextValue: string) => onChange((current) => ({ ...current, [name]: name === 'requiredHours' ? nextValue.replace(/\D/g, '') : nextValue }))

  return <label className={styles.assignmentField}>
    <span>{label}</span>
    {name === 'workingDays' ? (
      <select name={name} value={value} disabled={disabled} onChange={(event) => updateValue(event.target.value)}>
        <option value="" disabled>Select working days</option>
        <option value="Weekdays">Weekdays</option>
        <option value="Weekend">Weekend</option>
        <option value="Flexible">Flexible</option>
      </select>
    ) : <input name={name} value={value} type={type} inputMode={inputMode} placeholder={placeholder} disabled={disabled} onChange={(event) => updateValue(event.target.value)} />}
  </label>
}
