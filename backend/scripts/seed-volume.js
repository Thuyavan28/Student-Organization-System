// Tops the demo database up to a realistic volume so lists, paging and charts have plenty to show.
//   node scripts/seed-volume.js            (defaults: at least 210 members and 220 orders)
//   TARGET_MEMBERS=300 TARGET_ORDERS=400 node scripts/seed-volume.js
// Safe to run again: it only adds what is missing and never touches existing rows. All dummy users share the
// password Password@123 and use @student.example.com addresses.
import bcrypt from 'bcrypt';
import { prisma } from '../src/config/prisma.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const TARGET_MEMBERS = Number(process.env.TARGET_MEMBERS || 210);
const TARGET_ORDERS = Number(process.env.TARGET_ORDERS || 220);
const PASSWORD = 'Password@123';

const FIRST = ['Aarav', 'Diya', 'Rohan', 'Ananya', 'Karthik', 'Meera', 'Vikram', 'Priya', 'Arjun', 'Sneha', 'Rahul', 'Isha', 'Nikhil', 'Pooja', 'Siddharth', 'Kavya', 'Manish', 'Divya', 'Harsh', 'Lakshmi', 'Varun', 'Nisha', 'Aditya', 'Riya', 'Suresh', 'Tanvi', 'Gautam', 'Swati', 'Dev', 'Anjali', 'Ishaan', 'Naina', 'Kabir', 'Zara', 'Yash', 'Mira', 'Tarun', 'Aisha', 'Neel', 'Sana'];
const LAST = ['Sharma', 'Patel', 'Iyer', 'Reddy', 'Nair', 'Gupta', 'Singh', 'Menon', 'Das', 'Rao', 'Kumar', 'Joshi', 'Verma', 'Pillai', 'Bose', 'Khan', 'Mehta', 'Shah', 'Banerjee', 'Chopra'];
const DEPARTMENTS = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Business Administration', 'Biotechnology', 'Design', 'Mathematics', 'Commerce', 'Physics'];

const pick = (list, i) => list[i % list.length];
const rand = (n) => Math.floor(Math.random() * n);
const randomIn = (list) => list[rand(list.length)];
const discount = (amount, percent) => Math.round((amount * percent) / 100);

// ---------------- members ----------------
async function seedMembers() {
  const have = await prisma.member.count();
  const missing = Math.max(0, TARGET_MEMBERS - have);
  console.log(`Members: ${have} now, target ${TARGET_MEMBERS} -> adding ${missing}`);
  if (!missing) return;
  const tiers = await prisma.membershipTier.findMany({ orderBy: { id: 'asc' } });
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const now = Date.now();

  // Pick fresh, collision-free numbers by looking at the highest one already used.
  const used = await prisma.user.findMany({ where: { email: { startsWith: 'vol.' } }, select: { email: true } });
  let counter = used.reduce((max, u) => Math.max(max, Number(u.email.match(/^vol\.(\d+)\./)?.[1] ?? 0)), 0);
  const studentIds = new Set((await prisma.member.findMany({ select: { studentId: true } })).map((m) => m.studentId));

  const users = [];
  const profiles = [];
  for (let i = 0; i < missing; i += 1) {
    counter += 1;
    const first = pick(FIRST, counter * 3);
    const last = pick(LAST, counter * 7 + 1);
    let studentId = `VOL2026-${String(1000 + counter)}`;
    while (studentIds.has(studentId)) studentId += 'x';
    studentIds.add(studentId);
    const email = `vol.${counter}.${first.toLowerCase()}.${last.toLowerCase()}@student.example.com`;
    users.push({ name: `${first} ${last}`, email, passwordHash, role: 'MEMBER' });

    // Mostly active; some expiring soon, expired, pending, cancelled.
    const bucket = counter % 12;
    let membershipStatus = 'ACTIVE';
    let expiresAt = new Date(now + (45 + rand(300)) * DAY_MS);
    let duesPaid = true;
    if (bucket === 2 || bucket === 7) expiresAt = new Date(now + (3 + rand(26)) * DAY_MS);
    if (bucket === 4 || bucket === 9) { membershipStatus = 'EXPIRED'; expiresAt = new Date(now - (5 + rand(200)) * DAY_MS); }
    if (bucket === 10) { membershipStatus = 'PENDING'; expiresAt = null; duesPaid = false; }
    if (bucket === 11) { membershipStatus = 'CANCELLED'; expiresAt = new Date(now - (20 + rand(120)) * DAY_MS); }
    profiles.push({
      email, studentId, department: pick(DEPARTMENTS, counter), year: (counter % 4) + 1,
      phone: `+91 9${String(100000000 + counter * 7919).slice(0, 9)}`, tierId: tiers[counter % tiers.length].id,
      membershipStatus, joinedAt: new Date(now - (10 + rand(420)) * DAY_MS), expiresAt, duesPaid,
    });
  }
  await prisma.user.createMany({ data: users, skipDuplicates: true });
  const created = await prisma.user.findMany({ where: { email: { in: users.map((u) => u.email) } }, select: { id: true, email: true } });
  const idByEmail = new Map(created.map((u) => [u.email, u.id]));
  await prisma.member.createMany({
    data: profiles.map(({ email, ...profile }) => ({ ...profile, userId: idByEmail.get(email) })),
    skipDuplicates: true,
  });
  console.log(`  added ${missing} members`);
}

