// Removes rows left behind by interrupted automated test runs ("Test User ...", "Test event ...", test+...@example.com).
// Real demo data is never matched. Run: node scripts/clean-test-data.js
import { prisma } from '../src/config/prisma.js';

const users = await prisma.user.findMany({ where: { OR: [{ email: { startsWith: 'test+' } }, { name: { startsWith: 'Test User' } }] }, select: { id: true } });
const ids = users.map((u) => u.id);
const events = (await prisma.event.findMany({ where: { title: { startsWith: 'Test event' } }, select: { id: true } })).map((e) => e.id);
const bookings = (await prisma.booking.findMany({ where: { OR: [{ userId: { in: ids } }, { eventId: { in: events } }] }, select: { id: true } })).map((b) => b.id);
const expenses = (await prisma.expense.findMany({ where: { submittedById: { in: ids } }, select: { id: true } })).map((e) => e.id);
const orders = (await prisma.order.findMany({ where: { userId: { in: ids } }, select: { id: true } })).map((o) => o.id);
const r = {};
r.transactions = (await prisma.transaction.deleteMany({ where: { OR: [{ recordedById: { in: ids } }, { eventId: { in: events } }, { sourceType: 'BOOKING', sourceId: { in: [...bookings.map(String), ...bookings.map((b) => `${b}:refund`)] } }, { sourceType: 'EXPENSE', sourceId: { in: expenses.map(String) } }, { sourceType: 'ORDER', sourceId: { in: [...orders.map(String), ...orders.map((o) => `${o}:refund`)] } }] } })).count;
r.checkIns = (await prisma.checkIn.deleteMany({ where: { ticket: { bookingId: { in: bookings } } } })).count;
r.tickets = (await prisma.ticket.deleteMany({ where: { bookingId: { in: bookings } } })).count;
r.bookings = (await prisma.booking.deleteMany({ where: { id: { in: bookings } } })).count;
r.expenses = (await prisma.expense.deleteMany({ where: { id: { in: expenses } } })).count;
await prisma.orderItem.deleteMany({ where: { orderId: { in: orders } } });
r.orders = (await prisma.order.deleteMany({ where: { id: { in: orders } } })).count;
r.tasks = (await prisma.task.deleteMany({ where: { OR: [{ eventId: { in: events } }, { assigneeId: { in: ids } }, { createdById: { in: ids } }] } })).count;
r.events = (await prisma.event.deleteMany({ where: { id: { in: events } } })).count;
r.members = (await prisma.member.deleteMany({ where: { userId: { in: ids } } })).count;
let deleted = 0;
const left = [];
for (const id of ids) { try { await prisma.user.delete({ where: { id } }); deleted += 1; } catch (e) { left.push(id); } }
r.users = deleted;
r.usersLeft = left;
console.log(JSON.stringify(r));
await prisma.$disconnect();
process.exit(0);
