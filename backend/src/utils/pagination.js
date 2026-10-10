import { z } from 'zod';

export const MAX_PAGE_SIZE = 100;

export const paginationShape = {
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).optional(),
};

// Oversized page sizes are clamped rather than rejected so large lists stay bounded.
export function parsePagination(query = {}, defaultSize = 20) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(query.pageSize) || defaultSize));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function buildMeta(total, page, pageSize) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function paginated(data, total, { page, pageSize }) {
  return { data, meta: buildMeta(total, page, pageSize) };
}
