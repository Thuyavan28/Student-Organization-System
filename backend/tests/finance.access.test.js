import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { app, authed, cleanup, makeUser, request } from './helpers.js';
import { membershipEnd } from '../src/modules/memberships/memberships.service.js';

after(cleanup);

describe('finance visibility', () => {
  test('every staff role can READ the ledger and the finance summary; a plain member cannot', async () => {
    for (const role of ['ADMIN', 'TREASURER', 'VOLUNTEER']) {
      const { token } = await makeUser({ role });
      assert.equal((await request(app).get('/api/finance/summary').set(authed(token))).status, 200, `${role} summary`);
      assert.equal((await request(app).get('/api/transactions?pageSize=5').set(authed(token))).status, 200, `${role} ledger`);
    }
    const member = await makeUser({ role: 'MEMBER' });
    assert.equal((await request(app).get('/api/finance/summary').set(authed(member.token))).status, 403);
    assert.equal((await request(app).get('/api/transactions').set(authed(member.token))).status, 403);
  });

  test('a volunteer cannot record a transaction or export the ledger', async () => {
    const vol = await makeUser({ role: 'VOLUNTEER' });
    const entry = { type: 'INCOME', category: 'DONATION', amount: 5000, description: 'Sneaky donation entry' };
    assert.equal((await request(app).post('/api/transactions').set(authed(vol.token)).send(entry)).status, 403);
    assert.equal((await request(app).get('/api/finance/export.csv').set(authed(vol.token))).status, 403);
    const treasurer = await makeUser({ role: 'TREASURER' });
    assert.equal((await request(app).get('/api/finance/export.csv').set(authed(treasurer.token))).status, 200);
  });
});

describe('membership expiry at year end', () => {
  const utc = (y, m, d, h = 12) => new Date(Date.UTC(y, m - 1, d, h));
  const endOf = (y) => new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
  const mode = { mode: 'YEAR_END', graceDays: 60 };

  test('a mid-year joiner is covered to 31 December of that year', () => {
    assert.equal(membershipEnd(utc(2026, 3, 10), 12, mode).getTime(), endOf(2026).getTime());
    assert.equal(membershipEnd(utc(2026, 10, 1), 12, mode).getTime(), endOf(2026).getTime()); // 91 days left, outside the grace window
  });

  test('a late-year joiner (inside the grace window) is covered through the next year too', () => {
    assert.equal(membershipEnd(utc(2026, 11, 20), 12, mode).getTime(), endOf(2027).getTime());
    assert.equal(membershipEnd(utc(2026, 12, 30), 12, mode).getTime(), endOf(2027).getTime());
  });

  test('renewing at the current expiry extends by exactly one more year', () => {
    assert.equal(membershipEnd(endOf(2026), 12, mode).getTime(), endOf(2027).getTime());
    assert.equal(membershipEnd(endOf(2027), 12, mode).getTime(), endOf(2028).getTime());
  });

  test('ROLLING mode keeps the old behaviour (tier duration from the payment date)', () => {
    const end = membershipEnd(utc(2026, 3, 10), 12, { mode: 'ROLLING', graceDays: 60 });
    assert.equal(end.getUTCFullYear(), 2027);
    assert.equal(end.getUTCMonth(), 2);
  });
});
