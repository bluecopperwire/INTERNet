import { SelectQueryBuilder } from 'typeorm';
import { PaginationDto } from '../dto/pagination.dto';
import { PaginatedResponse } from '../interfaces/paginated-response.interface';

export async function applyPagination<T extends object>(
  qb: SelectQueryBuilder<T>,
  paginationDto?: PaginationDto,
): Promise<PaginatedResponse<T>> {
  const page = Math.max(1, Number(paginationDto?.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(paginationDto?.limit) || 20));
  const offset = (page - 1) * limit;

  const [data, total] = await qb.skip(offset).take(limit).getManyAndCount();
  const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function applyRawPagination<T = any>(
  qb: SelectQueryBuilder<any>,
  paginationDto?: PaginationDto,
): Promise<PaginatedResponse<T>> {
  const page = Math.max(1, Number(paginationDto?.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(paginationDto?.limit) || 20));
  const offset = (page - 1) * limit;

  const total = await qb.getCount();
  const data = await qb.offset(offset).limit(limit).getRawMany<T>();
  const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}
