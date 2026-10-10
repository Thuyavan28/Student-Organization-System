import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { app, authed, book, cleanup, makeEvent, makeUser, prisma, request } from './helpers.js';

let treasurer;
const summary = (query = '') => request(app).get(`/api/finance/summary${query}`).set(authed(treasurer.token));

before(async () => {
  treasurer = await makeUser({ role: 'TREASURER' });
});
after(cleanup);

describe('finance totals', () => {
  test('income, expense and balance equal the sums of the ledger rows', async () => {
    const [income, expense] = await Promise.all([
      prisma.transaction.aggregate({ where: { type: 'INCOME' }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: 'EXPENSE' }, _sum: { amount: true } }),
    ]);
    const res = await summary();
    assert.equal(res.status, 200);
    assert.equal(res.body.data.income, income._sum.amount);
    assert.equal(res.body.data.expense, expense._sum.amount);
    assert.equal(res.body.data.net, income._sum.amount - expense._sum.amount);
  });

  test('the category and month breakdowns add up to the headline numbers', async () => {
    const { data } = (await summary()).body;
    const categoryIncome = data.byCategory.filter((row) => row.type === 'INCOME').reduce((sum, row) => sum + row.amount, 0);
    const categoryExpense = data.byCategory.filter((row) => row.type === 'EXPENSE').reduce((sum, row) => sum + row.amount, 0);
    const monthIncome = data.byMonth.reduce((sum, row) => sum + row.income, 0);
    const monthExpense = data.byMonth.reduce((sum, row) => sum + row.expense, 0);
    assert.equal(categoryIncome, data.income);
    assert.equal(categoryExpense, data.expense);
    assert.equal(monthIncome, data.income);
    assert.equal(monthExpense, data.expense);
  });

  test('a manual entry raises income by exactly its amount and is a MANUAL source', async () => {
    const before = (await summary()).body.data;
    const created = await request(app)
      .post('/api/transactions')
      .set(authed(treasurer.token))
      .send({ type: 'INCOME', category: 'DONATION', amount: 123400, description: 'Test donation' });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.sourceType, 'MANUAL');
    const after = (await summary()).body.data;
    assert.equal(after.income - before.income, 123400);
    assert.equal(after.net - before.net, 123400);
  });

  test('a booking changes the ticket income by exactly its price and never double counts', async () => {
    const event = await makeEvent({ nonMemberPrice: 77700 });
    const guest = await makeUser();
    const before = (await summary()).body.data;
    const booked = await book(guest.token, event.id);
    assert.equal(booked.status, 201);
    const after = (await summary()).body.data;
    assert.equal(after.income - before.income, 77700);

    const ticketRows = await prisma.transaction.count({ where: { eventId: event.id, category: 'TICKETS', type: 'INCOME' } });
    assert.equal(ticketRows, 1);
  });

  test('the ledger enforces one row per source', async () => {
    const event = await makeEvent();
    const guest = await makeUser();
    const booked = await book(guest.token, event.id);
    await assert.rejects(
      prisma.transaction.create({
        data: {
          type: 'INCOME', category: 'TICKETS', amount: 1, description: 'duplicate attempt', eventId: event.id,
          sourceType: 'BOOKING', sourceId: String(booked.body.data.booking.id), recordedById: guest.user.id,
        },
      }),
      (error) => error.code === 'P2002',
    );
  });

  test('filters narrow the ledger list and the totals agree with the filtered rows', async () => {
    const res = await request(app).get('/api/transactions?type=INCOME&category=DUES&pageSize=100').set(authed(treasurer.token));
    assert.equal(res.status, 200);
    assert.ok(res.body.data.every((row) => row.type === 'INCOME' && row.category === 'DUES'));
    const total = await prisma.transaction.count({ where: { type: 'INCOME', category: 'DUES' } });
    assert.equal(res.body.meta.total, total);
  });

  test('the fundraiser raised total equals the ledger income linked to it', async () => {
    const summaryRes = await request(app).get('/api/fundraisers/1/summary').set(authed(treasurer.token));
    const ledger = await prisma.transaction.aggregate({ where: { fundraiserId: 1, type: 'INCOME' }, _sum: { amount: true } });
    assert.equal(summaryRes.body.data.raised, ledger._sum.amount ?? 0);
  });

  test('the CSV export has a header and one line per ledger row', async () => {
    const res = await request(app).get('/api/finance/export.csv?type=INCOME&category=DUES').set(authed(treasurer.token));
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/csv/);
    const lines = res.text.trim().split(/\r?\n/);
    const total = await prisma.transaction.count({ where: { type: 'INCOME', category: 'DUES' } });
    assert.match(lines[0], /date/i);
    assert.equal(lines.length - 1, total);
  });

  test('the per-event report ties registrations, attendance and net to the ledger', async () => {
    const res = await request(app).get('/api/finance/events').set(authed(treasurer.token));
    assert.equal(res.status, 200);
    const row = res.body.data.find((item) => item.registrations > 0 && item.attendanceRate !== null);
    assert.ok(row, 'expected a finished event with registrations');
    const [income, expense, checkIns] = await Promise.all([
      prisma.transaction.aggregate({ where: { eventId: row.eventId, type: 'INCOME' }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { eventId: row.eventId, type: 'EXPENSE' }, _sum: { amount: true } }),
      prisma.checkIn.count({ where: { ticket: { booking: { eventId: row.eventId } } } }),
    ]);
    assert.equal(row.revenue, income._sum.amount ?? 0);
    assert.equal(row.expenses, expense._sum.amount ?? 0);
    assert.equal(row.net, (income._sum.amount ?? 0) - (expense._sum.amount ?? 0));
    assert.equal(row.checkIns, checkIns);
  });

  test('a member cannot read finance data', async () => {
    const member = await makeUser();
    const res = await request(app).get('/api/finance/summary').set(authed(member.token));
    assert.equal(res.status, 403);
  });
});
