import { useState } from 'react'
import { X } from 'lucide-react'
import styles from './RejectApplicantModal.module.css'

interface RejectApplicantModalProps {
  applicantName: string
  isSaving?: boolean
  onClose: () => void
  onConfirm: (remark: string) => void
}

export function RejectApplicantModal({ applicantName, isSaving = false, onClose, onConfirm }: RejectApplicantModalProps) {
  const [remark, setRemark] = useState('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onConfirm(remark)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form className={styles.modal} onClick={(event) => event.stopPropagation()} onSubmit={handleSubmit}>
        <header className={styles.header}>
          <div>
            <h2>Reject Applicant</h2>
            <p>Reject {applicantName}'s application. A remark is optional.</p>
          </div>
          <button type="button" className={styles.closeButton} aria-label="Close rejection dialog" onClick={onClose}>
            <X />
          </button>
        </header>

        <div className={styles.body}>
          <label className={styles.field}>
            Remarks <span>(Optional)</span>
            <textarea
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              placeholder="Add a remark for the applicant..."
              maxLength={500}
              rows={5}
            />
            <small>{remark.length}/500</small>
          </label>
        </div>

        <footer className={styles.actions}>
          <button type="button" className={styles.cancelButton} disabled={isSaving} onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.rejectButton} disabled={isSaving}>{isSaving ? 'Rejecting...' : 'Reject Applicant'}</button>
        </footer>
      </form>
    </div>
  )
}
