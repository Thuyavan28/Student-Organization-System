// Proves what the indexes buy at realistic volume, on a TEMPORARY schema that is dropped at the end.
//   node scripts/index-scale-proof.mjs
// It builds tables shaped like transactions/users/orders (300k / 100k / 150k rows), times the app's query shapes with only
// primary keys, then creates the same indexes as prisma/sql/indexes.sql and times them again. Your real tables are not touched.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const run = (sql) => prisma.$executeRawUnsafe(sql);

const TXN = Number(process.env.TXN_ROWS || 300000);
const USERS = Number(process.env.USER_ROWS || 100000);
const ORDERS = Number(process.env.ORDER_ROWS || 150000);

function summarise(plan) {
  const scans = [];
  let sort = false;
  (function walk(n) {
    if (/Scan/.test(n['Node Type'])) scans.push(n['Node Type'] + (n['Index Name'] ? ` (${n['Index Name'].replace('idx_demo_', '')})` : ''));
    if (n['Node Type'] === 'Sort') sort = true;
    (n.Plans ?? []).forEach(walk);
  })(plan.Plan);
  return { scans: [...new Set(scans)], sort, ms: plan['Execution Time'] };
}
async function time(sql) {
  let best;
  for (let i = 0; i < 3; i += 1) {
    const rows = await prisma.$queryRawUnsafe(`EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`);
    const s = summarise(rows[0]['QUERY PLAN'][0]);
    if (!best || s.ms < best.ms) best = s;
  }
  return best;
}

const QUERIES = {
  'ledger: newest 10': `SELECT t.id, t.amount FROM idx_demo.txn t ORDER BY t.occurred_at DESC, t.id DESC LIMIT 10`,
  'ledger: INCOME+DUES newest 10': `SELECT t.id FROM idx_demo.txn t WHERE t.type = 'INCOME' AND t.category = 'DUES' ORDER BY t.occurred_at DESC, t.id DESC LIMIT 10`,
  'ledger: description contains "ticket"': `SELECT t.id FROM idx_demo.txn t WHERE t.description ILIKE '%ticket sale #77%' ORDER BY t.occurred_at DESC LIMIT 10`,
  'finance: SUM(income)': `SELECT COALESCE(SUM(amount),0) FROM idx_demo.txn WHERE type = 'INCOME'`,
  'ledger: one event, by type': `SELECT type, SUM(amount) FROM idx_demo.txn WHERE event_id = 4242 GROUP BY type`,
  'orders: newest 10': `SELECT o.id FROM idx_demo.orders o ORDER BY o.created_at DESC, o.id DESC LIMIT 10`,
  'orders: one member newest 10': `SELECT o.id FROM idx_demo.orders o WHERE o.user_id = 777 ORDER BY o.created_at DESC LIMIT 10`,
  'users: name/email contains "patel"': `SELECT u.id FROM idx_demo.users u WHERE u.name ILIKE '%zq12345%' OR u.email ILIKE '%zq12345%' LIMIT 10`,
};

const INDEXES = [
  `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
  `CREATE INDEX idx_demo_txn_occ ON idx_demo.txn (occurred_at DESC, id DESC)`,
  `CREATE INDEX idx_demo_txn_type_occ ON idx_demo.txn (type, occurred_at DESC, id DESC)`,
  `CREATE INDEX idx_demo_txn_cat_occ ON idx_demo.txn (category, occurred_at DESC, id DESC)`,
  `CREATE INDEX idx_demo_txn_type_amt ON idx_demo.txn (type) INCLUDE (amount)`,
  `CREATE INDEX idx_demo_txn_event ON idx_demo.txn (event_id, type) WHERE event_id IS NOT NULL`,
  `CREATE INDEX idx_demo_txn_desc_trgm ON idx_demo.txn USING gin (description gin_trgm_ops)`,
  `CREATE INDEX idx_demo_ord_created ON idx_demo.orders (created_at DESC, id DESC)`,
  `CREATE INDEX idx_demo_ord_user ON idx_demo.orders (user_id, created_at DESC)`,
  `CREATE INDEX idx_demo_users_name_trgm ON idx_demo.users USING gin (name gin_trgm_ops)`,
  `CREATE INDEX idx_demo_users_email_trgm ON idx_demo.users USING gin (email gin_trgm_ops)`,
];

try {
  console.log(`Building temporary data: ${TXN} ledger rows, ${USERS} users, ${ORDERS} orders ...`);
  await run('DROP SCHEMA IF EXISTS idx_demo CASCADE');
  await run('CREATE SCHEMA idx_demo');
  await run(`CREATE TABLE idx_demo.users (id int PRIMARY KEY, name text, email text)`);
  await run(`INSERT INTO idx_demo.users SELECT g, 'Student ' || md5(g::text), 'student' || g || '@example.com' FROM generate_series(1, ${USERS}) g`);
  await run(`CREATE TABLE idx_demo.txn (id serial PRIMARY KEY, type text, category text, amount int, description text, occurred_at timestamptz, event_id int)`);
  await run(`INSERT INTO idx_demo.txn (type, category, amount, description, occurred_at, event_id)
    SELECT CASE WHEN g % 3 = 0 THEN 'EXPENSE' ELSE 'INCOME' END,
           (ARRAY['DUES','TICKETS','MERCHANDISE','DONATION','VENUE','FOOD','SUPPLIES'])[1 + g % 7],
           100 + g % 5000, 'Ticket sale #' || g, now() - (g || ' minutes')::interval * 7, CASE WHEN g % 4 = 0 THEN g % 9000 ELSE NULL END
    FROM generate_series(1, ${TXN}) g`);
  await run(`CREATE TABLE idx_demo.orders (id serial PRIMARY KEY, user_id int, total int, created_at timestamptz)`);
  await run(`INSERT INTO idx_demo.orders (user_id, total, created_at) SELECT 1 + g % ${USERS}, 500 + g % 4000, now() - (g || ' minutes')::interval * 11 FROM generate_series(1, ${ORDERS}) g`);
  await run('ANALYZE idx_demo.users');
  await run('ANALYZE idx_demo.txn');
  await run('ANALYZE idx_demo.orders');

  const before = {};
  for (const [name, sql] of Object.entries(QUERIES)) before[name] = await time(sql);

  console.log('Creating the indexes ...');
  const t0 = performance.now();
  for (const sql of INDEXES) await run(sql);
  await run('ANALYZE idx_demo.users');
  await run('ANALYZE idx_demo.txn');
  await run('ANALYZE idx_demo.orders');
  console.log(`  ${INDEXES.length - 1} indexes built in ${((performance.now() - t0) / 1000).toFixed(1)} s`);

  console.log(`\n${'query'.padEnd(40)} ${'WITHOUT'.padStart(10)}   ${'WITH'.padStart(9)}   speed-up   plan with indexes`);
  for (const [name, sql] of Object.entries(QUERIES)) {
    const after = await time(sql);
    const b = before[name];
    console.log(`${name.padEnd(40)} ${(b.ms.toFixed(2) + ' ms').padStart(10)}   ${(after.ms.toFixed(2) + ' ms').padStart(9)}   ${(b.ms / after.ms).toFixed(0).padStart(6)}x   ${after.scans.join(', ')}${after.sort ? ' + SORT' : ''}   (was: ${b.scans.join(', ')}${b.sort ? ' + SORT' : ''})`);
  }
} finally {
  await run('DROP SCHEMA IF EXISTS idx_demo CASCADE');
  console.log('\nTemporary schema dropped. Real tables untouched.');
  await prisma.$disconnect();
}
process.exit(0);
