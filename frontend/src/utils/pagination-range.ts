export function getPaginationRange(page: number, pageSize: number, totalRecords: number) {
  if (totalRecords <= 0) return { start: 0, end: 0 }

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  return {
    start: (safePage - 1) * pageSize + 1,
    end: Math.min(safePage * pageSize, totalRecords),
  }
}
