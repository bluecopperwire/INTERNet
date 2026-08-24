import type { PaginatedResponse } from '../types/employer.types';

export function paginate<T>(
  data: T[],
  page: number,
  limit: number,
  total = data.length,
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

export function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
