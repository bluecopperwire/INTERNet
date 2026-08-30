import React, { useState, useEffect } from 'react'
import { ArrowLeft, User, Briefcase, Building, GraduationCap, Edit2 } from 'lucide-react'
import type { 
  AdminRecord, 
  StudentRecord, 
  EmployerRecord, 
  QCPesoRecord, 
  AccountStatus 
} from '../types/admin.types'
import { adminService } from '../services/admin.service'
import styles from './ManageRecordModal.module.css'

interface ManageRecordModalProps {
  recordId: string
  recordRole: 'Student' | 'Employer' | 'QC PESO Personnel'
  onClose: () => void
}

export function ManageRecordModal({ recordId, recordRole, onClose }: ManageRecordModalProps) {
  const [record, setRecord] = useState<AdminRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<AdminRecord>>({})
  
  // Status Confirmation Overlay
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    adminService.getRecordById(recordId, recordRole).then((data) => {
      setRecord(data)
      setEditForm(data)
      setIsLoading(false)
    })
  }, [recordId, recordRole])

  if (isLoading || !record) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContainer}>
          <div className={styles.loadingState}>Loading record details...</div>
        </div>
      </div>
    )
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'verified':
      case 'approved':
        return styles.badgeSuccess
      case 'pending':
        return styles.badgeWarning
      case 'inactive':
      case 'deactivated':
        return styles.badgeError
      default:
        return styles.badgeDefault
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleArrayChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const value = e.target.value
    setEditForm((prev) => ({
      ...prev,
      [fieldName]: value.split(',').map((s: string) => s.trim()),
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    const updated = await adminService.updateRecord(recordId, recordRole, editForm)
    setRecord(updated)
    setEditForm(updated)
    setIsEditing(false)
    setIsSaving(false)
  }

  const toggleStatus = async () => {
    const newStatus: AccountStatus = (record.status === 'Active' || record.status === 'Pending') ? 'Inactive' : 'Active'
    setIsSaving(true)
    await adminService.toggleRecordStatus(recordId, recordRole, newStatus)
    setRecord((prev) => (prev ? { ...prev, status: newStatus } : prev))
    setShowConfirm(false)
    setIsSaving(false)
  }

  const renderEditableText = (
    label: string, 
    name: string, 
    value: string | undefined, 
    placeholder?: string, 
    span?: boolean
  ) => {
    return (
      <div className={styles.infoGroup} style={span ? { gridColumn: 'span 2' } : {}}>
        <span className={styles.infoLabel}>{label}</span>
        {isEditing ? (
          <input 
            type="text" 
            className={styles.editInput} 
            name={name} 
            value={((editForm as Record<string, unknown>)[name] as string) ?? ''} 
            onChange={handleInputChange}
            placeholder={placeholder}
          />
        ) : (
          <span className={styles.infoValue}>{value || 'N/A'}</span>
        )}
      </div>
    )
  }

  const renderStudentSummary = (data: StudentRecord) => (
    <div className={styles.summarySection}>
      <h3 className={styles.sectionTitle}>
        <div className={styles.sectionIcon}><GraduationCap size={20} /></div>
        Student Profile Summary
      </h3>
      <div className={styles.infoGrid}>
        {renderEditableText('Full Name', 'fullName', data.fullName)}
        {renderEditableText('Sex', 'sex', data.sex)}
        {renderEditableText('Birthdate', 'birthdate', data.birthdate)}
        {renderEditableText('Contact Number', 'contactNumber', data.contactNumber)}
        {renderEditableText('Full Address', 'fullAddress', data.fullAddress, '', true)}
        {renderEditableText('Inquiry via', 'inquiryVia', data.inquiryVia)}
        {renderEditableText('School Name', 'schoolName', data.schoolName)}
        {renderEditableText('Program / Strand', 'programStrand', data.programStrand)}
        {renderEditableText('Year Level', 'yearLevel', data.yearLevel)}
        {renderEditableText('Required Hours', 'requiredHours', data.requiredHours)}
        
        <div className={styles.infoGroup}>
          <span className={styles.infoLabel}>Flexible Assignment</span>
          {isEditing ? (
            <select 
              className={styles.editInput}
              name="flexibleAssignment"
              value={(editForm as StudentRecord).flexibleAssignment ? 'true' : 'false'}
              onChange={(e) => setEditForm((prev) => ({ ...prev, flexibleAssignment: e.target.value === 'true' }))}
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : (
            <span className={styles.infoValue}>{data.flexibleAssignment ? 'Yes' : 'No'}</span>
          )}
        </div>

        <div className={styles.infoGroup} style={{ gridColumn: 'span 2' }}>
          <span className={styles.infoLabel}>Preferred Industries</span>
          {isEditing ? (
            <input 
              type="text" 
              className={styles.editInput} 
              value={((editForm as StudentRecord).preferredIndustries || []).join(', ')} 
              onChange={(e) => handleArrayChange(e, 'preferredIndustries')}
              placeholder="Comma separated..."
            />
          ) : (
            <span className={styles.infoValue}>{data.preferredIndustries?.join(', ') || 'N/A'}</span>
          )}
        </div>
        
        <div className={styles.infoGroup} style={{ gridColumn: 'span 2' }}>
          <span className={styles.infoLabel}>Schedule Availability</span>
          {isEditing ? (
            <input 
              type="text" 
              className={styles.editInput} 
              value={((editForm as StudentRecord).scheduleAvailability || []).join(', ')} 
              onChange={(e) => handleArrayChange(e, 'scheduleAvailability')}
              placeholder="Comma separated..."
            />
          ) : (
            <span className={styles.infoValue}>{data.scheduleAvailability?.join(', ') || 'N/A'}</span>
          )}
        </div>

        {renderEditableText('Start Date', 'startDate', data.startDate)}
        {renderEditableText('Host Organization Type', 'hostOrgType', data.hostOrgType)}
      </div>
    </div>
  )

  const renderEmployerSummary = (data: EmployerRecord) => (
    <div className={styles.summarySection}>
      <h3 className={styles.sectionTitle}>
        <div className={styles.sectionIcon}><Building size={20} /></div>
        Employer Profile Summary
      </h3>
      <div className={styles.infoGrid}>
        {renderEditableText('Company Name', 'companyName', data.companyName, '', true)}
        {renderEditableText('Company ID', 'companyId', data.companyId)}
        {renderEditableText('Industry', 'industry', data.industry)}
        {renderEditableText('Company Type', 'companyType', data.companyType)}
        {renderEditableText('Company Size', 'companySize', data.companySize)}
        {renderEditableText('Year Established', 'yearEstablished', data.yearEstablished)}
        {renderEditableText('Location', 'location', data.location, '', true)}
        {renderEditableText('Company Website', 'companyWebsite', data.companyWebsite, '', true)}
        {renderEditableText('Contact Person', 'contactPerson', data.contactPerson)}
        {renderEditableText('Contact Number', 'contactNumber', data.contactNumber)}
      </div>
    </div>
  )

  const renderQCPesoSummary = (data: QCPesoRecord) => (
    <div className={styles.summarySection}>
      <h3 className={styles.sectionTitle}>
        <div className={styles.sectionIcon}><Briefcase size={20} /></div>
        QC PESO Personnel Profile Summary
      </h3>
      <div className={styles.infoGrid}>
        {renderEditableText('First Name', 'firstName', data.firstName)}
        {renderEditableText('Middle Name', 'middleName', data.middleName)}
        {renderEditableText('Last Name', 'lastName', data.lastName)}
        {renderEditableText('Birthdate', 'birthdate', data.birthdate)}
        {renderEditableText('Employee ID Number', 'employeeId', data.employeeId)}
        {renderEditableText('Position / Designation', 'position', data.position)}
        {renderEditableText('Department / Office', 'department', data.department, '', true)}
        {renderEditableText('Contact Number', 'contactNumber', data.contactNumber)}
        {renderEditableText('Email', 'email', data.email)}
      </div>
    </div>
  )

  const isActive = record.status === 'Active' || record.status === 'Pending'

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
          {/* Gradient Header */}
          <div className={styles.modalHeader}>
            <div className={styles.headerLeft}>
              <button className={styles.backBtn} onClick={onClose}>
                <ArrowLeft size={16} />
                <span>Return</span>
              </button>
              <h1 className={styles.headerTitle}>Manage Record</h1>
              <p className={styles.headerSubtitle}>View and manage user details and account status.</p>
            </div>
            <div className={styles.headerRight}>
              <div className={styles.profileCircle}>
                {record.profileImageUrl ? (
                  <img src={record.profileImageUrl} alt="Profile" />
                ) : (
                  <User size={48} color="#160e6f" />
                )}
              </div>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className={styles.modalBody}>
            {/* Common Profile Header */}
            <div className={styles.commonProfileCard}>
              <div className={styles.commonProfileHeader}>
                <h2 className={styles.commonProfileName}>{record.fullName}</h2>
                <div className={styles.badgeRow}>
                  <span className={styles.roleBadge}>{record.role}</span>
                  <span className={`${styles.statusBadge} ${getStatusBadgeClass(record.status)}`}>
                    {record.status}
                  </span>
                </div>
              </div>
              
              <div className={styles.commonProfileGrid}>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Account Email</span>
                  <span className={styles.infoValue}>{record.email}</span>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Account ID</span>
                  <span className={styles.infoValue}>{record.id}</span>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Registered</span>
                  <span className={styles.infoValue}>{record.dateCreated}</span>
                </div>
              </div>
            </div>

            <div className={styles.actionsToolbar}>
              <button 
                className={styles.toggleEditBtn} 
                onClick={() => {
                  if (isEditing) {
                    setEditForm(record) // reset
                    setIsEditing(false)
                  } else {
                    setIsEditing(true)
                  }
                }}
              >
                <Edit2 size={16} />
                <span>{isEditing ? 'Cancel Edit' : 'Edit Record'}</span>
              </button>
            </div>

            {/* Dynamic Profile Summary */}
            {record.role === 'Student' && renderStudentSummary(record as StudentRecord)}
            {record.role === 'Employer' && renderEmployerSummary(record as EmployerRecord)}
            {record.role === 'QC PESO Personnel' && renderQCPesoSummary(record as QCPesoRecord)}
          </div>

          {/* Footer Actions */}
          <div className={styles.modalFooter}>
            <button 
              className={isActive ? styles.deactivateBtn : styles.activateBtn} 
              onClick={() => setShowConfirm(true)}
              disabled={isSaving}
            >
              {isActive ? 'Deactivate Account' : 'Activate Account'}
            </button>
            
            {isEditing && (
              <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Overlay */}
      {showConfirm && (
        <div className={styles.confirmOverlay} onClick={() => setShowConfirm(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>{isActive ? 'Deactivate Account' : 'Activate Account'}</h3>
            <p className={styles.confirmDesc}>
              Are you sure you want to {isActive ? 'deactivate' : 'activate'} the account for <strong>{record.fullName}</strong>?
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancelBtn} onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button 
                className={isActive ? styles.confirmDeactivateBtn : styles.confirmActivateBtn}
                onClick={toggleStatus}
              >
                Yes, {isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ManageRecordModal