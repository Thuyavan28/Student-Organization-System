import { prisma } from '../../config/prisma.js';
import { notFound } from '../../utils/apiError.js';
import { sendBulkEmail } from '../../utils/mailer.js';
import { paginated, parsePagination } from '../../utils/pagination.js';
import { membershipsService } from '../memberships/memberships.service.js';

const STAFF_ROLES = ['ADMIN', 'TREASURER', 'VOLUNTEER'];
const authorSelect = { select: { id: true, name: true } };

// Anonymous visitors and plain users see announcements for everyone; active members and staff
// also see member-only posts.
async function visibleAudiences(user) {
  if (!user) return ['ALL_USERS'];
  if (STAFF_ROLES.includes(user.role)) return ['ALL_USERS', 'ALL_MEMBERS'];
  const member = await prisma.member.findUnique({ where: { userId: user.id } });
  return membershipsService.isActiveMember(member) ? ['ALL_USERS', 'ALL_MEMBERS'] : ['ALL_USERS'];
}

async function recipientEmails(audience, now) {
  const where =
    audience === 'ALL_USERS'
      ? { isActive: true }
      : { isActive: true, member: { is: { membershipStatus: 'ACTIVE', expiresAt: { gt: now } } } };
  const users = await prisma.user.findMany({ where, select: { email: true } });
  return users.map((user) => user.email);
}

async function requireOne(id) {
  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement) throw notFound('Announcement not found');
  return announcement;
}

export const announcementsService = {
  async list(query, user) {
    const page = parsePagination(query, 10);
    const where = { archivedAt: null, audience: { in: await visibleAudiences(user) } };
    const [rows, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        include: { author: authorSelect },
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        skip: page.skip,
        take: page.take,
      }),
      prisma.announcement.count({ where }),
    ]);
    return paginated(rows, total, page);
  },

  async history(query) {
    const page = parsePagination(query, 10);
    const [rows, total] = await Promise.all([
      prisma.announcement.findMany({
        include: { author: authorSelect, emailLogs: { orderBy: { sentAt: 'desc' } } },
        orderBy: { publishedAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      prisma.announcement.count(),
    ]);
    return paginated(rows, total, page);
  },

  // The announcement is stored before any email is attempted, so a mail failure can never lose it.
  async create(body, author) {
    const now = new Date();
    const announcement = await prisma.announcement.create({
      data: { ...body, authorId: author.id, publishedAt: now },
    });

    const recipients = await recipientEmails(body.audience, now);
    const result = await sendBulkEmail({
      to: recipients,
      subject: `[Skyline Student Association] ${body.title}`,
      text: body.body,
    });

    const [updated] = await prisma.$transaction([
      prisma.announcement.update({
        where: { id: announcement.id },
        data: { emailSent: result.status !== 'FAILED', emailRecipientCount: result.count },
        include: { author: authorSelect },
      }),
      prisma.emailLog.create({
        data: { announcementId: announcement.id, subject: body.title, recipientCount: result.count, status: result.status },
      }),
    ]);
    return updated;
  },

  async update(id, body) {
    await requireOne(id);
    return prisma.announcement.update({ where: { id }, data: body, include: { author: authorSelect } });
  },

  // Announcements are never deleted; archiving hides them from the feed but keeps the history.
  async archive(id) {
    const existing = await requireOne(id);
    if (existing.archivedAt) return existing;
    return prisma.announcement.update({ where: { id }, data: { archivedAt: new Date() } });
  },
};
