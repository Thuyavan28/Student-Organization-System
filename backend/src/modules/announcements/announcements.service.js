import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { whereAll } from '../../utils/sql.js';
import { notFound } from '../../utils/apiError.js';
import * as cache from '../../utils/memoryCache.js';
import { sendBulkEmail } from '../../utils/mailer.js';
import { paginated, parsePagination } from '../../utils/pagination.js';
import { membershipsService } from '../memberships/memberships.service.js';

const STAFF_ROLES = ['ADMIN', 'TREASURER', 'VOLUNTEER'];
const authorSelect = { select: { id: true, name: true } };
const FEED_TTL_SECONDS = 30;

function invalidateFeed() {
  cache.delByPrefix('announcements:');
}

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
    const audiences = await visibleAudiences(user);
    const where = { archivedAt: null, audience: { in: audiences } };
    // The feed is the same for everyone who may see the same audiences, so it is cached per audience set.
    return cache.wrap(`announcements:feed:${audiences.join(',')}:${page.skip}:${page.take}`, FEED_TTL_SECONDS, async () => {
      // One statement: the page of announcements with their author and the overall total.
      const rows = await prisma.$queryRaw`
        SELECT a.id, a.title, a.body, a.audience::text AS audience, a.author_id AS "authorId", a.is_pinned AS "isPinned",
               a.email_sent AS "emailSent", a.email_recipient_count AS "emailRecipientCount",
               a.published_at AS "publishedAt", a.archived_at AS "archivedAt", a.created_at AS "createdAt", a.updated_at AS "updatedAt",
               u.name AS "authorName", COUNT(*) OVER()::int AS "totalRows"
        FROM announcements a
        JOIN users u ON u.id = a.author_id
        WHERE a.archived_at IS NULL AND a.audience::text IN (${Prisma.join(audiences)})
        ORDER BY a.is_pinned DESC, a.published_at DESC, a.id DESC
        LIMIT ${page.take} OFFSET ${page.skip}`;
      let total = rows[0]?.totalRows ?? 0;
      if (rows.length === 0 && page.skip > 0) {
        const [{ count }] = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM announcements a WHERE a.archived_at IS NULL AND a.audience::text IN (${Prisma.join(audiences)})`;
        total = count;
      }
      return paginated(rows.map(({ authorName, totalRows: _t, ...row }) => ({ ...row, author: { id: row.authorId, name: authorName } })), total, page);
    }, { staleSeconds: FEED_TTL_SECONDS });
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
    invalidateFeed();
    return updated;
  },

  async update(id, body) {
    await requireOne(id);
    const updated = await prisma.announcement.update({ where: { id }, data: body, include: { author: authorSelect } });
    invalidateFeed();
    return updated;
  },

  // Announcements are never deleted; archiving hides them from the feed but keeps the history.
  async archive(id) {
    const existing = await requireOne(id);
    if (existing.archivedAt) return existing;
    const archived = await prisma.announcement.update({ where: { id }, data: { archivedAt: new Date() } });
    invalidateFeed();
    return archived;
  },
};
