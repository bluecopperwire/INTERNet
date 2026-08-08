import { type DragEvent, type ChangeEvent, useRef, useState } from 'react'
import { BriefcaseBusiness, FileText } from 'lucide-react'
import digicvBackground from '../../../assets/digicv-bg.svg'
import qcLogos from '../../../assets/qc-logos.svg'
import styles from './DigiCVPage.module.css'

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx']
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

function isAcceptedResume(file: File) {
  const fileName = file.name.toLowerCase()
  const hasAcceptedExtension = ACCEPTED_EXTENSIONS.some((extension) => fileName.endsWith(extension))
  return hasAcceptedExtension && (!file.type || ACCEPTED_MIME_TYPES.includes(file.type))
}

function DigiCVPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const selectFile = (file: File | undefined) => {
    if (!file) return

    if (!isAcceptedResume(file)) {
      setSelectedFile(null)
      setError('Please select a PDF or DOCX resume only.')
      return
    }

    setSelectedFile(file)
    setError('')
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0])
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsDragging(false)
    selectFile(event.dataTransfer.files?.[0])
  }

  return (
    <main className={styles.page} style={{ backgroundImage: `url(${digicvBackground})` }}>
      <img className={styles.qcLogos} src={qcLogos} alt="Quezon City Government and QC PESO" />

      <section className={styles.content} aria-labelledby="digicv-title">
        <header className={styles.heading}>
          <h1 id="digicv-title">DigiCV</h1>
          <h2>Build a resume that gets you hired</h2>
          <p><strong>Note:</strong> Upload your existing resume to edit it, or start fresh and create a polished one in minutes.</p>
        </header>

        <div className={styles.actions}>
          <div className={styles.uploadGroup}>
            <button
              className={`${styles.actionCard} ${styles.uploadCard} ${isDragging ? styles.dragging : ''}`}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false)
              }}
              onDrop={handleDrop}
            >
              <FileText aria-hidden="true" />
              <span className={styles.actionTitle}>Upload Resume</span>
              <span className={styles.actionBadge}>PDF or DOCX</span>
              <span className={styles.uploadHint}>
                {selectedFile ? selectedFile.name : 'Click to browse or drag and drop'}
              </span>
            </button>
            <input
              ref={fileInputRef}
              className={styles.fileInput}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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

        <div className={styles.steps} aria-label="DigiCV creation steps">
          <span>01 Fill in your info</span>
          <span aria-hidden="true">→</span>
          <span>02 Customize sections</span>
          <span aria-hidden="true">→</span>
          <span>03 Export as PDF</span>
        </div>
      </section>
    </main>
  )
}

export default DigiCVPage
