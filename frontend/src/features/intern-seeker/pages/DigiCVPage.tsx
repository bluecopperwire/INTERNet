import { type DragEvent, type ChangeEvent, useRef, useState } from 'react'
import { BriefcaseBusiness, FileText } from 'lucide-react'
import digicvBackground from '../../../assets/digicv-bg.svg'
import qcLogos from '../../../assets/qc-logos.svg'
import { useToastStore } from '../../../stores/useToastStore'
import { getErrorMessage } from '../../../utils/error-message'
import { useStudentTrackingStore } from '../stores/useStudentTrackingStore'
import styles from './DigiCVPage.module.css'

const RESUME_REQUIREMENT_TYPE = 'curriculum_vitae_resume'
const RESUME_REQUIREMENT_NAME = 'Curriculum Vitae (CV) / Resume'

function isAcceptedResume(file: File) {
  return file.name.toLowerCase().endsWith('.pdf') && file.type === 'application/pdf'
}

function DigiCVPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const uploadRequirement = useStudentTrackingStore((state) => state.uploadRequirement)
  const toast = useToastStore()

  const selectFile = async (file: File | undefined) => {
    if (!file || isUploading) return

    if (!isAcceptedResume(file)) {
      setSelectedFile(null)
      setError('Please select a PDF resume or curriculum vitae only.')
      return
    }

    setError('')
    setIsUploading(true)
    try {
      await uploadRequirement(file, RESUME_REQUIREMENT_TYPE, RESUME_REQUIREMENT_NAME)
      setSelectedFile(file)
      toast.success('Resume / Curriculum Vitae uploaded to My Requirements.')
    } catch (uploadError: unknown) {
      setSelectedFile(null)
      const message = getErrorMessage(uploadError, 'Unable to upload your resume or curriculum vitae.')
      setError(message)
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    void selectFile(event.target.files?.[0])
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsDragging(false)
    void selectFile(event.dataTransfer.files?.[0])
  }

  return (
    <main className={styles.page} style={{ backgroundImage: `url(${digicvBackground})` }}>
      <img className={styles.qcLogos} src={qcLogos} alt="Quezon City Government and QC PESO" />

      <section className={styles.content} aria-labelledby="digicv-title">
        <header className={styles.heading}>
          <h1 id="digicv-title">DigiCV</h1>
          <h2>Build a curriculum vitae that gets you hired!</h2>
          <p>
            <strong>Note:</strong> Upload your existing curriculum vitae or resume, or start from scratch<br />
            and create a professional one in just a few minutes.
          </p>
        </header>

        <div className={styles.actions}>
          <div className={styles.uploadGroup}>
            <button
              className={`${styles.actionCard} ${styles.uploadCard} ${isDragging ? styles.dragging : ''}`}
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false)
              }}
              onDrop={handleDrop}
            >
              <FileText aria-hidden="true" />
              <span className={styles.actionTitle}>Upload Curriculum Vitae<br />or Resume</span>
              <span className={styles.actionBadge}>{isUploading ? 'Uploading...' : 'PDF File'}</span>
              {selectedFile && <span className={styles.uploadHint}>{selectedFile.name}</span>}
            </button>
            <input
              ref={fileInputRef}
              className={styles.fileInput}
              type="file"
              accept=".pdf,application/pdf"
              disabled={isUploading}
              onChange={handleInputChange}
            />
            {error && <p className={styles.error} role="alert">{error}</p>}
          </div>

          <a className={`${styles.actionCard} ${styles.createCard}`} href="https://peso-mis.quezoncity.gov.ph/careerhub/">
            <BriefcaseBusiness aria-hidden="true" />
            <span className={styles.actionTitle}>Create from scratch</span>
            <span className={styles.actionBadge}>Start Fresh</span>
          </a>
        </div>

      </section>
    </main>
  )
}

export default DigiCVPage
