export class ApiError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code, message, details) => new ApiError(400, code, message, details);
export const unauthorized = (message = 'Authentication required', code = 'UNAUTHORIZED') => new ApiError(401, code, message);
export const forbidden = (message = 'You do not have permission to do this', code = 'FORBIDDEN') => new ApiError(403, code, message);
export const notFound = (message = 'Record not found', code = 'NOT_FOUND') => new ApiError(404, code, message);
export const conflict = (code, message, details) => new ApiError(409, code, message, details);
