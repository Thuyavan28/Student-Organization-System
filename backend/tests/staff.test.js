import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { app, authed, cleanup, makeUser, prisma, request } from './helpers.js';

const emails = [];
after(async () => {
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await cleanup();
});

const newStaff = (role = 'TREASURER') => {
  const email = `test+staff-${Date.now()}-${emails.length}@example.com`;
  emails.push(email);
  return { name: 'Staff Test', email, password: 'Password@123', role };
};

describe('admin staff accounts', () => {
  test('an admin creates a treasurer who can then log in', async () => {
    const { token } = await makeUser({ role: 'ADMIN' });
    const body = newStaff('TREASURER');
    const res = await request(app).post('/api/users/staff').set(authed(token)).send(body);
    assert.equal(res.status, 201);
    assert.equal(res.body.data.role, 'TREASURER');
    assert.equal(res.body.data.passwordHash, undefined);
    const login = await request(app).post('/api/auth/login').send({ email: body.email, password: body.password });
    assert.equal(login.status, 200);
    assert.equal(login.body.data.user.role, 'TREASURER');
  });

  test('non-admins cannot create or list staff', async () => {
    for (const role of ['TREASURER', 'VOLUNTEER', 'MEMBER']) {
      const { token } = await makeUser({ role });
      const create = await request(app).post('/api/users/staff').set(authed(token)).send(newStaff('VOLUNTEER'));
      assert.equal(create.status, 403, `${role} create`);
      const list = await request(app).get('/api/users/staff').set(authed(token));
      assert.equal(list.status, 403, `${role} list`);
    }
  });

  test('the admin role cannot be granted through this endpoint', async () => {
    const { token } = await makeUser({ role: 'ADMIN' });
    const res = await request(app).post('/api/users/staff').set(authed(token)).send(newStaff('ADMIN'));
    assert.equal(res.status, 400);
  });

  test('a duplicate email is rejected', async () => {
    const { token } = await makeUser({ role: 'ADMIN' });
    const body = newStaff('VOLUNTEER');
    assert.equal((await request(app).post('/api/users/staff').set(authed(token)).send(body)).status, 201);
    assert.equal((await request(app).post('/api/users/staff').set(authed(token)).send(body)).status, 409);
  });

  test('deactivating a staff account blocks login; admins and members cannot be edited here', async () => {
    const { token } = await makeUser({ role: 'ADMIN' });
    const body = newStaff('VOLUNTEER');
    const created = await request(app).post('/api/users/staff').set(authed(token)).send(body);
    const off = await request(app).patch(`/api/users/staff/${created.body.data.id}`).set(authed(token)).send({ isActive: false });
    assert.equal(off.status, 200);
    const login = await request(app).post('/api/auth/login').send({ email: body.email, password: body.password });
    assert.equal(login.status, 401);

    const other = await makeUser({ role: 'ADMIN' });
    assert.equal((await request(app).patch(`/api/users/staff/${other.user.id}`).set(authed(token)).send({ isActive: false })).status, 403);
    const member = await makeUser({ role: 'MEMBER' });
    assert.equal((await request(app).patch(`/api/users/staff/${member.user.id}`).set(authed(token)).send({ role: 'TREASURER' })).status, 403);
  });
});
