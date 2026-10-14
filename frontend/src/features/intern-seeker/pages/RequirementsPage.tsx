import { type ChangeEvent, useMemo } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { DataTable, type DataTableColumn } from '../../../components/DataTable'
import { StatusBadge, TableActions, TableCellStack } from '../../../components/TablePrimitives'
import { useRequirements } from '../hooks/useRequirements'
import type { InternshipRequirement } from '../types/requirement.types'
import styles from './RequirementsPage.module.css'

const MAX_FILE_SIZE = 10 * 1024 * 1024

const isAcceptedFile = (file: File) => {
  const name = file.name.toLowerCase()
  return name.endsWith('.pdf') && file.type === 'application/pdf' && file.size <= MAX_FILE_SIZE
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
      const msg = 'Please select a PDF file no larger than 10 MB.'
      setError(msg)
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
    if (!window.confirm(`Delete the submitted ${requirement.title} document?`)) return
    const success = await deleteRequirement(requirement.id)
    if (success) {
      toast.success(`${requirement.title} deleted.`)
    } else {
      toast.error(`Failed to delete ${requirement.title}.`)
    }
  }

  const columns: DataTableColumn<InternshipRequirement>[] = [
    {
      key: 'requirement',
      header: 'Requirement',
      width: '48%',
      render: (requirement) => (
        <TableCellStack
          primary={requirement.title}
          secondary={requirement.description}
          tertiary={requirement.recipientLines?.join(' · ')}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (requirement) => (
        <StatusBadge value={requirement.status === 'submitted' ? 'Submitted' : 'Pending'} />
      ),
    },
    {
      key: 'updated',
      header: 'Last Updated',
      align: 'center',
      render: (requirement) => requirement.document ? formatDate(requirement.document.uploadedAt) : '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      headerAlign: 'center',
      render: (requirement) => {
        const inputId = `requirement-${requirement.id}`
        return (
          <TableActions>
            {requirement.status === 'submitted' ? (
              <span className={styles.documentActions}>
                <button className={styles.iconAction} type="button" aria-label={`Download ${requirement.document?.fileName ?? requirement.title}`} title="Download" onClick={() => downloadDocument(requirement)}><Download aria-hidden="true" /></button>
                <button className={`${styles.iconAction} ${styles.deleteAction}`} type="button" aria-label={`Delete ${requirement.document?.fileName ?? requirement.title}`} title="Delete" onClick={() => void handleDelete(requirement)}><Trash2 aria-hidden="true" /></button>
              </span>
            ) : (
              <>
                <label className={styles.uploadButton} htmlFor={inputId}>{uploadingId === requirement.id ? 'Uploading...' : 'Upload'}</label>
                <input className={styles.hiddenFileInput} id={inputId} type="file" accept=".pdf,application/pdf" disabled={uploadingId === requirement.id} onChange={(event) => void handleFileSelection(requirement, event)} />
              </>
            )}
          </TableActions>
        )
      },
    },
  ]

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
          <DataTable
            ariaLabel="Pre-referral requirements"
            columns={columns}
            rows={requirements}
            rowKey={(requirement) => requirement.id}
            minWidth={760}
            loading={isLoading}
            emptyMessage="No requirements are currently assigned."
          />
        </section>

    </>
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
