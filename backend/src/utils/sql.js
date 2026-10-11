import { Prisma } from '@prisma/client';

// Small helpers for the hand-written read queries. Values always go through Prisma.sql parameters (never string
// concatenation); the only raw fragments are column names and ASC/DESC picked from fixed whitelists.

// "%" and "_" typed by a user must match themselves, not act as wildcards.
export const likePattern = (text) => `%${String(text).replace(/[\%_]/g, '\$&')}%`;

// WHERE ... AND ... from a list of Prisma.sql fragments (an empty list means no filter).
export const whereAll = (conditions) => (conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty);

// ORDER BY from a whitelist map, e.g. orderBy({ name: 'u.name' }, 'name', 'desc', 'm.id').
export function orderBy(columns, key, direction, tiebreaker) {
  const column = columns[key] ?? Object.values(columns)[0];
  const dir = String(direction).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  return Prisma.raw(`ORDER BY ${column} ${dir}, ${tiebreaker} ${dir === 'DESC' ? 'DESC' : 'ASC'}`);
}
