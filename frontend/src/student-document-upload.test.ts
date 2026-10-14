import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(path, 'utf8')

describe('Student PDF requirement uploads', () => {
  it('restricts every My Requirements file picker and validation path to PDF', () => {
    const requirements = readSource('src/features/intern-seeker/pages/RequirementsPage.tsx')

    expect(requirements).toContain("name.endsWith('.pdf')")
    expect(requirements).toContain("file.type === 'application/pdf'")
    expect(requirements).toContain('accept=".pdf,application/pdf"')
    expect(requirements).toContain('Please select a PDF file no larger than 10 MB.')
    expect(requirements).not.toContain('accept=".pdf,.doc')
    expect(requirements).not.toContain('JPG, or PNG')
  })

  it('uploads DigiCV PDFs into the canonical resume requirement and uses the revised content', () => {
    const page = readSource('src/features/intern-seeker/pages/DigiCVPage.tsx')
    const styles = readSource('src/features/intern-seeker/pages/DigiCVPage.module.css')

    expect(page).toContain("const RESUME_REQUIREMENT_TYPE = 'curriculum_vitae_resume'")
    expect(page).toContain("const RESUME_REQUIREMENT_NAME = 'Curriculum Vitae (CV) / Resume'")
    expect(page).toContain('uploadRequirement(file, RESUME_REQUIREMENT_TYPE, RESUME_REQUIREMENT_NAME)')
    expect(page).toContain('accept=".pdf,application/pdf"')
    expect(page).toContain('Build a curriculum vitae that gets you hired!')
    expect(page).toContain('Upload your existing curriculum vitae or resume, or start from scratch<br />')
    expect(page).toContain('and create a professional one in just a few minutes.')
    expect(page).toContain('Upload Curriculum Vitae<br />or Resume')
    expect(page).toContain("isUploading ? 'Uploading...' : 'PDF File'")
    expect(page).not.toContain('PDF or DOCX')
    expect(page).not.toContain('Click to browse or drag and drop')
    expect(page).not.toContain('DigiCV creation steps')
    expect(page).not.toContain('01 Fill in your info')
    expect(styles).toContain('var(--upload-dash-color) 0 22px')
    expect(styles).not.toContain('.steps')
  })
})
