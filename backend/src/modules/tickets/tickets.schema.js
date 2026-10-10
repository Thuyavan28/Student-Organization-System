import { z } from 'zod';
import { paginationShape } from '../../utils/pagination.js';

export const myTicketsQuery = z.object({ ...paginationShape });
