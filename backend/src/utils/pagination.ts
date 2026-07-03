import { Request } from 'express';
import type { PaginationParams, PaginatedResponse } from '../types';

export function parsePaginationParams(req: Request, maxLimit = 50): PaginationParams {
  const page = Math.min(10_000, Math.max(1, parseInt(req.query.page as string) || 1));
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPaginationResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit);
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}
