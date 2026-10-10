import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { app, authed, cleanup, makeUser, prisma, request } from './helpers.js';

after(cleanup);

describe('authentication', () => {
  test('login rejects a wrong password with the same error as an unknown email', async () => {
    const wrongPassword = await request(app).post('/api/auth/login').send({ email: 'admin@skyline.example.com', password: 'not-the-password' });
    const unknownEmail = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'Password@123' });
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.equal(wrongPassword.body.error.code, 'INVALID_CREDENTIALS');
    assert.deepEqual(wrongPassword.body.error.message, unknownEmail.body.error.message);
  });

  test('login accepts the demo admin and returns a token and the role', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@skyline.example.com', password: 'Password@123' });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.role, 'ADMIN');
    assert.equal(res.body.data.user.passwordHash, undefined);
  });

  test('register creates a plain MEMBER account and rejects a duplicate email', async () => {
    const email = `test+register-${Date.now()}@example.com`;
    const first = await request(app).post('/api/auth/register').send({ name: 'Register Test', email, password: 'Password@123' });
    assert.equal(first.status, 201);
    assert.equal(first.body.data.user.role, 'MEMBER');
    const again = await request(app).post('/api/auth/register').send({ name: 'Register Test', email, password: 'Password@123' });
    assert.equal(again.status, 409);
    await prisma.user.deleteMany({ where: { email } });
  });

  test('register cannot be used to choose a role', async () => {
    const email = `test+escalate-${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({ name: 'Sneaky', email, password: 'Password@123', role: 'ADMIN' });
    assert.ok([201, 400].includes(res.status));
    const user = await prisma.user.findUnique({ where: { email } });
    assert.ok(!user || user.role === 'MEMBER');
    await prisma.user.deleteMany({ where: { email } });
  });

  test('validation errors use the shared error shape', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.fieldErrors);
  });
});

describe('route protection', () => {
  test('a protected route rejects a missing token', async () => {
    const res = await request(app).get('/api/members');
    assert.equal(res.status, 401);
  });

  test('a protected route rejects a garbage token', async () => {
    const res = await request(app).get('/api/members').set(authed('not.a.token'));
    assert.equal(res.status, 401);
  });

  test('a protected route rejects a user without the role', async () => {
    const { token } = await makeUser({ role: 'MEMBER' });
    const res = await request(app).get('/api/members').set(authed(token));
    assert.equal(res.status, 403);
  });

  test('a volunteer cannot open the finance ledger but a treasurer can', async () => {
    const volunteer = await makeUser({ role: 'VOLUNTEER' });
    const treasurer = await makeUser({ role: 'TREASURER' });
    const denied = await request(app).get('/api/transactions').set(authed(volunteer.token));
    const allowed = await request(app).get('/api/transactions').set(authed(treasurer.token));
    assert.equal(denied.status, 403);
    assert.equal(allowed.status, 200);
  });

  test('a deactivated user is locked out immediately even with a valid token', async () => {
    const { user, token } = await makeUser({ role: 'ADMIN' });
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    const res = await request(app).get('/api/members').set(authed(token));
    assert.equal(res.status, 401);
  });

  test('list endpoints clamp an oversized page size to 100', async () => {
    const { token } = await makeUser({ role: 'ADMIN' });
    const res = await request(app).get('/api/members?pageSize=100000').set(authed(token));
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.pageSize, 100);
    assert.ok(res.body.data.length <= 100);
  });

  test('unknown routes return the shared error shape', async () => {
    const res = await request(app).get('/api/nothing-here');
    assert.equal(res.status, 404);
    assert.ok(res.body.error.code);
  });
});
