import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { app, authed, cleanup, makeUser, prisma, request } from './helpers.js';

after(cleanup);

// A 1x1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const submit = (token, fields = {}, file) => {
  const req = request(app).post('/api/expenses').set(authed(token));
  const values = { category: 'SUPPLIES', amount: '12500', description: 'Poster printing for the test', ...fields };
  for (const [key, value] of Object.entries(values)) req.field(key, value);
  if (file) req.attach('receipt', file.buffer, { filename: file.name, contentType: file.type });
  return req;
};

const review = (token, id, decision = 'APPROVED') =>
  request(app).patch(`/api/expenses/${id}/review`).set(authed(token)).send({ decision, note: 'Checked' });
const reimburse = (token, id) => request(app).patch(`/api/expenses/${id}/reimburse`).set(authed(token));

async function approvedClaim() {
  const volunteer = await makeUser({ role: 'VOLUNTEER' });
  const treasurer = await makeUser({ role: 'TREASURER' });
  const created = await submit(volunteer.token);
  assert.equal(created.status, 201);
  const id = created.body.data.id;
  assert.equal((await review(treasurer.token, id)).status, 200);
  return { volunteer, treasurer, id };
}

describe('expense claims', () => {
  test('a volunteer can submit a claim with an image receipt', async () => {
    const volunteer = await makeUser({ role: 'VOLUNTEER' });
    const res = await submit(volunteer.token, {}, { buffer: PNG, name: 'receipt.png', type: 'image/png' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'SUBMITTED');
    assert.match(res.body.data.receiptUrl, /^\/uploads\/[0-9a-f-]+\.png$/);
  });

  test('a receipt with a disallowed type is rejected', async () => {
    const volunteer = await makeUser({ role: 'VOLUNTEER' });
    const res = await submit(volunteer.token, {}, { buffer: Buffer.from('MZ'), name: 'virus.exe', type: 'application/x-msdownload' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_FILE_TYPE');
  });

  test('an oversized receipt is rejected', async () => {
    const volunteer = await makeUser({ role: 'VOLUNTEER' });
    const big = Buffer.alloc(5 * 1024 * 1024 + 10, 1);
    const res = await submit(volunteer.token, {}, { buffer: big, name: 'big.png', type: 'image/png' });
    assert.equal(res.status, 400);
  });

  test('a plain member cannot submit a claim', async () => {
    const member = await makeUser();
    const res = await submit(member.token);
    assert.equal(res.status, 403);
  });

  test('the claimant cannot approve their own claim but a different treasurer can', async () => {
    const treasurer = await makeUser({ role: 'TREASURER' });
    const admin = await makeUser({ role: 'ADMIN' });
    const created = await submit(treasurer.token);
    const own = await review(treasurer.token, created.body.data.id);
    assert.equal(own.status, 403);
    const other = await review(admin.token, created.body.data.id);
    assert.equal(other.status, 200);
  });

  test('a volunteer cannot review or reimburse', async () => {
    const { volunteer, id } = await approvedClaim();
    assert.equal((await review(volunteer.token, id)).status, 403);
    assert.equal((await reimburse(volunteer.token, id)).status, 403);
  });

  test('a claim must be approved before it can be reimbursed', async () => {
    const volunteer = await makeUser({ role: 'VOLUNTEER' });
    const treasurer = await makeUser({ role: 'TREASURER' });
    const created = await submit(volunteer.token);
    const res = await reimburse(treasurer.token, created.body.data.id);
    assert.equal(res.status, 409);
    assert.equal(await prisma.transaction.count({ where: { sourceType: 'EXPENSE', sourceId: String(created.body.data.id) } }), 0);
  });

  test('a rejected claim cannot be reimbursed', async () => {
    const volunteer = await makeUser({ role: 'VOLUNTEER' });
    const treasurer = await makeUser({ role: 'TREASURER' });
    const created = await submit(volunteer.token);
    await review(treasurer.token, created.body.data.id, 'REJECTED');
    const res = await reimburse(treasurer.token, created.body.data.id);
    assert.equal(res.status, 409);
  });

  test('reimbursing writes one EXPENSE ledger row and the same claim cannot be reimbursed twice', async () => {
    const { treasurer, id } = await approvedClaim();
    const first = await reimburse(treasurer.token, id);
    const second = await reimburse(treasurer.token, id);
    assert.equal(first.status, 200);
    assert.equal(first.body.data.status, 'REIMBURSED');
    assert.equal(second.status, 409);

    const rows = await prisma.transaction.findMany({ where: { sourceType: 'EXPENSE', sourceId: String(id) } });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].type, 'EXPENSE');
    assert.equal(rows[0].category, 'REIMBURSEMENT');
    assert.equal(rows[0].amount, 12500);
  });

  test('parallel reimbursements of one claim produce one success and one ledger row', async () => {
    const { treasurer, id } = await approvedClaim();
    const results = await Promise.all([reimburse(treasurer.token, id), reimburse(treasurer.token, id), reimburse(treasurer.token, id)]);
    assert.deepEqual(results.map((res) => res.status).sort(), [200, 409, 409]);
    assert.equal(await prisma.transaction.count({ where: { sourceType: 'EXPENSE', sourceId: String(id) } }), 1);
  });

  test('the finance totals move by exactly the reimbursed amount', async () => {
    const { treasurer, id } = await approvedClaim();
    const before = await prisma.transaction.aggregate({ where: { type: 'EXPENSE' }, _sum: { amount: true } });
    await reimburse(treasurer.token, id);
    const after = await prisma.transaction.aggregate({ where: { type: 'EXPENSE' }, _sum: { amount: true } });
    assert.equal(after._sum.amount - before._sum.amount, 12500);
  });

  test('a volunteer sees only their own claims in the my-claims list', async () => {
    const volunteer = await makeUser({ role: 'VOLUNTEER' });
    const other = await makeUser({ role: 'VOLUNTEER' });
    await submit(volunteer.token);
    await submit(other.token);
    const res = await request(app).get('/api/expenses/my').set(authed(volunteer.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].submittedById, volunteer.user.id);
  });
});
