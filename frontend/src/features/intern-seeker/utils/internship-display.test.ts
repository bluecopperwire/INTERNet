import { describe, expect, it } from 'vitest'
import { assignmentHasEnded, formatMinutes, formatWorkingDays, studentAssignmentStatus } from './internship-display'

describe('Student internship display helpers', () => {
  it.each([
    ['pending', 'Pending'],
    ['ongoing', 'Ongoing'],
    ['complete_company', 'Completed'],
    ['complete_student', 'Completed'],
    ['withdrawn', 'Withdrawn'],
    ['cancelled', 'Cancelled'],
    ['finalized', 'Finalized'],
  ] as const)('maps %s to %s', (status, label) => {
    expect(studentAssignmentStatus(status)).toBe(label)
  })

  it('preserves an exact non-contiguous workday selection', () => {
    expect(formatWorkingDays([1, 3, 4, 6])).toBe('Monday, Wednesday, Thursday, Saturday')
  })

  it('formats minute-based rendered and remaining durations', () => {
    expect(formatMinutes(12000)).toBe('200 hours')
    expect(formatMinutes(1935)).toBe('32 hours, 15 minutes')
  })

  it('uses Expected End Date semantics only for pending and ongoing', () => {
    expect(assignmentHasEnded('pending')).toBe(false)
    expect(assignmentHasEnded('ongoing')).toBe(false)
    expect(assignmentHasEnded('complete_company')).toBe(true)
    expect(assignmentHasEnded('withdrawn')).toBe(true)
    expect(assignmentHasEnded('cancelled')).toBe(true)
  })
})
