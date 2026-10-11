// Shows how PostgreSQL actually runs the app's main queries: the scan type and the database-side execution time.
//   node scripts/index-report.mjs            (real tables)
// "Seq Scan" = reads the whole table. "Index Scan"/"Bitmap"/"Index Only Scan" = jumps straight to the matching rows.
import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The same shapes the API runs (see transactions/orders/expenses/members/events services).
export const QUERIES = {
  'ledger: newest 10 (page 1)': `SELECT t.id, t.amount FROM transactions t ORDER BY t.occurred_at DESC, t.id DESC LIMIT 10`,
  'ledger: INCOME + DUES, newest 10': `SELECT t.id FROM transactions t WHERE t.type = 'INCOME' AND t.category = 'DUES' ORDER BY t.occurred_at DESC, t.id DESC LIMIT 10`,
  'ledger: search description "ticket"': `SELECT t.id FROM transactions t WHERE t.description ILIKE '%ticket%' ORDER BY t.occurred_at DESC LIMIT 10`,
  'finance: total income (SUM)': `SELECT COALESCE(SUM(amount),0) FROM transactions WHERE type = 'INCOME'`,
  'orders: newest 10': `SELECT o.id FROM orders o ORDER BY o.created_at DESC, o.id DESC LIMIT 10`,
  'orders: one member newest 10': `SELECT o.id FROM orders o WHERE o.user_id = (SELECT user_id FROM orders LIMIT 1) ORDER BY o.created_at DESC LIMIT 10`,
  'members: search name "patel"': `SELECT m.id FROM members m JOIN users u ON u.id = m.user_id WHERE u.name ILIKE '%patel%' OR u.email ILIKE '%patel%' OR m.student_id ILIKE '%patel%' LIMIT 10`,
  'expenses: submitted, newest 12': `SELECT x.id FROM expenses x WHERE x.status = 'SUBMITTED' ORDER BY x.created_at DESC, x.id DESC LIMIT 12`,
  'events: upcoming published': `SELECT e.id FROM events e WHERE e.status = 'PUBLISHED' AND e.start_at > now() ORDER BY e.start_at ASC LIMIT 5`,
  'bookings: my bookings newest 10': `SELECT b.id FROM bookings b WHERE b.user_id = (SELECT user_id FROM bookings LIMIT 1) ORDER BY b.created_at DESC LIMIT 10`,
  'bookings: seats taken for an event': `SELECT COUNT(*) FROM bookings WHERE event_id = (SELECT event_id FROM bookings LIMIT 1) AND status = 'CONFIRMED'`,
  'tasks: open tasks for one event': `SELECT k.id FROM tasks k WHERE k.event_id = (SELECT event_id FROM tasks WHERE event_id IS NOT NULL LIMIT 1) AND k.status <> 'COMPLETED'`,
  'announcements: public feed': `SELECT a.id FROM announcements a WHERE a.archived_at IS NULL ORDER BY a.is_pinned DESC, a.published_at DESC, a.id DESC LIMIT 10`,
};

// Walks the plan JSON and returns the scan nodes used (and whether an explicit Sort was needed).
function summarise(plan) {
  const scans = [];
  let sort = false;
  (function walk(node) {
    if (/Scan/.test(node['Node Type'])) scans.push(`${node['Node Type']}${node['Index Name'] ? ` (${node['Index Name']})` : ''}`);
    if (node['Node Type'] === 'Sort') sort = true;
    (node.Plans ?? []).forEach(walk);
  })(plan.Plan);
  return { scans: [...new Set(scans)], sort, ms: plan['Execution Time'] };
}

export async function report(label, queries = QUERIES, client = prisma) {
  console.log(`\n=== ${label}`);
  const out = {};
  for (const [name, sql] of Object.entries(queries)) {
    let best;
    // run twice and keep the faster one, so a cold cache does not distort the figure
    for (let i = 0; i < 2; i += 1) {
      const rows = await client.$queryRawUnsafe(`EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`);
      const s = summarise(rows[0]['QUERY PLAN'][0]);
      if (!best || s.ms < best.ms) best = s;
    }
    out[name] = best;
    console.log(`${name.padEnd(38)} ${String(best.ms.toFixed(2)).padStart(8)} ms   ${best.scans.join(', ')}${best.sort ? '  + SORT' : ''}`);
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await report('Real database, as it is now');
  await prisma.$disconnect();
  process.exit(0);
}
