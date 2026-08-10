import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import TrackingHeader from '../components/TrackingHeader'
import TrackingTabs from '../components/TrackingTabs'
import { useRequirements } from '../hooks/useRequirements'
import type { InternshipRequirement } from '../types/requirement.types'
import styles from './RequirementsPage.module.css'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']

const isAcceptedFile = (file: File) => {
  const name = file.name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension)) && file.size <= MAX_FILE_SIZE
}

function RequirementsPage() {
  const { requirements, isLoading, uploadingId, error, setError, uploadRequirement } = useRequirements()
  const [viewingRequirement, setViewingRequirement] = useState<InternshipRequirement | null>(null)

  const submittedCount = useMemo(
    () => requirements.filter((requirement) => requirement.status === 'submitted').length,
    [requirements],
  )
  const completion = requirements.length ? Math.round((submittedCount / requirements.length) * 100) : 0

  useEffect(() => {
    if (!viewingRequirement) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setViewingRequirement(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [viewingRequirement])

  const handleFileSelection = async (
    requirement: InternshipRequirement,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!isAcceptedFile(file)) {
      setError('Please select a PDF, DOC, DOCX, JPG, or PNG file no larger than 10 MB.')
      return
    }
    await uploadRequirement(requirement.id, file)
  }

  return (
    <main className={styles.page}>
      <TrackingHeader />

      <section className={styles.trackingContent}>
        <TrackingTabs />

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
                  onView={() => setViewingRequirement(requirement)}
                  onFileSelection={(event) => void handleFileSelection(requirement, event)}
                />
              ))}
            </div>
          )}
        </section>
      </section>

      {viewingRequirement?.document && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setViewingRequirement(null)}>
          <section className={styles.documentModal} role="dialog" aria-modal="true" aria-labelledby="document-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="document-title">{viewingRequirement.title}</h2>
            <dl>
              <div><dt>File name</dt><dd>{viewingRequirement.document.fileName}</dd></div>
              <div><dt>File type</dt><dd>{viewingRequirement.document.mimeType}</dd></div>
              <div><dt>File size</dt><dd>{formatFileSize(viewingRequirement.document.size)}</dd></div>
              <div><dt>Uploaded</dt><dd>{formatDate(viewingRequirement.document.uploadedAt)}</dd></div>
            </dl>
            {viewingRequirement.document.previewUrl && (
              <a href={viewingRequirement.document.previewUrl} target="_blank" rel="noreferrer">Open uploaded document</a>
            )}
            <p>Click outside this window or press Escape to close.</p>
          </section>
        </div>
      )}
    </main>
  )
}

interface RequirementRowProps {
  requirement: InternshipRequirement
  isUploading: boolean
  onView: () => void
  onFileSelection: (event: ChangeEvent<HTMLInputElement>) => void
}

function RequirementRow({ requirement, isUploading, onView, onFileSelection }: RequirementRowProps) {
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
          <button type="button" onClick={onView}>View</button>
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

const formatDate = (value: string) => new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'long',
  timeStyle: 'short',
}).format(new Date(value))

const formatFileSize = (size: number) => size >= 1_000_000
  ? `${(size / 1_000_000).toFixed(1)} MB`
  : `${Math.ceil(size / 1_000)} KB`

export default RequirementsPage
