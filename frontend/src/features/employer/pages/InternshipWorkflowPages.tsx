import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Search } from 'lucide-react'
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EmployerHero } from '../components/EmployerHero'
import { employerService } from '../services/employer.service'
import type { InternshipAssignment } from '../types/employer.types'
import styles from './InternshipWorkflowPages.module.css'
import { useToastStore } from '../../../stores/useToastStore'
import { getErrorMessage } from '../../../utils/error-message'
import { todayDateOnly } from '../../../utils/date-only'
import { isValidDateOnly } from '../../../utils/date-only'

export function CreateInternshipAssignmentPage() {
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState<InternshipAssignment[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(7)

  useEffect(() => {
    employerService.getInternshipAssignments().then(setAssignments)
  }, [])

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase()
    return assignments.filter((assignment) => (
      !query || `${assignment.studentName} ${assignment.jobTitle}`.toLowerCase().includes(query)
    ))
  }, [assignments, search])
  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / perPage))
  const visibleAssignments = filteredAssignments.slice((page - 1) * perPage, page * perPage)
  const resetPage = () => setPage(1)

  return (
    <main className={styles.heroOnlyPage}>
      <EmployerHero
        title="Create Internship Assignment"
        subtitle="Create assignments for students who accepted their internship offers."
        comfortableSpacing
      />
      <section className={styles.assignmentContent}>
        <div className={styles.assignmentToolbar}>
          <label className={styles.assignmentSearch}>
            <Search size={17} aria-hidden="true" />
            <span className={styles.srOnly}>Search accepted offers</span>
            <input value={search} onChange={(event) => { setSearch(event.target.value); resetPage() }} placeholder="Search student or job title..." />
          </label>
        </div>

        <div className={styles.assignmentTableCard}>
          <div className={styles.assignmentTableScroller}>
            <table className={styles.assignmentTable}>
              <thead><tr><th>Student Name</th><th>Job Title</th><th>Acceptance Date</th><th>Action</th></tr></thead>
              <tbody>{visibleAssignments.map((assignment) => <tr key={assignment.id}>
                <td>{assignment.studentName}</td>
                <td>{assignment.jobTitle}</td>
                <td>{assignment.acceptanceDate}</td>
                <td><div className={styles.assignmentRowActions}>
                  <button type="button" className={styles.reviewButton} onClick={() => navigate(`/employer/internship-assignments/${assignment.id}`)}><Eye size={16} />Create Internship Assignment</button>
                </div></td>
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
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState(createEmptyAssignmentForm)
  const toast = useToastStore()

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    employerService.getInternshipAssignmentById(id).then((data) => {
      setAssignment(data ?? null)
      if (data) {
        setFormData((current) => ({
          ...current,
          company: data.company,
          jobTitle: data.jobTitle,
          requiredHours: String(data.requiredHours || ''),
          workingDays: data.workingDays.toLowerCase() === 'weekends' ? 'weekends' : 'weekdays',
        }))
      }
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <main className={styles.assignmentFeedback}>Loading internship assignment...</main>
  if (!assignment) return <main className={styles.assignmentFeedback}>Internship assignment not found.</main>

  const isAssignmentLocked = assignment.studentResponse !== 'Accepted' || assignment.internshipAssignmentId !== null
  const handleCreateAssignment = async () => {
    if (isAssignmentLocked || isCreating) return
    if (!formData.workingDays || !formData.requiredHours || !isValidDateOnly(formData.startDate) || (formData.expectedEndDate && !isValidDateOnly(formData.expectedEndDate)) || !formData.shiftStartTime || !formData.shiftEndTime) {
      toast.error('Complete all required assignment fields with valid dates and times.')
      return
    }
    setIsCreating(true)
    try {
      await employerService.createInternshipAssignment(assignment.referralId, {
        workingDays: formData.workingDays,
        requiredHours: Number(formData.requiredHours),
        startDate: formData.startDate,
        expectedEndDate: formData.expectedEndDate || null,
        startShift: formData.shiftStartTime,
        endShift: formData.shiftEndTime,
      })
      toast.success('Internship assignment created.')
      navigate('/employer/internship-assignments')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to create internship assignment.'))
    } finally {
      setIsCreating(false)
    }
  }


  return (
    <main className={styles.assignmentDetailPage}>
      <div className={styles.assignmentDetailWrap}>
        <button type="button" className={styles.assignmentBackButton} onClick={() => navigate('/employer/internship-assignments')}><ArrowLeft size={19} />Back to Internship Assignments</button>

        <section className={`${styles.assignmentDetailCard} ${isAssignmentLocked ? styles.assignmentRejected : ''}`}>
          <header className={styles.assignmentDetailHeader}>
            <h1>{assignment.internshipAssignmentId ? 'Internship Assignment Created' : 'Create Internship Assignment'}</h1>
            <p>{assignment.internshipAssignmentId ? `The official assignment for ${assignment.studentName} is ready to view.` : `Enter the internship placement and schedule details for ${assignment.studentName}.`}</p>
          </header>

          <form onSubmit={(event) => { event.preventDefault(); void handleCreateAssignment() }} aria-disabled={isAssignmentLocked}>
            <div className={styles.assignmentDetailGrid}>
              <AssignmentField label="Company" name="company" value={formData.company} placeholder="Company" disabled onChange={setFormData} />
              <AssignmentField label="Job Title" name="jobTitle" value={formData.jobTitle} placeholder="Job title" disabled onChange={setFormData} />
              <AssignmentField label="Working Days" name="workingDays" value={formData.workingDays} disabled={isAssignmentLocked} onChange={setFormData} />
              <AssignmentField label="Required Hours" name="requiredHours" value={formData.requiredHours} placeholder="Enter required hours" inputMode="numeric" disabled={isAssignmentLocked} onChange={setFormData} />
              <AssignmentField label="Start Date" name="startDate" value={formData.startDate} type="date" min={todayDateOnly()} disabled={isAssignmentLocked} onChange={setFormData} />
              <AssignmentField label="Expected End Date" name="expectedEndDate" value={formData.expectedEndDate} type="date" min={formData.startDate || todayDateOnly()} disabled={isAssignmentLocked} onChange={setFormData} />
              <AssignmentField label="Shift Start Time" name="shiftStartTime" value={formData.shiftStartTime} type="time" disabled={isAssignmentLocked} onChange={setFormData} />
              <AssignmentField label="Shift End Time" name="shiftEndTime" value={formData.shiftEndTime} type="time" disabled={isAssignmentLocked} onChange={setFormData} />
            </div>

            <footer className={styles.assignmentDetailFooter}>
              {assignment.studentResponse === 'Accepted' && assignment.internshipAssignmentId === null && <button type="submit" className={styles.createAssignmentButton} disabled={isAssignmentLocked || isCreating}>{isCreating ? 'Creating...' : 'Create Internship Assignment'}</button>}
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
  min?: string
  disabled?: boolean
  onChange: Dispatch<SetStateAction<AssignmentFormData>>
}

function AssignmentField({ label, name, value, placeholder, type = 'text', inputMode, min, disabled = false, onChange }: AssignmentFieldProps) {
  const updateValue = (nextValue: string) => onChange((current) => ({ ...current, [name]: name === 'requiredHours' ? nextValue.replace(/\D/g, '') : nextValue }))

  return <label className={styles.assignmentField}>
    <span>{label}</span>
    {name === 'workingDays' ? (
      <select name={name} value={value} disabled={disabled} onChange={(event) => updateValue(event.target.value)}>
        <option value="" disabled>Select working days</option>
        <option value="weekdays">Weekdays</option>
        <option value="weekends">Weekends</option>
      </select>
    ) : <input name={name} value={value} type={type} inputMode={inputMode} min={min} placeholder={placeholder} disabled={disabled} onChange={(event) => updateValue(event.target.value)} />}
  </label>
}
