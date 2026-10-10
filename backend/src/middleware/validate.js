import { z } from 'zod';
import { badRequest } from '../utils/apiError.js';

// validate({ body, query, params }) parses each part with zod and replaces it with the parsed value.
export const validate = (schemas) => (req, res, next) => {
  for (const part of ['params', 'query', 'body']) {
    const schema = schemas[part];
    if (!schema) continue;
    const result = schema.safeParse(req[part] ?? {});
    if (!result.success) {
      return next(badRequest('VALIDATION_ERROR', 'Please check the highlighted fields', z.flattenError(result.error)));
    }
    // Express defines req.query as a getter, so it is redefined rather than assigned.
    Object.defineProperty(req, part, { value: result.data, writable: true, configurable: true, enumerable: true });
  }
  return next();
};
