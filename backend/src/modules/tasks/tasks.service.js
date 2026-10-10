import { prisma } from '../../config/prisma.js';
import { badRequest, forbidden, notFound } from '../../utils/apiError.js';
import { paginated, parsePagination } from '../../utils/pagination.js';

const taskInclude = {
  assignee: { select: { id: true, name: true } },
  fundraiser: { select: { id: true, title: true } },
  event: { select: { id: true, title: true } },
};

async function requireAssignee(assigneeId) {
  if (assigneeId == null) return;
  const user = await prisma.user.findUnique({ where: { id: assigneeId } });
  if (!user || !user.isActive) throw badRequest('INVALID_ASSIGNEE', 'The selected assignee does not exist');
}

export const tasksService = {
  async list(query, user) {
    const page = parsePagination(query, 50);
    const where = {};
    if (query.fundraiserId) where.fundraiserId = query.fundraiserId;
    if (query.eventId) where.eventId = query.eventId;
    if (query.status) where.status = query.status;
    if (query.assigneeId) where.assigneeId = query.assigneeId;
    // Volunteers only ever see the tasks assigned to them.
    if (query.mine || user.role === 'VOLUNTEER') where.assigneeId = user.id;
    const [rows, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: taskInclude,
        orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
        skip: page.skip,
        take: page.take,
      }),
      prisma.task.count({ where }),
    ]);
    return paginated(rows, total, page);
  },

  async create(body, user) {
    await requireAssignee(body.assigneeId);
    return prisma.task.create({ data: { ...body, createdById: user.id }, include: taskInclude });
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
      await requireAssignee(body.assigneeId);
    }
    return prisma.task.update({ where: { id }, data: body, include: taskInclude });
  },
};
