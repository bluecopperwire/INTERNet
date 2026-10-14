export const ASSIGNMENT_STATUSES = [
  'pending',
  'ongoing',
  'complete_company',
  'complete_student',
  'withdrawn',
  'cancelled',
  'finalized',
] as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const ASSIGNMENT_TRANSITIONS: Readonly<
  Record<AssignmentStatus, readonly AssignmentStatus[]>
> = {
  pending: ['ongoing', 'withdrawn', 'cancelled'],
  ongoing: ['complete_company', 'withdrawn', 'cancelled'],
  complete_company: ['complete_student'],
  complete_student: ['finalized'],
  withdrawn: ['finalized'],
  cancelled: ['finalized'],
  finalized: [],
};

export function canTransitionAssignment(
  from: AssignmentStatus,
  to: AssignmentStatus,
): boolean {
  return ASSIGNMENT_TRANSITIONS[from].includes(to);
}

export function isCurrentAssignment(status: AssignmentStatus): boolean {
  return status !== 'finalized';
}

export function isActiveAssignment(status: AssignmentStatus): boolean {
  return status === 'pending' || status === 'ongoing';
}

export function isAwaitingCompletion(
  status: AssignmentStatus,
  renderedMinutes: number,
  requiredMinutes: number,
): boolean {
  return status === 'ongoing' && renderedMinutes >= requiredMinutes;
}
