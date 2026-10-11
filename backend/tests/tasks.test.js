import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { app, authed, cleanup, makeEvent, makeUser, prisma, request } from './helpers.js';

after(cleanup);

const create = (token, body) => request(app).post('/api/tasks').set(authed(token)).send(body);

describe('task management', () => {
  test('an admin creates an event task, assigns a volunteer, and the volunteer sees only their own tasks', async () => {
    const admin = await makeUser({ role: 'ADMIN' });
    const vol = await makeUser({ role: 'VOLUNTEER' });
    const other = await makeUser({ role: 'VOLUNTEER' });
    const event = await makeEvent();

    const mine = await create(admin.token, { title: 'Set up the registration desk', eventId: event.id, assigneeId: vol.user.id });
    const theirs = await create(admin.token, { title: 'Order the banners', eventId: event.id, assigneeId: other.user.id });
    assert.equal(mine.status, 201);
    assert.equal(mine.body.data.assignee.id, vol.user.id);
    assert.equal(mine.body.data.event.id, event.id);
    assert.equal(theirs.status, 201);

    const list = await request(app).get(`/api/tasks?eventId=${event.id}`).set(authed(vol.token));
    assert.equal(list.status, 200);
    assert.deepEqual(list.body.data.map((t) => t.id), [mine.body.data.id]);

    const all = await request(app).get(`/api/tasks?eventId=${event.id}`).set(authed(admin.token));
    assert.equal(all.body.data.length, 2);
  });

  test('only an admin can create or delete tasks', async () => {
    const vol = await makeUser({ role: 'VOLUNTEER' });
    const treasurer = await makeUser({ role: 'TREASURER' });
    const admin = await makeUser({ role: 'ADMIN' });
    const event = await makeEvent();
    for (const who of [vol, treasurer]) {
      assert.equal((await create(who.token, { title: 'Sneaky task', eventId: event.id })).status, 403);
    }
    const task = (await create(admin.token, { title: 'Real task', eventId: event.id })).body.data;
    assert.equal((await request(app).delete(`/api/tasks/${task.id}`).set(authed(vol.token))).status, 403);
    assert.equal((await request(app).delete(`/api/tasks/${task.id}`).set(authed(admin.token))).status, 200);
    assert.equal((await request(app).delete(`/api/tasks/${task.id}`).set(authed(admin.token))).status, 404);
  });

  test('an assignee can only change the status of their own task', async () => {
    const admin = await makeUser({ role: 'ADMIN' });
    const vol = await makeUser({ role: 'VOLUNTEER' });
    const stranger = await makeUser({ role: 'VOLUNTEER' });
    const event = await makeEvent();
    const task = (await create(admin.token, { title: 'Collect the receipts', eventId: event.id, assigneeId: vol.user.id })).body.data;

    const done = await request(app).patch(`/api/tasks/${task.id}`).set(authed(vol.token)).send({ status: 'COMPLETED' });
    assert.equal(done.status, 200);
    assert.equal(done.body.data.status, 'COMPLETED');
    const retitle = await request(app).patch(`/api/tasks/${task.id}`).set(authed(vol.token)).send({ title: 'Something else' });
    assert.equal(retitle.status, 403);
    const foreign = await request(app).patch(`/api/tasks/${task.id}`).set(authed(stranger.token)).send({ status: 'PENDING' });
    assert.equal(foreign.status, 403);
  });

  test('a task needs a real event and an active assignee', async () => {
    const admin = await makeUser({ role: 'ADMIN' });
    assert.equal((await create(admin.token, { title: 'Ghost event task', eventId: 999999999 })).status, 400);
    const event = await makeEvent();
    assert.equal((await create(admin.token, { title: 'Ghost assignee task', eventId: event.id, assigneeId: 999999999 })).status, 400);
  });

  test('the team overview matches the database and every staff role can read it', async () => {
    const admin = await makeUser({ role: 'ADMIN' });
    const vol = await makeUser({ role: 'VOLUNTEER' });
    const member = await makeUser({ role: 'MEMBER' });
    const event = await makeEvent();
    const yesterday = new Date(Date.now() - 86400000);
    await create(admin.token, { title: 'Late task', eventId: event.id, assigneeId: vol.user.id, dueDate: yesterday });
    const finished = (await create(admin.token, { title: 'Finished task', eventId: event.id, assigneeId: vol.user.id })).body.data;
    await request(app).patch(`/api/tasks/${finished.id}`).set(authed(vol.token)).send({ status: 'COMPLETED' });

    const res = await request(app).get('/api/tasks/overview').set(authed(vol.token));
    assert.equal(res.status, 200);
    const data = res.body.data;
    const db = await prisma.task.groupBy({ by: ['status'], _count: true });
    const n = (status) => db.find((row) => row.status === status)?._count ?? 0;
    assert.equal(data.total, n('PENDING') + n('IN_PROGRESS') + n('COMPLETED'));
    assert.equal(data.completed, n('COMPLETED'));
    const group = data.byEvent.find((g) => g.eventId === event.id);
    assert.deepEqual({ total: group.total, completed: group.completed, overdue: group.overdue }, { total: 2, completed: 1, overdue: 1 });
    const person = data.byAssignee.find((w) => w.userId === vol.user.id);
    assert.deepEqual({ total: person.total, open: person.open, completed: person.completed }, { total: 2, open: 1, completed: 1 });
    assert.equal((await request(app).get('/api/tasks/overview').set(authed(member.token))).status, 403);
  });
});
