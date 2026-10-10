import { z } from 'zod';

// The dashboard takes no input; this schema documents that and rejects stray query parameters.
export const dashboardQuery = z.object({}).strip();
