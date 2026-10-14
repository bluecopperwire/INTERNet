import { describe, expect, it } from 'vitest'
import { getErrorMessage } from './error-message'

describe('getErrorMessage', () => {
  it('uses an API action failure message when available', () => {
    expect(getErrorMessage({ response: { data: { message: 'Update was rejected.' } } }, 'Fallback')).toBe('Update was rejected.')
  })

  it('joins API validation arrays for a readable toast', () => {
    expect(getErrorMessage({ response: { data: { message: ['First issue', 'Second issue'] } } }, 'Fallback')).toBe('First issue, Second issue')
  })

  it('falls back safely for unknown failures', () => {
    expect(getErrorMessage(null, 'Please try again.')).toBe('Please try again.')
  })
})
