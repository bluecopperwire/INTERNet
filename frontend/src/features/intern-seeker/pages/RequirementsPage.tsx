import { type ChangeEvent, useMemo } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { useRequirements } from '../hooks/useRequirements'
import type { InternshipRequirement } from '../types/requirement.types'
import styles from './RequirementsPage.module.css'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']

const isAcceptedFile = (file: File) => {
  const name = file.name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension)) && file.size <= MAX_FILE_SIZE
}

import { useToastStore } from '../../../stores/useToastStore'

function RequirementsPage() {
  const { requirements, isLoading, uploadingId, error, setError, uploadRequirement, deleteRequirement } = useRequirements()
  const toast = useToastStore()

  const submittedCount = useMemo(
    () => requirements.filter((requirement) => requirement.status === 'submitted').length,
    [requirements],
  )
  const completion = requirements.length ? Math.round((submittedCount / requirements.length) * 100) : 0

  const handleFileSelection = async (
    requirement: InternshipRequirement,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!isAcceptedFile(file)) {
      const msg = 'Please select a PDF, DOC, DOCX, JPG, or PNG file no larger than 10 MB.'
      setError(msg)
      toast.error(msg)
      return
    }
    const success = await uploadRequirement(requirement.id, file)
    if (success) {
      toast.success(`${requirement.title} uploaded successfully!`)
    } else {
      toast.error(`Failed to upload ${requirement.title}.`)
    }
  }

  const handleDelete = async (requirement: InternshipRequirement) => {
    const success = await deleteRequirement(requirement.id)
    if (success) {
      toast.success(`${requirement.title} deleted.`)
    } else {
      toast.error(`Failed to delete ${requirement.title}.`)
    }
  }

  return (
    <>
        <section className={styles.requirementsPanel} aria-labelledby="requirements-heading">
          <div className={styles.panelHeader}>
            <div>
              <h2 id="requirements-heading">Pre-referral Requirements</h2>
              <p>Submit all required documents to be endorsed to a host company or organization.</p>
            </div>
            <div className={styles.progressSummary}>
              <strong>{submittedCount} of {requirements.length} submitted</strong>
              <div className={styles.progressRow}>
                <progress max="100" value={completion}>{completion}%</progress>
                <span>{completion}%</span>
              </div>
            </div>
          </div>

          {error && <p className={styles.error} role="alert">{error}</p>}
          {isLoading && <p className={styles.feedback}>Loading requirements...</p>}
          {!isLoading && requirements.length === 0 && <p className={styles.feedback}>No requirements are currently assigned.</p>}

          {!isLoading && requirements.length > 0 && (
            <div className={styles.table} role="table" aria-label="Pre-referral requirements">
              <div className={styles.tableHeader} role="row">
                <span role="columnheader">Requirement</span>
                <span role="columnheader">Status</span>
                <span role="columnheader">Last Updated</span>
                <span role="columnheader">Action</span>
              </div>
              {requirements.map((requirement) => (
                <RequirementRow
                  key={requirement.id}
                  requirement={requirement}
                  isUploading={uploadingId === requirement.id}
                  onDelete={() => void handleDelete(requirement)}
                  onFileSelection={(event) => void handleFileSelection(requirement, event)}
                />
              ))}
            </div>
          )}
        </section>

    </>
  )
}

interface RequirementRowProps {
  requirement: InternshipRequirement
  isUploading: boolean
  onDelete: () => void
  onFileSelection: (event: ChangeEvent<HTMLInputElement>) => void
}

function RequirementRow({ requirement, isUploading, onDelete, onFileSelection }: RequirementRowProps) {
  const inputId = `requirement-${requirement.id}`
  return (
    <div className={styles.requirementRow} role="row">
      <div className={styles.requirementDetails} role="cell">
        <h3>{requirement.title}</h3>
        <p>{requirement.description}</p>
        {requirement.recipientLines && <div className={styles.recipient}>{requirement.recipientLines.map((line, index) => <span className={index > 0 ? styles.recipientName : ''} key={line}>{line}</span>)}</div>}
      </div>
      <div className={styles.mobileLabel}>Status</div>
      <div role="cell"><span className={`${styles.status} ${styles[requirement.status]}`}>{requirement.status === 'submitted' ? 'Submitted' : 'Pending'}</span></div>
      <div className={styles.mobileLabel}>Last Updated</div>
      <div className={styles.lastUpdated} role="cell">{requirement.document ? formatDate(requirement.document.uploadedAt) : '-'}</div>
      <div className={styles.mobileLabel}>Action</div>
      <div className={styles.actionCell} role="cell">
        {requirement.status === 'submitted' ? (
          <div className={styles.documentActions}>
            <button className={styles.iconAction} type="button" aria-label={`Download ${requirement.document?.fileName ?? requirement.title}`} title="Download" onClick={() => downloadDocument(requirement)}><Download aria-hidden="true" /></button>
            <button className={`${styles.iconAction} ${styles.deleteAction}`} type="button" aria-label={`Delete ${requirement.document?.fileName ?? requirement.title}`} title="Delete" onClick={onDelete}><Trash2 aria-hidden="true" /></button>
          </div>
        ) : (
          <>
            <label className={styles.uploadButton} htmlFor={inputId}>{isUploading ? 'Uploading...' : 'Upload'}</label>
            <input id={inputId} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" disabled={isUploading} onChange={onFileSelection} />
          </>
        )}
      </div>
    </div>
  )
}

const downloadDocument = (requirement: InternshipRequirement) => {
  if (!requirement.document) return
  const hasPreviewUrl = Boolean(requirement.document.previewUrl)
  const url = requirement.document.previewUrl ?? URL.createObjectURL(new Blob([`Mock document: ${requirement.document.fileName}`], { type: requirement.document.mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = requirement.document.fileName
  link.click()
  if (!hasPreviewUrl) window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

const formatDate = (value: string) => new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'long',
  timeStyle: 'short',
}).format(new Date(value))

export default RequirementsPage
