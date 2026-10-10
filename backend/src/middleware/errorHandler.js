import { z } from 'zod';
import { ApiError } from '../utils/apiError.js';

function send(res, status, code, message, details) {
  return res.status(status).json({ error: { code, message, details: details ?? null } });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err instanceof ApiError) return send(res, err.status, err.code, err.message, err.details);
  if (err instanceof z.ZodError) return send(res, 400, 'VALIDATION_ERROR', 'Invalid input', z.flattenError(err));
  if (err.code === 'P2002') return send(res, 409, 'CONFLICT', 'A record with these details already exists', { target: err.meta?.target });
  if (err.code === 'P2025') return send(res, 404, 'NOT_FOUND', 'Record not found');
  if (err.code === 'P2003') return send(res, 400, 'INVALID_REFERENCE', 'A linked record does not exist');
  if (err.name === 'MulterError') return send(res, 400, 'UPLOAD_ERROR', err.message);
  if (err.type === 'entity.parse.failed') return send(res, 400, 'INVALID_JSON', 'Request body is not valid JSON');
  console.error(err);
  return send(res, 500, 'INTERNAL_ERROR', 'Something went wrong');
}
