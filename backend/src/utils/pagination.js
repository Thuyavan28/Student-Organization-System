import { z } from 'zod';

export const DEFAULT_PAGE_SIZE = 15;
export const MAX_PAGE_SIZE = 100;

// Oversized page sizes are clamped to MAX_PAGE_SIZE rather than rejected, so list endpoints stay bounded and a
// client asking for "as many as possible" still gets a working response.
export const paginationShape = {
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).transform((value) => Math.min(value, MAX_PAGE_SIZE)).optional(),
};

export function parsePagination(query = {}, defaultSize = DEFAULT_PAGE_SIZE) {
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
