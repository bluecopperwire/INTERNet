import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import styles from './TableToolbar.module.css'

interface TableToolbarProps {
  children: ReactNode
  className?: string
  hasActiveFilters?: boolean
  onClearFilters?: () => void
}

export function TableToolbar({ children, className = '', hasActiveFilters = false, onClearFilters }: TableToolbarProps) {
  return (
    <div className={className || styles.toolbar}>
      {children}
      {hasActiveFilters && onClearFilters && (
        <button type="button" className={styles.clearButton} onClick={onClearFilters}>
          <X size={15} aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  )
}

export default TableToolbar
