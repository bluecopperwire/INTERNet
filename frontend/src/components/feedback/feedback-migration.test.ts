import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('notification migration safeguards', () => {
  it('keeps successful and failed student profile saves connected to toast feedback', () => {
    const profileEditor = readSource('../../features/intern-seeker/pages/ProfileEditorPage.tsx')

    expect(profileEditor).toContain("toast.success('Profile updated successfully!')")
    expect(profileEditor).toContain("toast.error('Failed to update profile. Please verify your information.')")
    expect(profileEditor).toContain("toast.error(err.message || 'Failed to save profile.')")
  })

  it('preserves the internship prerequisite decision modal', () => {
    const applyModal = readSource('../../features/intern-seeker/components/ApplyOpportunityModal.tsx')

    expect(applyModal).toContain('Application Prerequisites Required')
    expect(applyModal).toContain('missingItems.map')
    expect(applyModal).toContain('role="dialog"')
  })

  it('keeps invalid requirement-file validation inline', () => {
    const requirementsPage = readSource('../../features/intern-seeker/pages/RequirementsPage.tsx')

    expect(requirementsPage).toContain('setError(msg)')
    expect(requirementsPage).not.toContain('toast.error(msg)')
    expect(requirementsPage).toContain('{error && <p className={styles.error} role="alert">{error}</p>}')
  })

  it('defines narrow-screen sizing and wrapping safeguards', () => {
    const toastStyles = readSource('./ToastViewport.module.css')

    expect(toastStyles).toContain('overflow-wrap: anywhere')
    expect(toastStyles).toContain('@media (max-width: 520px)')
    expect(toastStyles).toContain('width: calc(100vw - 20px)')
  })
})