// ---------------- orders ----------------
async function seedOrders() {
  const have = await prisma.order.count();
  const missing = Math.max(0, TARGET_ORDERS - have);
  console.log(`Orders: ${have} now, target ${TARGET_ORDERS} -> adding ${missing}`);
  if (!missing) return;

  // Buyers are active members; their tier gives the merchandise discount, exactly as checkout would.
  const buyers = await prisma.member.findMany({
    where: { membershipStatus: 'ACTIVE', user: { isActive: true } },
    select: { userId: true, tier: { select: { merchDiscountPercent: true } } },
  });
  const variants = await prisma.productVariant.findMany({ where: { product: { isActive: true } }, include: { product: { select: { basePrice: true } } } });
  const now = Date.now();

  const orderRows = [];
  const plans = [];
  for (let i = 0; i < missing; i += 1) {
    const buyer = randomIn(buyers);
    const lineCount = 1 + rand(3);
    const chosen = new Set();
    while (chosen.size < lineCount) chosen.add(randomIn(variants).id);
    const percent = buyer.tier?.merchDiscountPercent ?? 0;
    const items = [...chosen].sort((a, b) => a - b).map((variantId) => {
      const variant = variants.find((v) => v.id === variantId);
      const quantity = 1 + rand(3);
      const gross = variant.product.basePrice * quantity;
      return { variantId, quantity, unitPrice: variant.product.basePrice, discountApplied: discount(gross, percent) };
    });
    const subtotal = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    const discountTotal = items.reduce((s, it) => s + it.discountApplied, 0);
    const roll = Math.random();
    const status = roll < 0.45 ? 'FULFILLED' : roll < 0.85 ? 'PAID' : 'CANCELLED';
    const createdAt = new Date(now - Math.floor(Math.random() * 180 * DAY_MS));
    orderRows.push({
      userId: buyer.userId, subtotal, discountTotal, total: subtotal - discountTotal, status,
      paymentStatus: status === 'CANCELLED' ? 'REFUNDED' : 'PAID', paymentMode: 'SIMULATED', createdAt, updatedAt: createdAt,
    });
    plans.push(items);
  }

  const BATCH = 100;
  let done = 0;
  for (let start = 0; start < orderRows.length; start += BATCH) {
    const slice = orderRows.slice(start, start + BATCH);
    const saved = await prisma.order.createManyAndReturn({ data: slice, select: { id: true, userId: true, total: true, status: true, createdAt: true } });
    const itemData = [];
    const ledger = [];
    saved.forEach((order, k) => {
      for (const item of plans[start + k]) itemData.push({ orderId: order.id, ...item });
      if (order.total > 0) {
        ledger.push({ type: 'INCOME', category: 'MERCHANDISE', amount: order.total, description: `Merchandise order #${order.id}`, sourceType: 'ORDER', sourceId: String(order.id), occurredAt: order.createdAt, recordedById: order.userId });
        if (order.status === 'CANCELLED') {
          ledger.push({ type: 'EXPENSE', category: 'MERCHANDISE', amount: order.total, description: `Merchandise refund #${order.id}`, sourceType: 'ORDER', sourceId: `${order.id}:refund`, occurredAt: new Date(order.createdAt.getTime() + DAY_MS), recordedById: order.userId });
        }
      }
    });
    await prisma.orderItem.createMany({ data: itemData });
    await prisma.transaction.createMany({ data: ledger, skipDuplicates: true });
    done += saved.length;
    console.log(`  orders ${done}/${missing}`);
  }
}

await seedMembers();
await seedOrders();
console.log('Done. Totals now:', JSON.stringify({ members: await prisma.member.count(), orders: await prisma.order.count(), users: await prisma.user.count() }));
await prisma.$disconnect();
process.exit(0);
