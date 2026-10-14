import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { getPaginationRange } from '../utils/pagination-range'
import styles from './TablePagination.module.css'

const DEFAULT_PAGE_SIZES = [5, 10, 15] as const

interface TablePaginationProps {
  page: number
  pageSize: number
  totalRecords: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageSizes?: readonly number[]
}

export function TablePagination({
  page,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  pageSizes = DEFAULT_PAGE_SIZES,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const { start, end } = getPaginationRange(safePage, pageSize, totalRecords)
  const isFirstPage = safePage === 1
  const isLastPage = safePage === totalPages

  return (
    <nav className={styles.pagination} aria-label="Table pagination">
      <div className={styles.summary}>
        <label className={styles.pageSizeControl}>
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
        <span className={styles.range} aria-live="polite">
          {start}-{end} of {totalRecords}
        </span>
      </div>

      <div className={styles.navigation}>
        <button type="button" aria-label="First page" disabled={isFirstPage} onClick={() => onPageChange(1)}>
          <ChevronsLeft size={18} aria-hidden="true" />
        </button>
        <button type="button" aria-label="Previous page" disabled={isFirstPage} onClick={() => onPageChange(safePage - 1)}>
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <button type="button" className={styles.currentPage} aria-label={`Page ${safePage}`} aria-current="page" onClick={() => onPageChange(safePage)}>
          {safePage}
        </button>
        <button type="button" aria-label="Next page" disabled={isLastPage} onClick={() => onPageChange(safePage + 1)}>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <button type="button" aria-label="Last page" disabled={isLastPage} onClick={() => onPageChange(totalPages)}>
          <ChevronsRight size={18} aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}

export default TablePagination
