import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readSource = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('Companies Open For Internship cards', () => {
  it('maps the subtitle and description from company profile fields', () => {
    const adapter = readSource('./adapters/student.adapters.ts')
    const store = readSource('./stores/useStudentStore.ts')
    const page = readSource('./pages/InternshipPortalPage.tsx')

    expect(adapter).toContain('companyIndustry: dto.industryName')
    expect(adapter).toContain('companyDescription: dto.companyDescription')
    expect(store).toContain('industry: opp.companyIndustry')
    expect(store).toContain('about: opp.companyDescription')
    expect(page).toContain('{company.industry}')
    expect(page).toContain('{company.about}')
  })

  it('centers card headings and enforces the requested line limits', () => {
    const page = readSource('./pages/InternshipPortalPage.tsx')
    const styles = readSource('./pages/InternshipPortalPage.module.css')

    expect(page).toContain('styles.longCompanyName')
    expect(page).toContain('styles.veryLongCompanyName')
    expect(styles).toMatch(/\.companyCard h3[\s\S]*-webkit-line-clamp: 2/)
    expect(styles).toMatch(/\.companyCard h3[\s\S]*text-align: center/)
    expect(styles).toMatch(/\.companyIndustry[\s\S]*text-align: center/)
    expect(styles).toMatch(/\.companyDescription[\s\S]*-webkit-line-clamp: 3/)
    expect(styles).toMatch(/\.companyDescription[\s\S]*text-align: justify/)
  })
})
