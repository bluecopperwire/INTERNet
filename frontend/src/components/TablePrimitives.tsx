import type { ReactNode } from 'react'
import styles from './TablePrimitives.module.css'

interface TableCellStackProps {
  primary: ReactNode
  secondary?: ReactNode
  tertiary?: ReactNode
  code?: boolean
  truncateSecondary?: boolean
  truncateTertiary?: boolean
}

export function TableCellStack({ primary, secondary, tertiary, code = false, truncateSecondary = false, truncateTertiary = false }: TableCellStackProps) {
  return (
    <span className={styles.cellStack}>
      <span className={styles.primary}>{displayValue(primary)}</span>
      {hasValue(secondary) && <span className={[code ? styles.code : styles.secondary, truncateSecondary ? styles.truncate : ''].filter(Boolean).join(' ')} title={truncateSecondary && typeof secondary === 'string' ? secondary : undefined}>{secondary}</span>}
      {hasValue(tertiary) && <span className={[styles.tertiary, truncateTertiary ? styles.truncate : ''].filter(Boolean).join(' ')} title={truncateTertiary && typeof tertiary === 'string' ? tertiary : undefined}>{tertiary}</span>}
    </span>
  )
}

export type StatusTone = 'success' | 'warning' | 'info' | 'danger' | 'neutral'

export function StatusBadge({ value, tone }: { value?: ReactNode; tone?: StatusTone }) {
  const label = typeof value === 'string' && value.trim() ? value : value || '—'
  const resolvedTone = tone ?? statusTone(String(label))
  return <span className={`${styles.statusBadge} ${styles[resolvedTone]}`}>{label}</span>
}

export function StatusTransition({ previous, next }: { previous?: string | null; next?: string | null }) {
  return (
    <span className={styles.transition}>
      <StatusBadge value={previous || '—'} />
      <span className={styles.arrow} aria-hidden="true">→</span>
      <StatusBadge value={next || '—'} />
    </span>
  )
}

export function TableActions({ children }: { children: ReactNode }) {
  return <span className={styles.actions}>{children}</span>
}

function displayValue(value: ReactNode) {
  if (value === null || value === undefined || value === '') return '—'
  return value
}

function hasValue(value: ReactNode) {
  return value !== null && value !== undefined && value !== ''
}

function statusTone(value: string): StatusTone {
  const normalized = value.trim().toLowerCase()
  if (!normalized || normalized === '—' || normalized.includes('unknown') || normalized.includes('archived') || normalized.includes('expired') || normalized.includes('withdrawn')) return 'neutral'
  if (normalized.includes('deactivated') || normalized.includes('rejected') || normalized.includes('declined') || normalized.includes('cancelled') || normalized.includes('absent') || normalized.includes('failed')) return 'danger'
  if (normalized.includes('pending') || normalized.includes('suspended') || normalized.includes('for review') || normalized.includes('awaiting')) return 'warning'
  if (normalized.includes('ongoing') || normalized.includes('under review') || normalized.includes('interview') || normalized.includes('processing') || normalized.includes('offer received')) return 'info'
  if (normalized.includes('active') || normalized.includes('accepted') || normalized.includes('complete') || normalized.includes('finalized') || normalized.includes('present') || normalized.includes('verified') || normalized.includes('approved')) return 'success'
  return 'neutral'
}
