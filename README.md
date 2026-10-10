# ClubFlow

ClubFlow is a web application for the Skyline Student Association, a student club that runs events, sells memberships and merchandise, and manages a small budget. It replaces the spreadsheet, the cash box, the notebook and the group chat with one connected system.

> **Payments are simulated.** Every payment screen shows "Demo payment: no real money is charged" and every payment record stores `paymentMode = SIMULATED`. No payment gateway is connected and no real money moves.

## Features by scenario

| Scenario | What ClubFlow does |
|---|---|
| 1. A new member joins | Students join online with a membership tier. The system stores their profile, whether dues are paid, the tier perks (merchandise discount, member ticket prices) and the expiry date. A daily job expires lapsed members and emails renewal reminders. At the door, the check-in screen shows an "Active member" badge. |
| 2. Ticket sales for the Spring Gala | Online sales with separate member and non-member prices (the server computes the price, never the browser), a hard seat limit enforced with a row lock, and QR tickets. Volunteers scan on a phone and see green or red in a second. Afterwards the event report shows registrations, attendance, revenue, costs and net result. |
| 3. Announcements | Post once, see it in the feed immediately (pinned first) and email every active member. Every post is kept: archiving hides it from the feed but keeps it in the sent history with date, author and recipient count. |
| 4. Merchandise | Sizes, per-size stock, cart and checkout from a phone. Stock is decremented with a guarded update so two people can never buy the last item. Members get their tier discount automatically. |
| 5. Fundraiser | Split a fundraiser into tasks, assign volunteers, and watch a three-column board (Pending, In progress, Completed). Progress toward the goal, overdue tasks and an "on track" indicator come from live data. |
| 6. Treasurer | One ledger holds dues, tickets, merchandise, fundraiser income and every reimbursed expense. The finance page shows income, expense and the balance left, with charts, filters, a manual entry form and CSV export. |

Roles are `ADMIN`, `TREASURER`, `VOLUNTEER` and `MEMBER`. Roles are enforced by the API on every protected route; hiding a button in the UI is never treated as security. The president position grants the admin role and the treasurer position grants the treasurer role.

## Tech stack

- Frontend: React 18, Vite, Tailwind CSS, React Router, Axios, Recharts, qrcode.react, html5-qrcode, react-icons
- Backend: Node.js, Express, zod, JSON Web Tokens, bcryptjs, helmet, cors, express-rate-limit, multer, Nodemailer, node-cron
- Database: Neon PostgreSQL, accessed only through the Prisma ORM

## Architecture overview

```
Browser (React SPA, Vite dev server on :5173)
   |  JSON over HTTPS, Authorization: Bearer <JWT>
   v
Express API (:4000)
   routes -> controllers (thin) -> services (all business rules) -> Prisma Client
   middleware: helmet, cors, rate limit on auth, JWT auth, requireRole, zod validation, error handler
   jobs: daily membership expiry and renewal reminders (node-cron, inside the same process)
   uploads: expense receipts stored in backend/uploads
   |
   v
Neon PostgreSQL (single database)
```

Key design rules:

- Money is stored as integer paise and formatted to rupees only in the UI.
- The `transactions` table is the single source of truth for finance. Totals are never recomputed from bookings or orders. A unique constraint on `(source_type, source_id)` stops the same payment or expense being counted twice.
- Booking locks the event row (`SELECT ... FOR UPDATE` inside a transaction) before counting seats, so concurrent requests cannot oversell.
- Check-in relies on a unique constraint on `check_ins.ticket_id`, so a ticket can only ever be checked in once, even when two phones scan at the same moment.
- The QR code contains only an opaque random ticket token, never personal data.

## Repository layout

```
frontend/   React app (pages, components, API clients, routing)
backend/    Express API, Prisma schema, SQL schema and seed, tests
```

## Setup

Requirements: Node.js 20 or newer and a free Neon account.

### 1. Database (Neon)

1. Create a Neon project and copy two connection strings from the dashboard: the pooled one (host contains `-pooler`) and the direct one.
2. Open the Neon SQL Editor and run the whole of `backend/prisma/sql/clubflow_schema_and_seed.sql`. It drops and recreates every ClubFlow table, creates the schema and loads about 1,500 synthetic records. All dates are relative to the current time, so the demo stays current. The file ends with a row count per table.

### 2. Backend

```bash
cd backend
cp .env.example .env        # then fill in DATABASE_URL, DIRECT_URL and JWT_SECRET
npm install
npx prisma generate
npm run dev                 # API on http://localhost:4000, health check at /api/health
```

Environment variables (`backend/.env`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Neon connection string. Add `&connect_timeout=30&pool_timeout=30` if connections are slow. |
| `DIRECT_URL` | Direct Neon connection string, used by Prisma for introspection and migrations. |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Token signing secret (at least 16 characters) and lifetime, for example `7d`. |
| `CLIENT_ORIGIN` | The only browser origin allowed by CORS, for example `http://localhost:5173`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Optional. Without SMTP, announcement emails are logged to the console and still recorded in `email_logs`. |

The Prisma schema mirrors the database that the SQL file creates. If you change the SQL, run `npx prisma db pull` and review `prisma/schema.prisma`, then `npx prisma generate`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev                 # http://localhost:5173
```

### 4. Tests

```bash
cd backend
npm test
```

The tests run against the database in `backend/.env`. They create their own fixtures and remove them afterwards. Use a Neon branch if you want to keep your demo data completely untouched.

## Demo accounts

Every account uses the password `Password@123`.

| Role | Email |
|---|---|
| Admin (president) | admin@skyline.example.com |
| Treasurer | treasurer@skyline.example.com |
| Volunteer | volunteer1@skyline.example.com, volunteer2@skyline.example.com |
| Member (active, Premium tier) | student25@example.com |
| Member (membership expiring soon) | student12@example.com |
| Member (membership expired) | student20@example.com |
| Member (payment pending) | student28@example.com |
| Student with no membership | student110@example.com |

Students `student5` to `student120` exist; `student5` to `student10` are volunteers, and `student5` to `student104` have membership profiles.

## Demo walkthrough

1. Log in as the admin and open the dashboard.
2. Create an event with capacity 50 and two prices, then publish it.
3. Register a new student, join as a member (simulated dues) and see the membership card.
4. Book a ticket at the member price and open the QR ticket under My tickets.
5. As a volunteer, open Check-in on a phone-sized screen and scan the ticket: green with the member badge. Scan again: red, already checked in.
6. As the admin, post an announcement and see it in the feed and in the sent history.
7. As the student, order a hoodie in size M. Stock drops by one and the order appears under Orders.
8. Open the bake sale fundraiser, assign tasks and watch the progress indicator as tasks are completed.
9. As a volunteer, submit an expense claim with a receipt. As the treasurer, approve and reimburse it.
10. Open Finance to see dues, tickets, merchandise, fundraiser income, the reimbursed expense and the balance, plus the per-event report of registrations versus attendance.

## Future work

- Connect a real payment gateway behind the existing payment records
- Multi-ticket bookings and a waiting list for sold-out events
- Push or SMS notifications in addition to email
- Offline-tolerant check-in for venues with poor connectivity
- Scheduled treasurer reports and budget forecasts
- Drag and drop on the task board
