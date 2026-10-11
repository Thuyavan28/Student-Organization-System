// Proves order placement is fast AND safe. Run with the API started:  node scripts/order-proof.mjs
// It creates real orders through the HTTP API, checks the database directly, then removes everything it created.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const A = process.env.API || 'http://localhost:4000/api';
const prisma = new PrismaClient();
let failures = 0;
const check = (name, ok, detail = '') => { if (!ok) failures += 1; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };
const json = (path, init) => fetch(`${A}${path}`, init).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null), timing: r.headers.get('server-timing') }));
const login = async (email) => (await json('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'Password@123' }) })).body.data;
const member = await login('student20@example.com');
const admin = await login('admin@skyline.example.com');
const H = (t) => ({ Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' });
// The server requires an approved payment for exactly the order total, so each order first pays for itself the way the
// shop does: start a payment session, have the "phone" approve it, then place the order with the session id.
const memberRow = await prisma.member.findUnique({ where: { userId: member.user.id }, include: { tier: true } });
const memberPercent = memberRow && memberRow.membershipStatus === 'ACTIVE' && memberRow.expiresAt > new Date() ? memberRow.tier.merchDiscountPercent : 0;
const prices = new Map((await prisma.productVariant.findMany({ include: { product: true } })).map((v) => [v.id, v.product.basePrice]));
const totalFor = (items) => items.reduce((sum, i) => { const gross = prices.get(i.variantId) * i.quantity; return sum + gross - Math.round((gross * memberPercent) / 100); }, 0);
const order = async (items, token = member.token) => {
  const session = (await json('/payments/session', { method: 'POST', headers: H(token), body: JSON.stringify({ amount: totalFor(items), title: 'Proof order' }) })).body.data;
  await json(`/payments/session/${session.id}/approve`, { method: 'POST' });
  return json('/orders', { method: 'POST', headers: H(token), body: JSON.stringify({ items, paymentSessionId: session.id }) });
};
const setStock = (productId, variantId, stock) => json(`/products/${productId}/variants/${variantId}`, { method: 'PATCH', headers: H(admin.token), body: JSON.stringify({ stock }) });
const stockOf = async (id) => (await prisma.productVariant.findUnique({ where: { id } })).stock;

const variants = await prisma.productVariant.findMany({ where: { product: { isActive: true } }, include: { product: true }, orderBy: { id: 'asc' }, take: 3 });
const [va, vb] = variants;
const original = new Map(variants.map((v) => [v.id, v.stock]));
const createdOrderIds = [];

try {
  console.log('1. One order: speed and exact bookkeeping');
  await setStock(va.productId, va.id, 20);
  const times = [];
  let first;
  for (let i = 0; i < 3; i++) {
    const t = performance.now();
    const res = await order([{ variantId: va.id, quantity: 2 }]);
    times.push(Math.round(performance.now() - t));
    if (res.status === 201) createdOrderIds.push(res.body.data.id);
    first ??= res;
  }
  check('order created (HTTP 201)', first.status === 201, `HTTP ${first.status}`);
  console.log(`      order times: ${times.join(' ms, ')} ms   (before the change: 3,578 - 6,419 ms)`);
  const o = first.body.data;
  const row = await prisma.order.findUnique({ where: { id: o.id }, include: { items: true } });
  const ledger = await prisma.transaction.findMany({ where: { sourceType: 'ORDER', sourceId: String(o.id) } });
  check('stock decreased by exactly the quantity ordered (3 orders x 2)', (await stockOf(va.id)) === 20 - 3 * 2, `stock now ${await stockOf(va.id)}`);
  check('order row, items and totals are stored correctly', row && row.total === o.total && row.items.length === 1 && row.items[0].quantity === 2 && row.status === 'PAID');
  check('exactly one ledger income row for the order, equal to the total', ledger.length === 1 && ledger[0].amount === o.total && ledger[0].type === 'INCOME', `Rs ${(o.total / 100).toFixed(2)}`);
  check('total = subtotal - discount (member price rules applied)', o.total === o.subtotal - o.discountTotal && o.discountTotal >= 0, `discount ${o.discountTotal}`);
  check('response shape unchanged (items/variant/product/user)', o.items[0].variant.product.name && o.items[0].variant.size && o.user.email && o.status === 'PAID');

  console.log('2. All or nothing: one short line must stop the whole order');
  await setStock(va.productId, va.id, 10);
  await setStock(vb.productId, vb.id, 1);
  const ordersBefore = await prisma.order.count();
  const ledgerBefore = await prisma.transaction.count({ where: { sourceType: 'ORDER' } });
  const short = await order([{ variantId: va.id, quantity: 3 }, { variantId: vb.id, quantity: 2 }]);
  check('rejected with 409 OUT_OF_STOCK', short.status === 409 && short.body.error.code === 'OUT_OF_STOCK', short.body?.error?.message);
  check('the line that WAS available was not decremented', (await stockOf(va.id)) === 10 && (await stockOf(vb.id)) === 1);
  check('no order and no ledger row were created', (await prisma.order.count()) === ordersBefore && (await prisma.transaction.count({ where: { sourceType: 'ORDER' } })) === ledgerBefore);

  console.log('3. Oversell hammer: 40 simultaneous orders for 5 units');
  await setStock(va.productId, va.id, 5);
  const ordersB = await prisma.order.count();
  const ledgerB = await prisma.transaction.count({ where: { sourceType: 'ORDER' } });
  const t0 = performance.now();
  const results = await Promise.all(Array.from({ length: 40 }, () => order([{ variantId: va.id, quantity: 1 }])));
  const ms = Math.round(performance.now() - t0);
  const ok = results.filter((r) => r.status === 201);
  ok.forEach((r) => createdOrderIds.push(r.body.data.id));
  const refused = results.filter((r) => r.status === 409);
  check('exactly 5 orders succeed', ok.length === 5, `${ok.length} succeeded, ${refused.length} refused, ${results.length - ok.length - refused.length} other, in ${ms} ms`);
  check('the other 35 were refused with OUT_OF_STOCK', refused.length === 35 && refused.every((r) => r.body.error.code === 'OUT_OF_STOCK'));
  check('stock ended at exactly 0 (never negative)', (await stockOf(va.id)) === 0, `stock ${await stockOf(va.id)}`);
  check('database has exactly 5 new orders and 5 new ledger rows', (await prisma.order.count()) - ordersB === 5 && (await prisma.transaction.count({ where: { sourceType: 'ORDER' } })) - ledgerB === 5);

  console.log('4. Two products at once under contention (deadlock check)');
  await setStock(va.productId, va.id, 6);
  await setStock(vb.productId, vb.id, 6);
  const both = await Promise.all(Array.from({ length: 12 }, (_, i) => order(i % 2 ? [{ variantId: va.id, quantity: 1 }, { variantId: vb.id, quantity: 1 }] : [{ variantId: vb.id, quantity: 1 }, { variantId: va.id, quantity: 1 }])));
  both.filter((r) => r.status === 201).forEach((r) => createdOrderIds.push(r.body.data.id));
  const okBoth = both.filter((r) => r.status === 201).length;
  check('6 succeed, 6 refused, no deadlock or server error', okBoth === 6 && both.every((r) => [201, 409].includes(r.status)), `${okBoth} ok, statuses ${[...new Set(both.map((r) => r.status))].join('/')}`);
  check('both variants ended at exactly 0', (await stockOf(va.id)) === 0 && (await stockOf(vb.id)) === 0);
} finally {
  // remove everything this script created and restore the stock it changed
  await prisma.transaction.deleteMany({ where: { sourceType: 'ORDER', sourceId: { in: createdOrderIds.map(String) } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
  for (const v of variants) await prisma.productVariant.update({ where: { id: v.id }, data: { stock: original.get(v.id) } });
  await json('/health/cache');
  console.log(`\ncleaned up ${createdOrderIds.length} test orders and restored stock`);
  await prisma.$disconnect();
}
console.log(failures ? `\n${failures} CHECK(S) FAILED` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
