import type { CSSProperties, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import styles from './DataTable.module.css'

export type DataTableAlign = 'left' | 'center' | 'right'
export type DataTableVariant = 'standard' | 'compact' | 'modal' | 'print'

// Shared constants intentionally live beside the table contract they configure.
// eslint-disable-next-line react-refresh/only-export-components
export const TABLE_COLUMN_WIDTHS = {
  identity: '260px',
  academic: '280px',
  account: '260px',
  contact: '260px',
  opportunity: '300px',
  placement: '300px',
  attendance: '270px',
  progress: '300px',
  timeline: '220px',
  period: '220px',
  registered: '160px',
  status: '190px',
  actions: '170px',
} as const

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  align?: DataTableAlign
  headerAlign?: DataTableAlign
  width?: string
  minWidth?: string
  noWrap?: boolean
  mobileLabel?: string
  hideOnMobile?: boolean
  className?: string
}

interface DataTableProps<T> {
  ariaLabel: string
  columns: readonly DataTableColumn<T>[]
  rows: readonly T[]
  rowKey: (row: T) => string | number
  variant?: DataTableVariant
  minWidth?: number
  loading?: boolean
  loadingRows?: number
  error?: string
  onRetry?: () => void
  emptyMessage?: string
  filteredEmptyMessage?: string
  hasActiveFilters?: boolean
  className?: string
  footer?: ReactNode
}

export function DataTable<T>({
  ariaLabel,
  columns,
  rows,
  rowKey,
  variant = 'standard',
  minWidth,
  loading = false,
  loadingRows = 4,
  error,
  onRetry,
  emptyMessage = 'No records are available yet.',
  filteredEmptyMessage = 'No records match the selected filters.',
  hasActiveFilters = false,
  className = '',
  footer,
}: DataTableProps<T>) {
  const tableStyle = minWidth ? ({ '--data-table-min-width': `${minWidth}px` } as CSSProperties) : undefined
  const stateMessage = hasActiveFilters ? filteredEmptyMessage : emptyMessage
  const rootClass = [styles.root, styles[variant], className].filter(Boolean).join(' ')

  if (error) {
    return (
      <div className={rootClass}>
        <div className={styles.errorState} role="alert">
          <AlertCircle size={22} aria-hidden="true" />
          <div>
            <strong>Unable to load records</strong>
            <span>{error}</span>
          </div>
          {onRetry && (
            <button type="button" onClick={onRetry}>
              <RefreshCw size={16} aria-hidden="true" />
              Retry
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={rootClass} aria-busy={loading || undefined}>
      <div className={styles.desktopViewport}>
        <table className={styles.table} aria-label={ariaLabel} style={tableStyle}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={[alignClass(column.headerAlign ?? column.align), column.noWrap ? styles.noWrap : ''].filter(Boolean).join(' ')}
                  style={columnStyle(column)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: loadingRows }, (_, index) => (
                <tr key={`loading-${index}`} className={styles.loadingRow}>
                  {columns.map((column) => (
                    <td key={column.key}><span className={styles.skeleton} /></td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={styles.emptyState}>{stateMessage}</td>
              </tr>
            ) : rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={[alignClass(column.align), column.noWrap ? styles.noWrap : '', column.className].filter(Boolean).join(' ')}
                    style={columnStyle(column)}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {variant !== 'print' && (
        <div className={styles.mobileList} role="list" aria-label={ariaLabel}>
          {loading ? (
            Array.from({ length: Math.min(loadingRows, 3) }, (_, index) => (
              <div className={styles.mobileCard} role="listitem" key={`mobile-loading-${index}`}>
                <span className={styles.mobileSkeleton} />
                <span className={styles.mobileSkeletonShort} />
              </div>
            ))
          ) : rows.length === 0 ? (
            <div className={styles.mobileEmpty}>{stateMessage}</div>
          ) : rows.map((row) => (
            <article className={styles.mobileCard} role="listitem" key={rowKey(row)}>
              {columns.filter((column) => !column.hideOnMobile).map((column) => (
                <div className={styles.mobileField} key={column.key}>
                  <span className={styles.mobileLabel}>{column.mobileLabel ?? column.header}</span>
                  <div className={[styles.mobileValue, alignClass(column.align)].filter(Boolean).join(' ')}>
                    {column.render(row)}
                  </div>
                </div>
              ))}
            </article>
          ))}
        </div>
      )}
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  )
}

function columnStyle<T>(column: DataTableColumn<T>): CSSProperties | undefined {
  if (!column.width && !column.minWidth) return undefined
  return { width: column.width, minWidth: column.minWidth }
}

function alignClass(align: DataTableAlign = 'left') {
  if (align === 'center') return styles.alignCenter
  if (align === 'right') return styles.alignRight
  return styles.alignLeft
}

export default DataTable
