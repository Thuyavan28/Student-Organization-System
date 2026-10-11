// Adds dummy members for demos. Safe to run again: existing emails are skipped.
// Run from the backend folder:  node scripts/seed-members.js
import bcrypt from 'bcrypt';
import { prisma } from '../src/config/prisma.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const PASSWORD = 'Password@123';

const FIRST = ['Aarav', 'Diya', 'Rohan', 'Ananya', 'Karthik', 'Meera', 'Vikram', 'Priya', 'Arjun', 'Sneha', 'Rahul', 'Isha', 'Nikhil', 'Pooja', 'Siddharth', 'Kavya', 'Manish', 'Divya', 'Harsh', 'Lakshmi', 'Varun', 'Nisha', 'Aditya', 'Riya', 'Suresh', 'Tanvi', 'Gautam', 'Swati', 'Dev', 'Anjali'];
const LAST = ['Sharma', 'Patel', 'Iyer', 'Reddy', 'Nair', 'Gupta', 'Singh', 'Menon', 'Das', 'Rao', 'Kumar', 'Joshi', 'Verma', 'Pillai', 'Bose'];
const DEPARTMENTS = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Business Administration', 'Biotechnology', 'Design', 'Mathematics'];

const pick = (list, i) => list[i % list.length];

const tiers = await prisma.membershipTier.findMany({ orderBy: { id: 'asc' } });
if (tiers.length === 0) {
  console.error('No membership tiers found. Create tiers first.');
  process.exit(1);
}
const passwordHash = await bcrypt.hash(PASSWORD, 10);
const now = Date.now();
let created = 0;

for (let i = 0; i < FIRST.length; i += 1) {
  const name = `${FIRST[i]} ${pick(LAST, i * 7 + 3)}`;
  const email = `${FIRST[i].toLowerCase()}.${pick(LAST, i * 7 + 3).toLowerCase()}${i + 1}@student.example.com`;
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) continue;

  // Mix of states so every screen has something to show: mostly active, some expiring soon, expired, pending, cancelled.
  const bucket = i % 10;
  let membershipStatus = 'ACTIVE';
  let expiresAt = new Date(now + (60 + i * 9) * DAY_MS);
  let duesPaid = true;
  if (bucket === 3) expiresAt = new Date(now + (5 + (i % 20)) * DAY_MS); // expiring within a month
  if (bucket === 6) { membershipStatus = 'EXPIRED'; expiresAt = new Date(now - (10 + i) * DAY_MS); }
  if (bucket === 8) { membershipStatus = 'PENDING'; expiresAt = null; duesPaid = false; }
  if (bucket === 9) { membershipStatus = 'CANCELLED'; expiresAt = new Date(now - 30 * DAY_MS); }

  const tier = tiers[i % tiers.length];
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'MEMBER',
      member: {
        create: {
          studentId: `SK2026-${String(100 + i).padStart(3, '0')}`,
          department: pick(DEPARTMENTS, i),
          year: (i % 4) + 1,
          phone: `+91 98${String(10000000 + i * 137531).slice(0, 8)}`,
          tierId: tier.id,
          membershipStatus,
          joinedAt: new Date(now - (20 + i * 11) * DAY_MS),
          expiresAt,
          duesPaid,
        },
      },
    },
  });
  created += 1;
}

console.log(`Added ${created} dummy members (${FIRST.length - created} already existed). Password for all: ${PASSWORD}`);
await prisma.$disconnect();
process.exit(0);
