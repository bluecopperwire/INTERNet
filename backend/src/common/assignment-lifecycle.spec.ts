import {
  ASSIGNMENT_STATUSES,
  canTransitionAssignment,
  isActiveAssignment,
  isAwaitingCompletion,
  isCurrentAssignment,
} from './assignment-lifecycle';

describe('final assignment lifecycle', () => {
  const allowed = new Set([
    'pending->ongoing',
    'pending->withdrawn',
    'pending->cancelled',
    'ongoing->complete_company',
    'ongoing->withdrawn',
    'ongoing->cancelled',
    'complete_company->complete_student',
    'complete_student->finalized',
    'withdrawn->finalized',
    'cancelled->finalized',
  ]);

  it('accepts exactly the approved transition matrix', () => {
    for (const from of ASSIGNMENT_STATUSES) {
      for (const to of ASSIGNMENT_STATUSES) {
        expect(canTransitionAssignment(from, to)).toBe(
          allowed.has(`${from}->${to}`),
        );
      }
    }
  });

  it('keeps finalized terminal and distinguishes current from active', () => {
    expect(ASSIGNMENT_STATUSES.filter(isCurrentAssignment)).toEqual([
      'pending',
      'ongoing',
      'complete_company',
      'complete_student',
      'withdrawn',
      'cancelled',
    ]);
    expect(ASSIGNMENT_STATUSES.filter(isActiveAssignment)).toEqual([
      'pending',
      'ongoing',
    ]);
    expect(
      ASSIGNMENT_STATUSES.some((status) =>
        canTransitionAssignment('finalized', status),
      ),
    ).toBe(false);
  });

  it('derives Awaiting Completion without adding a persisted status', () => {
    expect(isAwaitingCompletion('ongoing', 11_999, 12_000)).toBe(false);
    expect(isAwaitingCompletion('ongoing', 12_000, 12_000)).toBe(true);
    expect(isAwaitingCompletion('complete_company', 12_000, 12_000)).toBe(
      false,
    );
    expect(ASSIGNMENT_STATUSES).not.toContain('awaiting_completion');
  });
});
