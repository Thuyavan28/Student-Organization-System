// Calls every GET endpoint repeatedly with demo accounts and prints p50 and p95 timings.
// Usage: node scripts/benchmark.js [--base http://localhost:4000/api] [--runs 20] [--json out.json]
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};

const BASE = option('base', 'http://localhost:4000/api');
const RUNS = Number(option('runs', 20));
const JSON_OUT = option('json', null);
const PASSWORD = 'Password@123';

async function call(path, token) {
  const started = performance.now();
  const response = await fetch(`${BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  await response.arrayBuffer();
  return { ms: performance.now() - started, status: response.status };
}

async function login(email) {
  const started = performance.now();
  const response = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = await response.json();
  return { token: body.data?.token, ms: performance.now() - started, status: response.status };
}

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];

async function measure(label, path, token, runs = RUNS) {
  const times = [];
  let status = 0;
  for (let i = 0; i < runs; i += 1) {
    const result = await call(path, token);
    times.push(result.ms);
    status = result.status;
  }
  times.sort((a, b) => a - b);
  return { label, path, status, p50: Math.round(percentile(times, 50)), p95: Math.round(percentile(times, 95)), max: Math.round(times[times.length - 1]) };
}

async function firstId(path, token, pick = (row) => row.id) {
  const response = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json();
  return body.data?.map(pick).find((value) => value != null);
}

async function main() {
  console.log(`Benchmark against ${BASE}, ${RUNS} runs per endpoint`);
  const admin = await login('admin@skyline.example.com');
  const volunteer = await login('volunteer1@skyline.example.com');
  if (!admin.token) throw new Error('Admin login failed. Is the API running and seeded?');

  const eventId = (await firstId('/events?status=PUBLISHED&pageSize=5', admin.token)) ?? 1;

  // Warm the server and its database connection so the figures describe steady state.
  await call('/health', null);
  await call('/events', admin.token);

  const endpoints = [
    ['health', '/health', null],
    ['health (db)', '/health/db', null],
    ['auth/me', '/auth/me', admin.token],
    ['membership/tiers', '/membership/tiers', admin.token],
    ['members list', '/members?pageSize=15', admin.token],
    ['members search', '/members?q=sharma&pageSize=15', admin.token],
    ['members expiring', '/members/expiring', admin.token],
    ['events (public)', '/events', null],
    ['events (admin)', '/events?pageSize=15', admin.token],
    ['event detail', `/events/${eventId}`, admin.token],
    ['event stats', `/events/${eventId}/stats`, admin.token],
    ['event bookings', `/events/${eventId}/bookings?pageSize=15`, admin.token],
    ['bookings/my', '/bookings/my', admin.token],
    ['announcements', '/announcements', null],
    ['announcements/history', '/announcements/history', admin.token],
    ['products', '/products', null],
    ['orders', '/orders?pageSize=15', admin.token],
    ['orders/my', '/orders/my', admin.token],
    ['expenses', '/expenses?pageSize=15', admin.token],
    ['expenses/my', '/expenses/my', volunteer.token],
    ['transactions', '/transactions?pageSize=15', admin.token],
    ['finance/summary', '/finance/summary', admin.token],
    ['finance/events', '/finance/events', admin.token],
    ['dashboard/summary', '/dashboard/summary', admin.token],
    ['dashboard/charts', '/dashboard/charts', admin.token],
    ['leadership', '/leadership', admin.token],
    ['users (dropdown)', '/users?role=VOLUNTEER&fields=id,name', admin.token],
  ];

  const rows = [];
  rows.push({ label: 'POST auth/login', path: '/auth/login', status: admin.status, p50: Math.round(admin.ms), p95: Math.round(admin.ms), max: Math.round(admin.ms), note: 'single sample' });
  for (const [label, path, token] of endpoints) rows.push(await measure(label, path, token));

  console.log('\nendpoint'.padEnd(26) + 'status'.padEnd(8) + 'p50 ms'.padEnd(9) + 'p95 ms'.padEnd(9) + 'max ms');
  for (const row of rows) {
    console.log(row.label.padEnd(25) + String(row.status).padEnd(8) + String(row.p50).padEnd(9) + String(row.p95).padEnd(9) + row.max + (row.note ? `  (${row.note})` : ''));
  }
  if (JSON_OUT) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(JSON_OUT, JSON.stringify({ base: BASE, runs: RUNS, takenAt: new Date().toISOString(), rows }, null, 2));
    console.log(`\nSaved ${JSON_OUT}`);
  }
  const failed = rows.filter((row) => row.status >= 400);
  if (failed.length) console.log(`\nNon-2xx endpoints: ${failed.map((row) => `${row.label} (${row.status})`).join(', ')}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
