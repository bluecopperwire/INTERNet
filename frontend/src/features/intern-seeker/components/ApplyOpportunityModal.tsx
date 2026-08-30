import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { InternshipOpportunity, UserProfile } from '../types/internship.types';
import type { InternshipRequirement } from '../types/requirement.types';
import { useStudentStore } from '../stores/useStudentStore';
import { useToastStore } from '../../../stores/useToastStore';
import styles from './ApplyOpportunityModal.module.css';

interface ApplyOpportunityModalProps {
  opportunity: InternshipOpportunity;
  profile: UserProfile | null;
  requirements: InternshipRequirement[];
  onClose: () => void;
  onSuccess?: () => void;
}

export const ApplyOpportunityModal: React.FC<ApplyOpportunityModalProps> = ({
  opportunity,
  profile,
  requirements,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { submitApplication } = useStudentStore();
  const toast = useToastStore();

  const missingItems = useMemo(() => {
    const list: Array<{ title: string; link: string; linkText: string }> = [];

    // Check personal info
    if (
      !profile?.firstName ||
      !profile?.lastName ||
      !profile?.sex ||
      !profile?.birthdate ||
      !profile?.contactNumber ||
      !profile?.email ||
      !profile?.address?.street ||
      !profile?.address?.barangay ||
      !profile?.address?.city
    ) {
      list.push({
        title: 'Personal Information (Incomplete)',
        link: '/intern-seeker/profile/edit',
        linkText: 'Complete Personal Info',
      });
    }

    // Check academic info
    if (
      !profile?.academic?.schoolName ||
      !profile?.academic?.yearLevel ||
      !profile?.academic?.program
    ) {
      list.push({
        title: 'Academic Information (School, Program, Year Level)',
        link: '/intern-seeker/profile/edit',
        linkText: 'Complete Academic Info',
      });
    }

    // Check internship preferences
    if (
      !profile?.preferences?.requiredHours ||
      !profile?.preferences?.schedule?.length ||
      !profile?.preferences?.startDate ||
      !profile?.preferences?.preferredIndustries?.length
    ) {
      list.push({
        title: 'Internship Preferences (Required hours, Schedule, Preferred field)',
        link: '/intern-seeker/profile/edit',
        linkText: 'Complete Preferences',
      });
    }

    // Check requirements
    const requiredTypes = [
      { id: 'curriculum_vitae_resume', name: 'Curriculum Vitae (CV) / Resume' },
      { id: 'proof_of_residency', name: 'Proof of Residency (Quezon City)' },
      { id: 'latest_credentials', name: 'Latest Academic Credentials' },
      { id: 'letter_of_intent', name: 'Letter of Intent / Endorsement' },
    ];

    requiredTypes.forEach((req) => {
      const match = requirements.find((r) => r.id === req.id && r.status === 'submitted');
      if (!match) {
        list.push({
          title: `Required Document: ${req.name}`,
          link: '/intern-seeker/requirements',
          linkText: 'Upload Document',
        });
      }
    });

    return list;
  }, [profile, requirements]);

  const isEligible = missingItems.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEligible || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await submitApplication(Number(opportunity.id), remark.trim() || undefined);
      toast.success(
        `Application submitted for ${opportunity.position} at ${opportunity.companyName}!`,
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <header className={styles.header}>
          <div className={styles.badgeRow}>
            <span className={styles.tag}>{opportunity.workSetup}</span>
            {opportunity.isExclusive && <span className={styles.exclusiveTag}>PESO Exclusive</span>}
          </div>
          <h2 id="apply-modal-title">{opportunity.position}</h2>
          <p className={styles.companyName}>
            <Building2 size={16} />
            {opportunity.companyName}
          </p>
        </header>

        <div className={styles.body}>
          {!isEligible ? (
            <div className={styles.ineligibleSection}>
              <div className={styles.warningBanner}>
                <AlertCircle size={24} className={styles.warningIcon} />
                <div>
                  <h3>Application Prerequisites Required</h3>
                  <p>
                    QC PESO requires that your profile details and all 4 pre-referral documents
                    are submitted before applying to partner companies.
                  </p>
                </div>
              </div>

              <div className={styles.missingListContainer}>
                <h4>Pending Prerequisites ({missingItems.length}):</h4>
                <ul className={styles.missingList}>
                  {missingItems.map((item) => (
                    <li key={item.title} className={styles.missingItem}>
                      <span className={styles.itemTitle}>{item.title}</span>
                      <button
                        type="button"
                        className={styles.actionLink}
                        onClick={() => {
                          onClose();
                          navigate(item.link);
                        }}
                      >
                        {item.linkText} →
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={onClose}
                >
                  Close
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => {
                    onClose();
                    navigate('/intern-seeker/requirements');
                  }}
                >
                  Go to Requirements
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.eligibleForm}>
              <div className={styles.successBanner}>
                <CheckCircle2 size={22} className={styles.successIcon} />
                <div>
                  <h4>All Prerequisites Complete</h4>
                  <p>Your profile information and pre-referral documents are verified.</p>
                </div>
              </div>

              <div className={styles.summaryBox}>
                <div className={styles.summaryItem}>
                  <span>Applicant</span>
                  <strong>{profile?.firstName} {profile?.lastName}</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>School & Program</span>
                  <strong>{profile?.academic.schoolName} ({profile?.academic.program})</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>Required Hours</span>
                  <strong>{profile?.preferences.requiredHours} Hours</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>Submitted Documents</span>
                  <strong>4 / 4 Complete</strong>
                </div>
              </div>

              <label className={styles.field}>
                <span>Cover Note / Remarks (Optional)</span>
                <textarea
                  rows={3}
                  placeholder="Introduce yourself or highlight specific qualifications for this role..."
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                />
              </label>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting Application...' : 'Confirm & Apply'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
