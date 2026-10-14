import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readSource = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('student opportunity card text truncation', () => {
  it('keeps portal card company names and opportunity titles to one line', () => {
    const page = readSource('./pages/InternshipPortalPage.tsx')
    const styles = readSource('./pages/InternshipPortalPage.module.css')

    expect(page).toContain('className={styles.cardCompanyName}')
    expect(page).toContain('<h3 title={opportunity.position}>')
    expect(styles).toMatch(/\.cardCompanyName[\s\S]*text-overflow: ellipsis;[\s\S]*white-space: nowrap;/)
    expect(styles).toMatch(/\.opportunityCard h3[\s\S]*text-overflow: ellipsis;[\s\S]*white-space: nowrap;/)
  })

  it('keeps filtered-result company names and opportunity titles to one line', () => {
    const page = readSource('./pages/InternshipSearchPage.tsx')
    const styles = readSource('./pages/InternshipSearchPage.module.css')

    expect(page).toContain('className={styles.resultCompanyName}')
    expect(page).toContain('<strong title={opportunity.position}>')
    expect(styles).toMatch(/\.resultCompanyName[\s\S]*text-overflow: ellipsis;[\s\S]*white-space: nowrap;/)
    expect(styles).toMatch(/\.resultCard > strong[\s\S]*text-overflow: ellipsis;[\s\S]*white-space: nowrap;/)
  })
})
