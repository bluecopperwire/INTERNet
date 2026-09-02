import { Trash2, X } from 'lucide-react'
import styles from './ConfirmDeleteModal.module.css'

interface ConfirmDeleteModalProps {
  subject: string
  isDeleting?: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmDeleteModal({ subject, isDeleting = false, onClose, onConfirm }: ConfirmDeleteModalProps) {
  return (
    <div className={styles.overlay} role="presentation" onMouseDown={onClose}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className={styles.header}>
          <span className={styles.icon}><Trash2 aria-hidden="true" /></span>
          <div>
            <h2 id="delete-dialog-title">Delete record?</h2>
            <p>This removes {subject} from your view. The underlying workflow history will be preserved.</p>
          </div>
          <button type="button" className={styles.closeButton} aria-label="Close delete confirmation" disabled={isDeleting} onClick={onClose}><X /></button>
        </header>
        <footer className={styles.actions}>
          <button type="button" className={styles.cancelButton} disabled={isDeleting} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.deleteButton} disabled={isDeleting} onClick={onConfirm}>{isDeleting ? 'Deleting...' : 'Delete'}</button>
        </footer>
      </section>
    </div>
  )
}
