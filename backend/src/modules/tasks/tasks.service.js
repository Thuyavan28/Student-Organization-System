import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { badRequest, forbidden, notFound } from '../../utils/apiError.js';
import * as cache from '../../utils/memoryCache.js';
import { paginated, parsePagination } from '../../utils/pagination.js';
import { whereAll } from '../../utils/sql.js';

const taskInclude = {
  assignee: { select: { id: true, name: true } },
  event: { select: { id: true, title: true } },
};

async function requireAssignee(assigneeId) {
  if (assigneeId == null) return;
  const user = await prisma.user.findUnique({ where: { id: assigneeId }, select: { id: true, isActive: true, role: true } });
  if (!user || !user.isActive) throw badRequest('INVALID_ASSIGNEE', 'The selected assignee does not exist');
}

async function requireEvent(eventId) {
  if (eventId == null) return;
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) throw badRequest('INVALID_EVENT', 'The selected event does not exist');
}

export const tasksService = {
  // One SQL statement: the page of tasks with assignee, event and the overall total.
  async list(query, user) {
    const page = parsePagination(query, 50);
    const c = [];
    if (query.eventId) c.push(Prisma.sql`k.event_id = ${query.eventId}`);
    if (query.status) c.push(Prisma.sql`k.status = ${query.status}::task_status`);
    // Volunteers only ever see the tasks assigned to them.
    if (query.mine || user.role === 'VOLUNTEER') c.push(Prisma.sql`k.assignee_id = ${user.id}`);
    else if (query.assigneeId) c.push(Prisma.sql`k.assignee_id = ${query.assigneeId}`);
    const rows = await prisma.$queryRaw`
      SELECT k.id, k.event_id AS "eventId", k.title, k.description, k.assignee_id AS "assigneeId", k.due_date AS "dueDate",
             k.status::text AS status, k.created_by_id AS "createdById", k.created_at AS "createdAt", k.updated_at AS "updatedAt",
             a.name AS "assigneeName", e.title AS "eventTitle", COUNT(*) OVER()::int AS "totalRows"
      FROM tasks k
      LEFT JOIN users a ON a.id = k.assignee_id
      LEFT JOIN events e ON e.id = k.event_id
      ${whereAll(c)}
      ORDER BY k.due_date ASC NULLS LAST, k.id ASC
      LIMIT ${page.take} OFFSET ${page.skip}`;
    let total = rows[0]?.totalRows ?? 0;
    if (rows.length === 0 && page.skip > 0) {
      const [{ count }] = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM tasks k ${whereAll(c)}`;
      total = count;
    }
    const data = rows.map(({ assigneeName, eventTitle, totalRows: _t, ...row }) => ({
      ...row,
      assignee: row.assigneeId ? { id: row.assigneeId, name: assigneeName } : null,
      event: row.eventId ? { id: row.eventId, title: eventTitle } : null,
    }));
    return paginated(data, total, page);
  },

  // The at-a-glance picture for the whole team, in one statement: overall counts, progress per event and workload per
  // person. Everyone on the team can read it, so volunteers can see who is on what and whether an event is on track.
  async overview() {
    const [row] = await prisma.$queryRaw`
      WITH t AS (
        SELECT k.id, k.event_id, k.assignee_id, k.status::text AS status,
               (k.status <> 'COMPLETED' AND k.due_date IS NOT NULL AND k.due_date < now()) AS overdue
        FROM tasks k
      )
      SELECT
        (SELECT COUNT(*)::int FROM t) AS total,
        (SELECT COUNT(*)::int FROM t WHERE status = 'PENDING') AS pending,
        (SELECT COUNT(*)::int FROM t WHERE status = 'IN_PROGRESS') AS "inProgress",
        (SELECT COUNT(*)::int FROM t WHERE status = 'COMPLETED') AS completed,
        (SELECT COUNT(*)::int FROM t WHERE overdue) AS overdue,
        (SELECT COUNT(*)::int FROM t WHERE assignee_id IS NULL AND status <> 'COMPLETED') AS unassigned,
        (SELECT COALESCE(json_agg(json_build_object('eventId', g.event_id, 'title', g.title, 'total', g.total, 'completed', g.completed,
                                                    'inProgress', g.in_progress, 'pending', g.pending, 'overdue', g.overdue) ORDER BY g.has_event DESC, g.title), '[]'::json)
           FROM (SELECT t.event_id, COALESCE(e.title, 'General club tasks') AS title, (t.event_id IS NOT NULL) AS has_event,
                        COUNT(*)::int AS total,
                        COUNT(*) FILTER (WHERE t.status = 'COMPLETED')::int AS completed,
                        COUNT(*) FILTER (WHERE t.status = 'IN_PROGRESS')::int AS in_progress,
                        COUNT(*) FILTER (WHERE t.status = 'PENDING')::int AS pending,
                        COUNT(*) FILTER (WHERE t.overdue)::int AS overdue
                   FROM t LEFT JOIN events e ON e.id = t.event_id GROUP BY t.event_id, e.title) g) AS "byEvent",
        (SELECT COALESCE(json_agg(json_build_object('userId', w.assignee_id, 'name', w.name, 'total', w.total, 'open', w.open,
                                                    'completed', w.completed, 'overdue', w.overdue) ORDER BY w.open DESC, w.name), '[]'::json)
           FROM (SELECT t.assignee_id, u.name, COUNT(*)::int AS total,
                        COUNT(*) FILTER (WHERE t.status <> 'COMPLETED')::int AS open,
                        COUNT(*) FILTER (WHERE t.status = 'COMPLETED')::int AS completed,
                        COUNT(*) FILTER (WHERE t.overdue)::int AS overdue
                   FROM t JOIN users u ON u.id = t.assignee_id GROUP BY t.assignee_id, u.name) w) AS "byAssignee"`;
    return { data: row };
  },

  async create(body, user) {
    await Promise.all([requireAssignee(body.assigneeId), requireEvent(body.eventId)]);
    const task = await prisma.task.create({ data: { ...body, createdById: user.id }, include: taskInclude });
    cache.delByPrefix('dashboard:'); // the dashboard shows the open-task count
    return task;
  },

  // Admins may edit everything. An assignee may only move their own task between statuses.
  async update(id, body, user) {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw notFound('Task not found');

    if (user.role !== 'ADMIN') {
      if (task.assigneeId !== user.id) throw forbidden('You can only update tasks assigned to you');
      const extraKeys = Object.keys(body).filter((key) => key !== 'status');
      if (extraKeys.length > 0) throw forbidden('Assignees can only change the status of a task', 'ONLY_STATUS_ALLOWED');
    } else {
      await Promise.all([requireAssignee(body.assigneeId), requireEvent(body.eventId)]);
    }
    const updated = await prisma.task.update({ where: { id }, data: body, include: taskInclude });
    cache.delByPrefix('dashboard:');
    return updated;
  },

  async remove(id) {
    const { count } = await prisma.task.deleteMany({ where: { id } });
    if (count === 0) throw notFound('Task not found');
    cache.delByPrefix('dashboard:');
    return { id };
  },
};
