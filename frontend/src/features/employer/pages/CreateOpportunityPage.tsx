import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react'
import { employerService } from '../services/employer.service'
import type { Opportunity } from '../types/employer.types'
import styles from './CreateOpportunityPage.module.css'

export function CreateOpportunityPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const isEditMode = Boolean(id)
  
  const [formData, setFormData] = useState<Partial<Opportunity>>({
    title: '',
    department: '',
    slots: 0,
    duration: 0,
    jobDescription: '',
    requiredSkills: '',
    qualifications: '',
    applicationDeadline: ''
  })
  const [isLoading, setIsLoading] = useState(isEditMode)
  const [isSaving, setIsSaving] = useState(false)
  const [showValidationModal, setShowValidationModal] = useState(false)

  useEffect(() => {
    if (isEditMode && id) {
      employerService.getOpportunityById(id).then((data) => {
        if (data) setFormData(data)
        setIsLoading(false)
      })
    }
  }, [id, isEditMode])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    // Basic validation
    if (!formData.title || !formData.department || !formData.slots || !formData.duration || !formData.jobDescription) {
      setShowValidationModal(true)
      return
    }

    setIsSaving(true)
    try {
      await employerService.saveOpportunity(formData as Opportunity)
      navigate('/employer/opportunities')
    } catch (error) {
      console.error('Failed to save opportunity:', error)
      alert('Failed to save opportunity.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <main className={styles.pageContainer}>
        <div className={styles.loading}>Loading Opportunity Details...</div>
      </main>
    )
  }

  return (
    <main className={styles.pageContainer}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/employer/opportunities')}>
          <ArrowLeft size={20} color="#160e6f" />
          <span>Back to Opportunities</span>
        </button>
      </div>

      <div className={styles.formContainer}>
        <h1 className={styles.pageTitle}>
          {isEditMode ? 'Edit Opportunity' : 'Create New Opportunity'}
        </h1>

        <div className={styles.formGrid}>
          {/* Left Column */}
          <div className={styles.col}>
            <div className={styles.field}>
              <label>Position Title *</label>
              <input 
                type="text" 
                name="title"
                value={formData.title || ''}
                onChange={handleChange}
                placeholder="e.g IT Intern" 
              />
            </div>
            
            <div className={styles.field}>
              <label>Department *</label>
              <input 
                type="text" 
                name="department"
                value={formData.department || ''}
                onChange={handleChange}
                placeholder="e.g IT Department" 
              />
            </div>
            
            <div className={styles.field}>
              <label>Number of Slots *</label>
              <input 
                type="number" 
                name="slots"
                value={formData.slots || ''}
                onChange={handleChange}
                placeholder="Enter Number of Slots" 
              />
            </div>
            
            <div className={styles.field}>
              <label>Internship Duration *</label>
              <input 
                type="number" 
                name="duration"
                value={formData.duration || ''}
                onChange={handleChange}
                placeholder="Enter Internship Duration (hours)" 
              />
            </div>
            
            <div className={styles.field}>
              <label>Job Description *</label>
              <textarea 
                name="jobDescription"
                value={formData.jobDescription || ''}
                onChange={handleChange}
                placeholder="Describe the role and responsibilities..." 
                rows={6}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className={styles.col}>
            <div className={styles.field}>
              <label>Required Skills</label>
              <textarea 
                name="requiredSkills"
                value={formData.requiredSkills || ''}
                onChange={handleChange}
                placeholder="Enter required skills..." 
                rows={6}
              />
            </div>

            <div className={styles.field}>
              <label>Qualifications</label>
              <textarea 
                name="qualifications"
                value={formData.qualifications || ''}
                onChange={handleChange}
                placeholder="Enter qualifications..." 
                rows={6}
              />
            </div>

            <div className={styles.field}>
              <label>Application Deadline</label>
              <div className={styles.dateInputWrapper}>
                <input 
                  type="date" 
                  name="applicationDeadline"
                  value={formData.applicationDeadline || ''}
                  onChange={handleChange}
                />
                <CalendarIcon className={styles.dateIcon} size={20} color="#160e6f" />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <button 
            className={styles.cancelBtn} 
            onClick={() => navigate('/employer/opportunities')}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button 
            className={styles.saveBtn} 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : (isEditMode ? 'Save' : 'Publish Opportunity')}
          </button>
        </div>
      </div>

      {showValidationModal && (
        <div className={styles.modalOverlay} onClick={() => setShowValidationModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Missing Information</h2>
            <p className={styles.modalText}>
              Please fill out all required fields before saving.
            </p>
            <div className={styles.modalActions}>
              <button 
                className={styles.okBtn} 
                onClick={() => setShowValidationModal(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default CreateOpportunityPage
