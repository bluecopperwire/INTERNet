import { describe, expect, it } from 'vitest'
import {
  SIGNUP_INQUIRY_OPTIONS,
  SIGNUP_SEX_OPTIONS,
  toStudentInquiryMethod,
  toStudentSex,
} from './signup-options'

describe('signup options', () => {
  it('only offers female and male for new student accounts', () => {
    expect(SIGNUP_SEX_OPTIONS).toEqual(['Female', 'Male'])
    expect(toStudentSex('Female')).toBe('female')
    expect(toStudentSex('Male')).toBe('male')
    expect(toStudentSex('Prefer not to say')).toBeUndefined()
  })

  it('maps every inquiry label to the database enum value', () => {
    expect(SIGNUP_INQUIRY_OPTIONS).toEqual([
      'Walk in',
      'Email/ Online',
      'Phone Call',
      'School',
    ])
    expect(SIGNUP_INQUIRY_OPTIONS.map(toStudentInquiryMethod)).toEqual([
      'walk_in',
      'online',
      'phone_call',
      'school',
    ])
  })
})
