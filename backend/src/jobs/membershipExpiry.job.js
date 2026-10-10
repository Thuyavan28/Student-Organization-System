import cron from 'node-cron';
import { prisma } from '../config/prisma.js';
import { sendBulkEmail } from '../utils/mailer.js';

const DAY_MS = 24 * 60 * 60 * 1000;
export const REMINDER_WINDOW_DAYS = 30;
const REMINDER_REPEAT_DAYS = 7;

// Flips lapsed memberships to EXPIRED and emails members whose membership ends within 30 days
// (at most once a week per member).
export async function runMembershipExpiry(now = new Date()) {
  const { count: expired } = await prisma.member.updateMany({
    where: { membershipStatus: 'ACTIVE', expiresAt: { lte: now } },
    data: { membershipStatus: 'EXPIRED' },
  });

  const due = await prisma.member.findMany({
    where: {
      membershipStatus: 'ACTIVE',
      expiresAt: { gt: now, lte: new Date(now.getTime() + REMINDER_WINDOW_DAYS * DAY_MS) },
      OR: [{ lastRenewalReminderAt: null }, { lastRenewalReminderAt: { lt: new Date(now.getTime() - REMINDER_REPEAT_DAYS * DAY_MS) } }],
    },
    select: { id: true, user: { select: { email: true } } },
  });

  let emailStatus = null;
  if (due.length > 0) {
    const result = await sendBulkEmail({
      to: due.map((m) => m.user.email),
      subject: 'Your Skyline Student Association membership expires soon',
      text: 'Your membership expires within 30 days. Log in to ClubFlow and renew from your profile page to keep your member prices.',
    });
    emailStatus = result.status;
    await prisma.member.updateMany({ where: { id: { in: due.map((m) => m.id) } }, data: { lastRenewalReminderAt: now } });
  }

  return { expired, remindersSent: due.length, emailStatus, checkedAt: now };
}

export function scheduleMembershipExpiry() {
  cron.schedule('0 2 * * *', () => {
    runMembershipExpiry()
      .then((r) => console.log(`[membershipExpiry] expired ${r.expired}, reminders ${r.remindersSent}`))
      .catch((err) => console.error('[membershipExpiry] failed:', err));
  });
}
