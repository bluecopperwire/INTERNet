import { describe, expect, it } from 'vitest'
import { getPaginationRange } from '../utils/pagination-range'

describe('getPaginationRange', () => {
  it('returns the visible record range for a full page', () => {
    expect(getPaginationRange(2, 5, 18)).toEqual({ start: 6, end: 10 })
  })

  it('caps the last row at the total record count', () => {
    expect(getPaginationRange(4, 5, 18)).toEqual({ start: 16, end: 18 })
  })

  it('shows an empty range when no records exist', () => {
    expect(getPaginationRange(1, 5, 0)).toEqual({ start: 0, end: 0 })
  })
})
