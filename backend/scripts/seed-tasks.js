// Adds demo event tasks (who is doing what, due dates, mixed progress) so the Tasks dashboard has something to show.
// Safe to run again: tasks are matched by title + event and only missing ones are added.
//   node scripts/seed-tasks.js
import { prisma } from '../src/config/prisma.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const now = Date.now();
const due = (days) => new Date(now + days * DAY_MS);

// title, description, status, due-in-days (negative = already passed)
const PLAN = {
  'Spring Gala': [
    ['Book the ballroom and confirm the layout', 'Confirm the booking, seating plan and A/V needs with the venue.', 'COMPLETED', -12],
    ['Design and print the programme', 'Final programme with the schedule and sponsor thanks.', 'IN_PROGRESS', 3],
    ['Arrange catering and a dietary-needs list', 'Collect dietary requirements from every ticket holder.', 'IN_PROGRESS', 5],
    ['Set up the registration desk', 'Table, banners and the QR check-in laptop.', 'PENDING', 9],
    ['Brief the volunteer door team', 'Walk through scanning, the not-a-member notice and the incident contact.', 'PENDING', 10],
    ['Collect and tag lost property', 'Bag and label anything left behind and post a notice.', 'PENDING', 12],
  ],
  'Photography Walk': [
    ['Scout and confirm the route', 'Walk the route and mark the photo stops.', 'COMPLETED', -4],
    ['Create the sign-up reminder post', 'Short post with the meeting point at the Clock Tower.', 'IN_PROGRESS', 1],
    ['Borrow tripods and spare memory cards', 'Check out the club kit and test each item.', 'PENDING', 4],
    ['Prepare the best-photo voting form', 'Simple form to vote on the day.', 'PENDING', 6],
  ],
  'Annual General Meeting': [
    ['Draft the agenda', 'Treasurer report, elections, club plans for next year.', 'IN_PROGRESS', 14],
    ['Collect the annual accounts from the treasurer', 'Income, expenses and the closing balance for the AGM pack.', 'PENDING', 18],
    ['Send the nomination call to members', 'Announcement for officer nominations.', 'PENDING', 7],
    ['Book the room and projector', 'Room for 60 plus the projector and microphone.', 'COMPLETED', -2],
  ],
};

const volunteers = await prisma.user.findMany({
  where: { role: 'VOLUNTEER', isActive: true, email: { not: { startsWith: 'test+' } }, name: { not: { startsWith: 'Test User' } } },
  select: { id: true, name: true },
  orderBy: { id: 'asc' },
});
const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true }, orderBy: { id: 'asc' }, select: { id: true } });
if (volunteers.length === 0 || !admin) {
  console.error('Need at least one volunteer and one admin account.');
  process.exit(1);
}

let added = 0;
let pick = 0;
for (const [eventTitle, tasks] of Object.entries(PLAN)) {
  const event = await prisma.event.findFirst({ where: { title: eventTitle }, select: { id: true } });
  if (!event) { console.log(`skip "${eventTitle}": event not found`); continue; }
  for (const [title, description, status, days] of tasks) {
    const exists = await prisma.task.findFirst({ where: { title, eventId: event.id }, select: { id: true } });
    if (exists) continue;
    const assignee = volunteers[pick % volunteers.length];
    pick += 1;
    await prisma.task.create({
      data: { title, description, status, eventId: event.id, assigneeId: pick % 7 === 0 ? null : assignee.id, dueDate: due(days), createdById: admin.id },
    });
    added += 1;
  }
}
console.log(`Added ${added} event tasks. Tasks now: ${await prisma.task.count()}`);
await prisma.$disconnect();
process.exit(0);
