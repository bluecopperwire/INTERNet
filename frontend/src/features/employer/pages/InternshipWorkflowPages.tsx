import { ArrowLeft, Eye, Search } from 'lucide-react'
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EmployerHero } from '../components/EmployerHero'
import { DataTable, type DataTableColumn } from '../../../components/DataTable'
import { TableActions, TableCellStack } from '../../../components/TablePrimitives'
import { TablePagination } from '../../../components/TablePagination'
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
  const [perPage, setPerPage] = useState(5)

  useEffect(() => {
    employerService.getInternshipAssignments().then(setAssignments)
  }, [])

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase()
    return assignments.filter((assignment) => (
      !query || `${assignment.studentName} ${assignment.jobTitle}`.toLowerCase().includes(query)
    ))
  }, [assignments, search])
  const visibleAssignments = filteredAssignments.slice((page - 1) * perPage, page * perPage)
  const resetPage = () => setPage(1)
  const columns: DataTableColumn<InternshipAssignment>[] = [
    { key: 'student', header: 'Student', render: (assignment) => <TableCellStack primary={assignment.studentName} secondary={assignment.studentAccountCode} tertiary={assignment.strandProgram} code /> },
    { key: 'opportunity', header: 'Opportunity', render: (assignment) => assignment.jobTitle },
    { key: 'accepted', header: 'Offer Accepted', render: (assignment) => assignment.acceptanceDate },
    { key: 'actions', header: 'Actions', align: 'center', headerAlign: 'center', render: (assignment) => <TableActions><button type="button" className={styles.reviewButton} onClick={() => navigate(`/employer/internship-assignments/${assignment.id}`)} aria-label={`Create internship assignment for ${assignment.studentName}`}><Eye size={16} aria-hidden="true" />Create</button></TableActions> },
  ]

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

        <DataTable ariaLabel="Students eligible for internship assignment" columns={columns} rows={visibleAssignments} rowKey={(assignment) => assignment.id} minWidth={760} emptyMessage="No accepted offers are awaiting assignment." filteredEmptyMessage="No accepted offers match your search." hasActiveFilters={Boolean(search.trim())} footer={<TablePagination page={page} pageSize={perPage} totalRecords={filteredAssignments.length} onPageChange={setPage} onPageSizeChange={(value) => { setPerPage(value); resetPage() }} />} />
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
          workingDays: [1, 2, 3, 4, 5],
        }))
      }
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <main className={styles.assignmentFeedback}>Loading internship assignment...</main>
  if (!assignment) return <main className={styles.assignmentFeedback}>Internship assignment not found.</main>

  const isAssignmentLocked = assignment.studentResponse !== 'Accepted' || assignment.internshipAssignmentId !== null
  const handleCreateAssignment = async () => {
    if (isAssignmentLocked || isCreating) return
    if (formData.workingDays.length === 0 || !formData.requiredHours || !isValidDateOnly(formData.startDate) || (formData.expectedEndDate && !isValidDateOnly(formData.expectedEndDate)) || !formData.shiftStartTime || !formData.shiftEndTime) {
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
              <WorkingDaysField value={formData.workingDays} disabled={isAssignmentLocked} onChange={setFormData} />
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
  workingDays: number[]
  requiredHours: string
  startDate: string
  expectedEndDate: string
  shiftStartTime: string
  shiftEndTime: string
}

type AssignmentFieldName = Exclude<keyof AssignmentFormData, 'workingDays'>

function createEmptyAssignmentForm(): AssignmentFormData {
  return { company: '', jobTitle: '', workingDays: [1, 2, 3, 4, 5], requiredHours: '', startDate: '', expectedEndDate: '', shiftStartTime: '', shiftEndTime: '' }
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
    <input name={name} value={value} type={type} inputMode={inputMode} min={min} placeholder={placeholder} disabled={disabled} onChange={(event) => updateValue(event.target.value)} />
  </label>
}

function WorkingDaysField({ value, disabled, onChange }: { value: number[]; disabled: boolean; onChange: Dispatch<SetStateAction<AssignmentFormData>> }) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return <fieldset className={`${styles.assignmentField} ${styles.assignmentWorkingDays}`} disabled={disabled}>
    <legend>Working Days</legend>
    <div className={styles.dayOptions}>
      {days.map((day, index) => <label key={day}>
        <input
          type="checkbox"
          aria-label={day}
          checked={value.includes(index)}
          onChange={(event) => onChange((current) => ({
            ...current,
            workingDays: event.target.checked
              ? [...current.workingDays, index].sort((a, b) => a - b)
              : current.workingDays.filter((item) => item !== index),
          }))}
        />
        {day.slice(0, 3)}
      </label>)}
    </div>
  </fieldset>
}
