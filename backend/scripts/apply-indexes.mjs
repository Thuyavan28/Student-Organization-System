// Applies prisma/sql/indexes.sql to the database, one statement at a time, and reports each result.
//   node scripts/apply-indexes.mjs
// Idempotent: indexes that already exist are skipped. Builds are quick at this size; on a very large table prefer
// running the statements with CREATE INDEX CONCURRENTLY during a quiet period.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const file = new URL('../prisma/sql/indexes.sql', import.meta.url);
const statements = readFileSync(file, 'utf8')
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .map((line) => line.replace(/\s+--.*$/, ''))
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);

const before = new Set((await prisma.$queryRaw`SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`).map((r) => r.indexname));
let created = 0;
let existing = 0;
let failed = 0;
for (const sql of statements) {
  const name = sql.match(/INDEX IF NOT EXISTS (\S+)/)?.[1];
  const t = performance.now();
  try {
    await prisma.$executeRawUnsafe(sql);
    if (name) {
      if (before.has(name)) existing += 1; else { created += 1; console.log(`  created ${name} (${Math.round(performance.now() - t)} ms)`); }
    } else {
      console.log(`  ran: ${sql.slice(0, 50)}`);
    }
  } catch (error) {
    failed += 1;
    console.log(`  FAILED ${name ?? sql.slice(0, 40)}: ${error.message.split('\n').pop()}`);
  }
}
console.log(`\nIndexes: ${created} created, ${existing} already existed, ${failed} failed.`);
await prisma.$disconnect();
process.exit(failed ? 1 : 0);
