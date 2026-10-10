-- ClubFlow schema and synthetic seed data for the Skyline Student Association.
-- Run the whole file in the Neon SQL Editor (or with `npx prisma db execute --file`).
-- The file is re-runnable: it drops every table and enum type in the public schema
-- (except Prisma's migration history) and recreates them.
-- All dates are relative to now() so the demo stays current on any day.
-- Every account uses the password Password@123.

BEGIN;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations' LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
  END LOOP;
  FOR r IN SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
           WHERE n.nspname = 'public' AND t.typtype = 'e' LOOP
    EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', r.typname);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('ADMIN', 'TREASURER', 'VOLUNTEER', 'MEMBER');
CREATE TYPE membership_status AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE payment_status AS ENUM ('PAID', 'PENDING', 'REFUNDED');
CREATE TYPE payment_mode AS ENUM ('SIMULATED');
CREATE TYPE event_status AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');
CREATE TYPE booking_status AS ENUM ('CONFIRMED', 'CANCELLED');
CREATE TYPE ticket_status AS ENUM ('VALID', 'USED', 'CANCELLED');
CREATE TYPE audience AS ENUM ('ALL_MEMBERS', 'ALL_USERS');
CREATE TYPE garment_size AS ENUM ('S', 'M', 'L', 'XL', 'XXL', 'ONE_SIZE');
CREATE TYPE order_status AS ENUM ('PLACED', 'PAID', 'FULFILLED', 'CANCELLED');
CREATE TYPE fundraiser_status AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE task_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE expense_status AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED');
CREATE TYPE txn_type AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE txn_category AS ENUM ('DUES', 'TICKETS', 'MERCHANDISE', 'FUNDRAISER', 'DONATION', 'VENUE',
  'FOOD', 'SUPPLIES', 'MARKETING', 'REIMBURSEMENT', 'OTHER');
CREATE TYPE txn_source AS ENUM ('MEMBERSHIP_PAYMENT', 'BOOKING', 'ORDER', 'EXPENSE', 'MANUAL');
CREATE TYPE leadership_position AS ENUM ('PRESIDENT', 'VICE_PRESIDENT', 'TREASURER', 'SECRETARY',
  'EVENT_LEAD', 'OTHER');
CREATE TYPE email_status AS ENUM ('SENT', 'LOGGED', 'FAILED');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role user_role NOT NULL DEFAULT 'MEMBER',
  previous_role user_role,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX users_role_idx ON users(role);

CREATE TABLE membership_tiers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  dues_amount INTEGER NOT NULL CHECK (dues_amount >= 0),
  duration_months INTEGER NOT NULL DEFAULT 12 CHECK (duration_months = 12),
  event_discount_percent INTEGER NOT NULL DEFAULT 0 CHECK (event_discount_percent BETWEEN 0 AND 100),
  merch_discount_percent INTEGER NOT NULL DEFAULT 0 CHECK (merch_discount_percent BETWEEN 0 AND 100),
  perks_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);

CREATE TABLE members (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  student_id VARCHAR(40) NOT NULL UNIQUE,
  department VARCHAR(120) NOT NULL,
  year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 6),
  phone VARCHAR(30) NOT NULL,
  tier_id INTEGER NOT NULL REFERENCES membership_tiers(id),
  membership_status membership_status NOT NULL DEFAULT 'PENDING',
  joined_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ(3),
  dues_paid BOOLEAN NOT NULL DEFAULT FALSE,
  last_renewal_reminder_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX members_tier_id_idx ON members(tier_id);
CREATE INDEX members_status_idx ON members(membership_status);
CREATE INDEX members_expires_at_idx ON members(expires_at);

CREATE TABLE membership_payments (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  tier_id INTEGER NOT NULL REFERENCES membership_tiers(id),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  payment_mode payment_mode NOT NULL DEFAULT 'SIMULATED',
  status payment_status NOT NULL DEFAULT 'PENDING',
  paid_at TIMESTAMPTZ(3),
  period_start TIMESTAMPTZ(3) NOT NULL,
  period_end TIMESTAMPTZ(3) NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX membership_payments_member_id_idx ON membership_payments(member_id);
CREATE INDEX membership_payments_tier_id_idx ON membership_payments(tier_id);
CREATE INDEX membership_payments_status_idx ON membership_payments(status);

CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  venue VARCHAR(160) NOT NULL,
  start_at TIMESTAMPTZ(3) NOT NULL,
  end_at TIMESTAMPTZ(3) NOT NULL,
  booking_opens_at TIMESTAMPTZ(3) NOT NULL,
  booking_closes_at TIMESTAMPTZ(3) NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  member_price INTEGER NOT NULL CHECK (member_price >= 0),
  non_member_price INTEGER NOT NULL CHECK (non_member_price >= 0),
  status event_status NOT NULL DEFAULT 'DRAFT',
  banner_url VARCHAR(500),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  CHECK (end_at > start_at),
  CHECK (booking_closes_at > booking_opens_at)
);
CREATE INDEX events_status_idx ON events(status);
CREATE INDEX events_start_at_idx ON events(start_at);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price_at_booking INTEGER NOT NULL CHECK (price_at_booking >= 0),
  discount_applied INTEGER NOT NULL DEFAULT 0,
  is_member_price BOOLEAN NOT NULL DEFAULT FALSE,
  status booking_status NOT NULL DEFAULT 'CONFIRMED',
  payment_status payment_status NOT NULL DEFAULT 'PAID',
  payment_mode payment_mode NOT NULL DEFAULT 'SIMULATED',
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX bookings_event_id_idx ON bookings(event_id);
CREATE INDEX bookings_user_id_idx ON bookings(user_id);
CREATE INDEX bookings_status_idx ON bookings(status);
-- One confirmed booking per user per event, enforced by the database as well as the service.
CREATE UNIQUE INDEX bookings_one_confirmed_per_user ON bookings(event_id, user_id) WHERE status = 'CONFIRMED';

CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  status ticket_status NOT NULL DEFAULT 'VALID',
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX tickets_status_idx ON tickets(status);

CREATE TABLE check_ins (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  checked_in_by_id INTEGER NOT NULL REFERENCES users(id),
  checked_in_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  membership_verified_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX check_ins_checked_in_by_id_idx ON check_ins(checked_in_by_id);

CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  audience audience NOT NULL DEFAULT 'ALL_MEMBERS',
  author_id INTEGER NOT NULL REFERENCES users(id),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  email_recipient_count INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX announcements_author_id_idx ON announcements(author_id);
CREATE INDEX announcements_published_at_idx ON announcements(published_at);

CREATE TABLE email_logs (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER REFERENCES announcements(id) ON DELETE SET NULL,
  subject VARCHAR(200) NOT NULL DEFAULT '',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  status email_status NOT NULL,
  sent_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX email_logs_announcement_id_idx ON email_logs(announcement_id);
CREATE INDEX email_logs_status_idx ON email_logs(status);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  base_price INTEGER NOT NULL CHECK (base_price >= 0),
  image_url VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX products_is_active_idx ON products(is_active);

CREATE TABLE product_variants (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size garment_size NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sku VARCHAR(40) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  UNIQUE (product_id, size)
);
CREATE INDEX product_variants_product_id_idx ON product_variants(product_id);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
  discount_total INTEGER NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  total INTEGER NOT NULL CHECK (total >= 0),
  status order_status NOT NULL DEFAULT 'PLACED',
  payment_status payment_status NOT NULL DEFAULT 'PENDING',
  payment_mode payment_mode NOT NULL DEFAULT 'SIMULATED',
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_id_idx ON orders(user_id);
CREATE INDEX orders_status_idx ON orders(status);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  discount_applied INTEGER NOT NULL DEFAULT 0 CHECK (discount_applied >= 0),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_id_idx ON order_items(order_id);
CREATE INDEX order_items_variant_id_idx ON order_items(variant_id);

CREATE TABLE fundraisers (
  id SERIAL PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  goal_amount INTEGER NOT NULL CHECK (goal_amount > 0),
  start_date TIMESTAMPTZ(3) NOT NULL,
  end_date TIMESTAMPTZ(3) NOT NULL,
  status fundraiser_status NOT NULL DEFAULT 'PLANNING',
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  CHECK (end_date > start_date)
);
CREATE INDEX fundraisers_status_idx ON fundraisers(status);
CREATE INDEX fundraisers_created_by_id_idx ON fundraisers(created_by_id);

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  fundraiser_id INTEGER REFERENCES fundraisers(id) ON DELETE CASCADE,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ(3),
  status task_status NOT NULL DEFAULT 'PENDING',
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX tasks_fundraiser_id_idx ON tasks(fundraiser_id);
CREATE INDEX tasks_event_id_idx ON tasks(event_id);
CREATE INDEX tasks_assignee_id_idx ON tasks(assignee_id);
CREATE INDEX tasks_status_idx ON tasks(status);

CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  submitted_by_id INTEGER NOT NULL REFERENCES users(id),
  event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
  fundraiser_id INTEGER REFERENCES fundraisers(id) ON DELETE SET NULL,
  category txn_category NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  receipt_url VARCHAR(500),
  status expense_status NOT NULL DEFAULT 'SUBMITTED',
  reviewed_by_id INTEGER REFERENCES users(id),
  review_note TEXT,
  reimbursed_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX expenses_submitted_by_id_idx ON expenses(submitted_by_id);
CREATE INDEX expenses_event_id_idx ON expenses(event_id);
CREATE INDEX expenses_fundraiser_id_idx ON expenses(fundraiser_id);
CREATE INDEX expenses_reviewed_by_id_idx ON expenses(reviewed_by_id);
CREATE INDEX expenses_status_idx ON expenses(status);

-- The ledger: the single source of truth for every finance number.
-- source_id is text so refunds can be stored as "<id>:refund" alongside the original "<id>".
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  type txn_type NOT NULL,
  category txn_category NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
  fundraiser_id INTEGER REFERENCES fundraisers(id) ON DELETE SET NULL,
  source_type txn_source NOT NULL,
  source_id VARCHAR(64) NOT NULL,
  occurred_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  recorded_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  -- The same payment, booking, order or expense can never be counted twice.
  UNIQUE (source_type, source_id)
);
CREATE INDEX transactions_type_idx ON transactions(type);
CREATE INDEX transactions_category_idx ON transactions(category);
CREATE INDEX transactions_event_id_idx ON transactions(event_id);
CREATE INDEX transactions_fundraiser_id_idx ON transactions(fundraiser_id);
CREATE INDEX transactions_recorded_by_id_idx ON transactions(recorded_by_id);
CREATE INDEX transactions_occurred_at_idx ON transactions(occurred_at);

CREATE TABLE leadership (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position leadership_position NOT NULL,
  term_start TIMESTAMPTZ(3) NOT NULL,
  term_end TIMESTAMPTZ(3) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX leadership_user_id_idx ON leadership(user_id);
CREATE INDEX leadership_is_active_idx ON leadership(is_active);

-- ---------------------------------------------------------------------------
-- Seed: users (password for all: Password@123)
-- Ids 1 to 4 are staff; ids 5 to 120 match the student number in the email.
-- ---------------------------------------------------------------------------
INSERT INTO users (id, name, email, password_hash, role) VALUES
  (1, 'Avery Admin', 'admin@skyline.example.com', '$2b$10$kW9LMk/FHrJMUx8MjnZ/vObaAsNwLh2V8Q/57.WVBMmmJxbmYldQm', 'ADMIN'),
  (2, 'Toby Treasurer', 'treasurer@skyline.example.com', '$2b$10$kW9LMk/FHrJMUx8MjnZ/vObaAsNwLh2V8Q/57.WVBMmmJxbmYldQm', 'TREASURER'),
  (3, 'Vera Volunteer', 'volunteer1@skyline.example.com', '$2b$10$kW9LMk/FHrJMUx8MjnZ/vObaAsNwLh2V8Q/57.WVBMmmJxbmYldQm', 'VOLUNTEER'),
  (4, 'Victor Volunteer', 'volunteer2@skyline.example.com', '$2b$10$kW9LMk/FHrJMUx8MjnZ/vObaAsNwLh2V8Q/57.WVBMmmJxbmYldQm', 'VOLUNTEER');

INSERT INTO users (id, name, email, password_hash, role, created_at)
SELECT n,
  (ARRAY['Aarav','Diya','Kabir','Meera','Rohan','Sana','Ishaan','Anika','Dev','Tara',
         'Nikhil','Priya','Arjun','Leela','Vikram','Zoya','Karan','Nisha','Omar','Riya'])[1 + n % 20]
    || ' ' ||
  (ARRAY['Sample','Example','Testwell','Mockford','Placeholder','Demoson','Fakeley','Stubbs',
         'Dummyworth','Specimen','Trialson','Prototype','Fixture','Mockley','Sandbox'])[1 + (n * 7) % 15],
  'student' || n || '@example.com',
  '$2b$10$kW9LMk/FHrJMUx8MjnZ/vObaAsNwLh2V8Q/57.WVBMmmJxbmYldQm',
  CASE WHEN n <= 10 THEN 'VOLUNTEER'::user_role ELSE 'MEMBER'::user_role END,
  now() - make_interval(days => 400 - n * 3)
FROM generate_series(5, 120) AS n;

-- ---------------------------------------------------------------------------
-- Membership tiers (all last 12 months)
-- ---------------------------------------------------------------------------
INSERT INTO membership_tiers (id, name, dues_amount, duration_months, event_discount_percent, merch_discount_percent, perks_text) VALUES
  (1, 'Standard', 50000, 12, 10, 5, 'Member ticket prices, 5 percent off merchandise, member-only announcements'),
  (2, 'Premium', 120000, 12, 25, 15, 'Member ticket prices, 15 percent off merchandise, priority seating, free welcome T-shirt');

-- ---------------------------------------------------------------------------
-- Members: students 5 to 104 (member id = n - 4)
--   5-62  ACTIVE, expiring in 40 to 340 days
--   63-73 ACTIVE, expiring within 30 days (renewal reminders)
--   74    ACTIVE but already past expiry (the expiry job will flip it)
--   75-96 EXPIRED, 97-101 PENDING, 102-104 CANCELLED
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE seed_members ON COMMIT DROP AS
SELECT n,
  CASE WHEN n <= 74 THEN 'ACTIVE' WHEN n <= 96 THEN 'EXPIRED' WHEN n <= 101 THEN 'PENDING' ELSE 'CANCELLED' END AS status,
  CASE
    WHEN n <= 62 THEN now() + make_interval(days => 40 + (n * 13) % 300)
    WHEN n <= 73 THEN now() + make_interval(days => (n - 62) * 2)
    WHEN n = 74 THEN now() - interval '1 day'
    WHEN n <= 96 THEN now() - make_interval(days => (n - 70) * 9)
    WHEN n <= 101 THEN NULL
    ELSE now() - make_interval(days => 20 + n - 100)
  END AS expires_at,
  CASE WHEN n % 3 = 0 THEN 2 ELSE 1 END AS tier_id,
  (n <= 74 AND n % 2 = 0) AS renewed
FROM generate_series(5, 104) AS n;

INSERT INTO members (id, user_id, student_id, department, year, phone, tier_id, membership_status,
  joined_at, expires_at, dues_paid, last_renewal_reminder_at, created_at)
SELECT n - 4, n,
  'SKY' || lpad(n::text, 4, '0'),
  (ARRAY['Computer Science','Mechanical Engineering','Electrical Engineering','Civil Engineering',
         'Commerce','Fine Arts','Biotechnology','Mathematics'])[1 + n % 8],
  1 + n % 4,
  '+91 90000 ' || lpad(n::text, 5, '0'),
  tier_id,
  status::membership_status,
  CASE
    WHEN expires_at IS NULL THEN now() - make_interval(days => n - 90)
    WHEN renewed THEN expires_at - interval '24 months'
    ELSE expires_at - interval '12 months'
  END,
  expires_at,
  status IN ('ACTIVE', 'EXPIRED', 'CANCELLED'),
  CASE WHEN n BETWEEN 63 AND 66 THEN now() - interval '2 days' ELSE NULL END,
  CASE
    WHEN expires_at IS NULL THEN now() - make_interval(days => n - 90)
    WHEN renewed THEN expires_at - interval '24 months'
    ELSE expires_at - interval '12 months'
  END
FROM seed_members;

-- Current period payment for every member who ever paid
INSERT INTO membership_payments (member_id, tier_id, amount, payment_mode, status, paid_at, period_start, period_end, created_at)
SELECT s.n - 4, s.tier_id, t.dues_amount, 'SIMULATED', 'PAID',
  s.expires_at - interval '12 months', s.expires_at - interval '12 months', s.expires_at, s.expires_at - interval '12 months'
FROM seed_members s JOIN membership_tiers t ON t.id = s.tier_id
WHERE s.expires_at IS NOT NULL;

-- Earlier year for members who renewed
INSERT INTO membership_payments (member_id, tier_id, amount, payment_mode, status, paid_at, period_start, period_end, created_at)
SELECT s.n - 4, s.tier_id, t.dues_amount, 'SIMULATED', 'PAID',
  s.expires_at - interval '24 months', s.expires_at - interval '24 months', s.expires_at - interval '12 months', s.expires_at - interval '24 months'
FROM seed_members s JOIN membership_tiers t ON t.id = s.tier_id
WHERE s.renewed;

-- Pending applications
INSERT INTO membership_payments (member_id, tier_id, amount, payment_mode, status, paid_at, period_start, period_end, created_at)
SELECT s.n - 4, s.tier_id, t.dues_amount, 'SIMULATED', 'PENDING', NULL,
  now(), now() + interval '12 months', now() - make_interval(days => s.n - 90)
FROM seed_members s JOIN membership_tiers t ON t.id = s.tier_id
WHERE s.status = 'PENDING';

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
INSERT INTO events (id, title, description, venue, start_at, end_at, booking_opens_at, booking_closes_at,
  capacity, member_price, non_member_price, status) VALUES
  (1, 'Freshers Welcome Night', 'Music, games and introductions for first year students.', 'Main Auditorium',
    now() - interval '150 days', now() - interval '150 days' + interval '4 hours',
    now() - interval '180 days', now() - interval '150 days' - interval '1 hour', 60, 10000, 20000, 'COMPLETED'),
  (2, 'Tech Talk: Careers in Data', 'An evening with alumni working in analytics and machine learning.', 'Seminar Hall B',
    now() - interval '110 days', now() - interval '110 days' + interval '2 hours',
    now() - interval '140 days', now() - interval '110 days' - interval '1 hour', 40, 5000, 15000, 'COMPLETED'),
  (3, 'Cultural Fest Preview', 'Dance, theatre and music teasers ahead of the annual fest.', 'Open Air Theatre',
    now() - interval '75 days', now() - interval '75 days' + interval '3 hours',
    now() - interval '105 days', now() - interval '75 days' - interval '1 hour', 50, 15000, 30000, 'COMPLETED'),
  (4, 'Inter-College Quiz', 'Teams of three compete across six rounds.', 'Library Auditorium',
    now() - interval '45 days', now() - interval '45 days' + interval '3 hours',
    now() - interval '75 days', now() - interval '45 days' - interval '1 hour', 45, 5000, 10000, 'COMPLETED'),
  (5, 'Winter Charity Concert', 'Student bands perform; proceeds support the community library.', 'Main Auditorium',
    now() - interval '20 days', now() - interval '20 days' + interval '3 hours',
    now() - interval '50 days', now() - interval '20 days' - interval '1 hour', 50, 20000, 35000, 'COMPLETED'),
  (6, 'Spring Gala', 'The flagship evening of the year: dinner, awards and live music.', 'Grand Ballroom, City Convention Centre',
    now() + interval '21 days', now() + interval '21 days' + interval '5 hours',
    now() - interval '9 days', now() + interval '21 days' - interval '1 hour', 50, 30000, 50000, 'PUBLISHED'),
  (7, 'Photography Walk', 'A guided golden-hour walk around the old town.', 'Meet at the Clock Tower',
    now() + interval '10 days', now() + interval '10 days' + interval '3 hours',
    now() - interval '20 days', now() + interval '10 days' - interval '1 hour', 40, 10000, 15000, 'PUBLISHED'),
  (8, 'Annual General Meeting', 'Yearly report, budget review and elections.', 'Seminar Hall A',
    now() + interval '40 days', now() + interval '40 days' + interval '2 hours',
    now() + interval '10 days', now() + interval '40 days' - interval '1 hour', 120, 0, 0, 'DRAFT');

-- ---------------------------------------------------------------------------
-- Bookings and tickets (205 in total)
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE seed_bookings ON COMMIT DROP AS
SELECT
  row_number() OVER (ORDER BY e.id, k) AS id,
  e.id AS event_id,
  k,
  5 + ((k * 7 + e.id * 11) % 116) AS user_id,
  e.start_at,
  e.member_price,
  e.non_member_price,
  (e.start_at < now()) AS is_past,
  CASE
    WHEN e.start_at < now() THEN e.start_at - make_interval(days => 3 + k % 20)
    ELSE now() - make_interval(hours => 1 + k * 5)
  END AS created_at,
  (k % 21 = 20) AS cancelled
FROM events e
JOIN (VALUES (1, 40), (2, 30), (3, 35), (4, 30), (5, 30), (6, 28), (7, 12)) AS c(event_id, cnt) ON c.event_id = e.id
CROSS JOIN LATERAL generate_series(0, c.cnt - 1) AS k;

ALTER TABLE seed_bookings ADD COLUMN is_member BOOLEAN;
UPDATE seed_bookings SET is_member = CASE WHEN is_past THEN user_id <= 96 ELSE user_id <= 73 END;

INSERT INTO bookings (id, event_id, user_id, price_at_booking, discount_applied, is_member_price, status,
  payment_status, payment_mode, created_at)
SELECT id, event_id, user_id,
  CASE WHEN is_member THEN member_price ELSE non_member_price END,
  CASE WHEN is_member THEN non_member_price - member_price ELSE 0 END,
  is_member,
  CASE WHEN cancelled THEN 'CANCELLED'::booking_status ELSE 'CONFIRMED'::booking_status END,
  CASE WHEN cancelled THEN 'REFUNDED'::payment_status ELSE 'PAID'::payment_status END,
  'SIMULATED', created_at
FROM seed_bookings;

INSERT INTO tickets (id, booking_id, token, status, created_at)
SELECT id, id,
  substr(md5(random()::text || clock_timestamp()::text || id::text), 1, 28),
  CASE
    WHEN cancelled THEN 'CANCELLED'::ticket_status
    WHEN is_past AND k % 10 < 7 THEN 'USED'::ticket_status
    ELSE 'VALID'::ticket_status
  END,
  created_at
FROM seed_bookings;

INSERT INTO check_ins (ticket_id, checked_in_by_id, checked_in_at, membership_verified_active, created_at)
SELECT b.id, CASE WHEN b.k % 2 = 0 THEN 3 ELSE 4 END,
  b.start_at + make_interval(mins => b.k % 60), b.is_member, b.start_at + make_interval(mins => b.k % 60)
FROM seed_bookings b
JOIN tickets t ON t.id = b.id
WHERE t.status = 'USED';

-- ---------------------------------------------------------------------------
-- Announcements and email history
-- ---------------------------------------------------------------------------
INSERT INTO announcements (id, title, body, audience, author_id, is_pinned, email_sent, email_recipient_count, published_at, archived_at) VALUES
  (1, 'Welcome to ClubFlow', 'All sign-ups, tickets, merchandise and announcements now live in one place. Log in with your student email to see your membership card.', 'ALL_USERS', 1, TRUE, TRUE, 116, now() - interval '160 days', NULL),
  (2, 'Freshers Welcome Night tickets are live', 'Book through the Events page. Members pay Rs 100, everyone else Rs 200.', 'ALL_USERS', 1, FALSE, TRUE, 116, now() - interval '175 days', NULL),
  (3, 'Tech Talk speakers announced', 'Three alumni from the data science industry will share their journeys.', 'ALL_MEMBERS', 1, FALSE, TRUE, 82, now() - interval '135 days', NULL),
  (4, 'Cultural Fest auditions', 'Auditions run all week in the Open Air Theatre from 4 pm.', 'ALL_MEMBERS', 1, FALSE, TRUE, 80, now() - interval '100 days', NULL),
  (5, 'Quiz teams wanted', 'Form a team of three and register before Friday.', 'ALL_USERS', 1, FALSE, TRUE, 116, now() - interval '70 days', NULL),
  (6, 'Winter Charity Concert line-up', 'Five student bands confirmed. All proceeds go to the community library.', 'ALL_USERS', 1, FALSE, TRUE, 116, now() - interval '45 days', NULL),
  (7, 'Thank you for a record concert', 'We raised more than ever before. Photos are on the notice board.', 'ALL_MEMBERS', 1, FALSE, TRUE, 74, now() - interval '18 days', NULL),
  (8, 'Spring Gala bookings open', 'Only 50 seats. Members pay Rs 300 and non-members Rs 500. Your QR ticket appears under My Tickets.', 'ALL_USERS', 1, TRUE, TRUE, 116, now() - interval '9 days', NULL),
  (9, 'Bake Sale volunteers needed', 'Sign up for a baking or stall shift on the fundraiser board.', 'ALL_MEMBERS', 1, FALSE, TRUE, 72, now() - interval '13 days', NULL),
  (10, 'New hoodies in stock', 'Navy hoodies in S to XXL. Members get their tier discount automatically.', 'ALL_USERS', 1, FALSE, TRUE, 116, now() - interval '30 days', NULL),
  (11, 'Renew your membership', 'Several memberships expire this month. Renew from your profile page.', 'ALL_MEMBERS', 2, FALSE, TRUE, 71, now() - interval '5 days', NULL),
  (12, 'Room change for the quiz', 'This notice was replaced by the updated venue announcement.', 'ALL_USERS', 1, FALSE, TRUE, 116, now() - interval '50 days', now() - interval '48 days');

INSERT INTO email_logs (announcement_id, subject, recipient_count, status, sent_at)
SELECT id, title, email_recipient_count, 'LOGGED', published_at FROM announcements;

-- ---------------------------------------------------------------------------
-- Merchandise
-- ---------------------------------------------------------------------------
INSERT INTO products (id, name, description, base_price, is_active) VALUES
  (1, 'Skyline Hoodie', 'Heavyweight navy hoodie with the association crest.', 89900, TRUE),
  (2, 'Skyline T-Shirt', 'Soft cotton tee in white with the skyline logo.', 49900, TRUE),
  (3, 'Skyline Cap', 'Adjustable cap with an embroidered logo.', 29900, TRUE),
  (4, 'Canvas Tote Bag', 'Sturdy tote for books and laptops.', 24900, TRUE);

INSERT INTO product_variants (id, product_id, size, stock, sku) VALUES
  (1, 1, 'S', 12, 'HOOD-S'), (2, 1, 'M', 20, 'HOOD-M'), (3, 1, 'L', 18, 'HOOD-L'), (4, 1, 'XL', 9, 'HOOD-XL'), (5, 1, 'XXL', 2, 'HOOD-XXL'),
  (6, 2, 'S', 25, 'TEE-S'), (7, 2, 'M', 30, 'TEE-M'), (8, 2, 'L', 28, 'TEE-L'), (9, 2, 'XL', 15, 'TEE-XL'), (10, 2, 'XXL', 6, 'TEE-XXL'),
  (11, 3, 'ONE_SIZE', 40, 'CAP-OS'),
  (12, 4, 'ONE_SIZE', 4, 'TOTE-OS');

CREATE TEMP TABLE seed_order_items ON COMMIT DROP AS
SELECT o AS order_id, ((o * 5) % 12) + 1 AS variant_id, CASE WHEN o % 3 = 0 THEN 2 ELSE 1 END AS quantity
FROM generate_series(1, 60) AS o
UNION ALL
SELECT o,
  CASE WHEN ((o * 7 + 3) % 12) + 1 = ((o * 5) % 12) + 1 THEN (((o * 7 + 3) % 12) + 1) % 12 + 1 ELSE ((o * 7 + 3) % 12) + 1 END,
  1
FROM generate_series(1, 60) AS o
WHERE o % 2 = 0;

CREATE TEMP TABLE seed_orders ON COMMIT DROP AS
SELECT o AS id, 5 + ((o * 13) % 116) AS user_id, now() - make_interval(days => o * 3, hours => o % 9) AS created_at
FROM generate_series(1, 60) AS o;

CREATE TEMP TABLE seed_order_lines ON COMMIT DROP AS
SELECT i.order_id, i.variant_id, i.quantity, p.base_price AS unit_price,
  (round(p.base_price * COALESCE(t.merch_discount_percent, 0) / 100.0))::int * i.quantity AS discount_applied
FROM seed_order_items i
JOIN seed_orders so ON so.id = i.order_id
JOIN product_variants v ON v.id = i.variant_id
JOIN products p ON p.id = v.product_id
LEFT JOIN members m ON m.user_id = so.user_id AND m.membership_status = 'ACTIVE' AND m.user_id <= 73
LEFT JOIN membership_tiers t ON t.id = m.tier_id;

INSERT INTO orders (id, user_id, subtotal, discount_total, total, status, payment_status, payment_mode, created_at)
SELECT so.id, so.user_id,
  SUM(l.unit_price * l.quantity), SUM(l.discount_applied), SUM(l.unit_price * l.quantity) - SUM(l.discount_applied),
  CASE WHEN so.id % 10 = 0 THEN 'CANCELLED'::order_status WHEN so.id % 10 <= 5 THEN 'FULFILLED'::order_status ELSE 'PAID'::order_status END,
  CASE WHEN so.id % 10 = 0 THEN 'REFUNDED'::payment_status ELSE 'PAID'::payment_status END,
  'SIMULATED', so.created_at
FROM seed_orders so JOIN seed_order_lines l ON l.order_id = so.id
GROUP BY so.id, so.user_id, so.created_at;

INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_applied, created_at)
SELECT l.order_id, l.variant_id, l.quantity, l.unit_price, l.discount_applied, so.created_at
FROM seed_order_lines l JOIN seed_orders so ON so.id = l.order_id;

-- ---------------------------------------------------------------------------
-- Fundraisers and tasks
-- ---------------------------------------------------------------------------
INSERT INTO fundraisers (id, title, description, goal_amount, start_date, end_date, status, created_by_id) VALUES
  (1, 'Spring Bake Sale', 'Two weekends of stalls on the main lawn. Proceeds fund the Spring Gala scholarships.', 2500000,
    now() - interval '14 days', now() + interval '16 days', 'ACTIVE', 1),
  (2, 'Book Drive 2026', 'Collecting and selling second-hand textbooks.', 1500000,
    now() - interval '200 days', now() - interval '170 days', 'COMPLETED', 1),
  (3, 'Charity Fun Run', 'A 5 km campus run with sponsored bibs.', 5000000,
    now() + interval '45 days', now() + interval '75 days', 'PLANNING', 1);

INSERT INTO tasks (fundraiser_id, event_id, title, description, assignee_id, due_date, status, created_by_id) VALUES
  (1, NULL, 'Book the main lawn stall space', 'Confirm the booking with the estates office.', 3, now() - interval '10 days', 'COMPLETED', 1),
  (1, NULL, 'Design the bake sale poster', 'A4 poster and an Instagram square.', 5, now() - interval '9 days', 'COMPLETED', 1),
  (1, NULL, 'Buy baking ingredients', 'Flour, sugar, butter and chocolate for 300 items.', 4, now() - interval '6 days', 'COMPLETED', 1),
  (1, NULL, 'Collect cash float from treasurer', 'Rs 2,000 in small notes.', 6, now() - interval '4 days', 'COMPLETED', 1),
  (1, NULL, 'Bake cupcakes for weekend one', 'Target 120 cupcakes.', 7, now() - interval '2 days', 'IN_PROGRESS', 1),
  (1, NULL, 'Arrange tables and banners', 'Borrow four tables from the sports office.', 8, now() - interval '1 day', 'PENDING', 1),
  (1, NULL, 'Run the Saturday stall shift', 'Two volunteers from 10 am to 2 pm.', 9, now() + interval '2 days', 'IN_PROGRESS', 1),
  (1, NULL, 'Run the Sunday stall shift', 'Two volunteers from 10 am to 2 pm.', 10, now() + interval '3 days', 'PENDING', 1),
  (1, NULL, 'Record daily takings', 'Hand cash to the treasurer and record it in ClubFlow.', 2, now() + interval '9 days', 'IN_PROGRESS', 1),
  (1, NULL, 'Thank-you post for donors', 'Publish once the sale ends.', NULL, now() + interval '17 days', 'PENDING', 1),
  (2, NULL, 'Collect donated books', 'Drop-off box at the library entrance.', 3, now() - interval '190 days', 'COMPLETED', 1),
  (2, NULL, 'Sort books by subject', 'Price each book using the agreed grid.', 4, now() - interval '185 days', 'COMPLETED', 1),
  (2, NULL, 'Run sale day one', 'Main corridor stall.', 5, now() - interval '178 days', 'COMPLETED', 1),
  (2, NULL, 'Run sale day two', 'Main corridor stall.', 6, now() - interval '177 days', 'COMPLETED', 1),
  (2, NULL, 'Donate unsold books', 'Send to the community library.', 7, now() - interval '172 days', 'COMPLETED', 1),
  (2, NULL, 'Publish results', 'Share totals in an announcement.', 1, now() - interval '170 days', 'COMPLETED', 1),
  (3, NULL, 'Get route approval', 'Campus security sign-off for the 5 km route.', 1, now() + interval '20 days', 'PENDING', 1),
  (3, NULL, 'Find bib sponsors', 'Approach five local businesses.', 2, now() + interval '25 days', 'PENDING', 1),
  (3, NULL, 'Order finisher medals', 'Get three quotes first.', 3, now() + interval '30 days', 'PENDING', 1),
  (3, NULL, 'Recruit marshals', 'Twelve marshals needed along the route.', 4, now() + interval '35 days', 'PENDING', 1),
  (3, NULL, 'First aid arrangements', 'Coordinate with the campus medical centre.', NULL, now() + interval '40 days', 'PENDING', 1),
  (NULL, 6, 'Confirm gala catering menu', 'Vegetarian and vegan options required.', 5, now() + interval '7 days', 'IN_PROGRESS', 1),
  (NULL, 6, 'Print table numbers and place cards', 'Use the final booking list.', 6, now() + interval '18 days', 'PENDING', 1),
  (NULL, 6, 'Set up the check-in desk', 'Two phones with the scanner page open.', 3, now() + interval '21 days', 'PENDING', 1),
  (NULL, 6, 'Book the sound system', 'Include two wireless microphones.', 4, now() - interval '3 days', 'COMPLETED', 1);

-- ---------------------------------------------------------------------------
-- Expenses (40): 1-10 SUBMITTED, 11-18 APPROVED, 19-25 REJECTED, 26-40 REIMBURSED
-- ---------------------------------------------------------------------------
INSERT INTO expenses (id, submitted_by_id, event_id, fundraiser_id, category, amount, description, status,
  reviewed_by_id, review_note, reimbursed_at, created_at)
SELECT i,
  (ARRAY[3, 4, 5, 6, 7, 8, 9, 10])[1 + i % 8],
  CASE WHEN i % 3 = 0 THEN NULL ELSE 1 + i % 6 END,
  CASE WHEN i % 3 = 0 THEN 1 + i % 2 ELSE NULL END,
  (ARRAY['VENUE','FOOD','SUPPLIES','MARKETING','OTHER'])[1 + i % 5]::txn_category,
  50000 + ((i * 37) % 45) * 10000,
  (ARRAY['Hall booking deposit','Snacks and water for volunteers','Decorations and stationery',
         'Printed posters and flyers','Local transport for equipment'])[1 + i % 5] || ' (claim ' || i || ')',
  CASE WHEN i <= 10 THEN 'SUBMITTED' WHEN i <= 18 THEN 'APPROVED' WHEN i <= 25 THEN 'REJECTED' ELSE 'REIMBURSED' END::expense_status,
  CASE WHEN i <= 10 THEN NULL ELSE 2 END,
  CASE WHEN i BETWEEN 19 AND 25 THEN 'Receipt missing or outside the spending policy'
       WHEN i > 10 THEN 'Approved by treasurer' ELSE NULL END,
  CASE WHEN i > 25 THEN now() - make_interval(days => i * 3 - 5) ELSE NULL END,
  now() - make_interval(days => i * 3)
FROM generate_series(1, 40) AS i;

-- ---------------------------------------------------------------------------
-- Ledger: generated from the source records so it reconciles by construction
-- ---------------------------------------------------------------------------
INSERT INTO transactions (type, category, amount, description, source_type, source_id, occurred_at, recorded_by_id)
SELECT 'INCOME', 'DUES', p.amount, 'Membership dues: ' || t.name, 'MEMBERSHIP_PAYMENT', p.id::text, p.paid_at, m.user_id
FROM membership_payments p
JOIN membership_tiers t ON t.id = p.tier_id
JOIN members m ON m.id = p.member_id
WHERE p.status = 'PAID' AND p.amount > 0;

INSERT INTO transactions (type, category, amount, description, event_id, source_type, source_id, occurred_at, recorded_by_id)
SELECT 'INCOME', 'TICKETS', b.price_at_booking, 'Ticket #' || b.id || ': ' || e.title, b.event_id, 'BOOKING', b.id::text, b.created_at, b.user_id
FROM bookings b JOIN events e ON e.id = b.event_id
WHERE b.price_at_booking > 0;

INSERT INTO transactions (type, category, amount, description, event_id, source_type, source_id, occurred_at, recorded_by_id)
SELECT 'EXPENSE', 'TICKETS', b.price_at_booking, 'Refund for ticket #' || b.id || ': ' || e.title, b.event_id, 'BOOKING', b.id || ':refund', b.created_at + interval '1 day', b.user_id
FROM bookings b JOIN events e ON e.id = b.event_id
WHERE b.status = 'CANCELLED' AND b.price_at_booking > 0;

INSERT INTO transactions (type, category, amount, description, source_type, source_id, occurred_at, recorded_by_id)
SELECT 'INCOME', 'MERCHANDISE', o.total, 'Merchandise order #' || o.id, 'ORDER', o.id::text, o.created_at, o.user_id
FROM orders o WHERE o.total > 0;

INSERT INTO transactions (type, category, amount, description, source_type, source_id, occurred_at, recorded_by_id)
SELECT 'EXPENSE', 'MERCHANDISE', o.total, 'Refund for order #' || o.id, 'ORDER', o.id || ':refund', o.created_at + interval '1 day', 1
FROM orders o WHERE o.status = 'CANCELLED' AND o.total > 0;

INSERT INTO transactions (type, category, amount, description, event_id, fundraiser_id, source_type, source_id, occurred_at, recorded_by_id)
SELECT 'EXPENSE', 'REIMBURSEMENT', x.amount, 'Reimbursement: ' || x.description, x.event_id, x.fundraiser_id, 'EXPENSE', x.id::text, x.reimbursed_at, 2
FROM expenses x WHERE x.status = 'REIMBURSED';

INSERT INTO transactions (type, category, amount, description, event_id, fundraiser_id, source_type, source_id, occurred_at, recorded_by_id) VALUES
  ('INCOME', 'FUNDRAISER', 180000, 'Bake sale takings: day 1', NULL, 1, 'MANUAL', 'seed-manual-01', now() - interval '12 days', 2),
  ('INCOME', 'FUNDRAISER', 250000, 'Bake sale takings: day 2', NULL, 1, 'MANUAL', 'seed-manual-02', now() - interval '9 days', 2),
  ('INCOME', 'FUNDRAISER', 320000, 'Bake sale takings: day 3', NULL, 1, 'MANUAL', 'seed-manual-03', now() - interval '6 days', 2),
  ('INCOME', 'FUNDRAISER', 150000, 'Bake sale takings: day 4', NULL, 1, 'MANUAL', 'seed-manual-04', now() - interval '3 days', 2),
  ('INCOME', 'FUNDRAISER', 250000, 'Bake sale takings: day 5', NULL, 1, 'MANUAL', 'seed-manual-05', now() - interval '1 day', 2),
  ('INCOME', 'FUNDRAISER', 420000, 'Book drive sales: day 1', NULL, 2, 'MANUAL', 'seed-manual-06', now() - interval '178 days', 2),
  ('INCOME', 'FUNDRAISER', 510000, 'Book drive sales: day 2', NULL, 2, 'MANUAL', 'seed-manual-07', now() - interval '177 days', 2),
  ('INCOME', 'FUNDRAISER', 390000, 'Book drive online sales', NULL, 2, 'MANUAL', 'seed-manual-08', now() - interval '174 days', 2),
  ('INCOME', 'FUNDRAISER', 300000, 'Book drive sponsor contribution', NULL, 2, 'MANUAL', 'seed-manual-09', now() - interval '171 days', 2),
  ('INCOME', 'DONATION', 500000, 'Alumni association donation', NULL, NULL, 'MANUAL', 'seed-manual-10', now() - interval '100 days', 2),
  ('INCOME', 'DONATION', 250000, 'Faculty donation', NULL, NULL, 'MANUAL', 'seed-manual-11', now() - interval '60 days', 2),
  ('INCOME', 'DONATION', 1000000, 'Local business sponsorship for the Spring Gala', 6, NULL, 'MANUAL', 'seed-manual-12', now() - interval '15 days', 2),
  ('EXPENSE', 'VENUE', 1500000, 'Ballroom deposit for the Spring Gala', 6, NULL, 'MANUAL', 'seed-manual-13', now() - interval '5 days', 2),
  ('EXPENSE', 'FOOD', 450000, 'Refreshments for the Winter Charity Concert', 5, NULL, 'MANUAL', 'seed-manual-14', now() - interval '21 days', 2),
  ('EXPENSE', 'MARKETING', 300000, 'Posters and social media promotion', NULL, NULL, 'MANUAL', 'seed-manual-15', now() - interval '30 days', 2),
  ('EXPENSE', 'SUPPLIES', 200000, 'Bake sale packaging and labels', NULL, 1, 'MANUAL', 'seed-manual-16', now() - interval '10 days', 2),
  ('EXPENSE', 'VENUE', 800000, 'Open Air Theatre hire for the Cultural Fest Preview', 3, NULL, 'MANUAL', 'seed-manual-17', now() - interval '76 days', 2),
  ('EXPENSE', 'OTHER', 150000, 'Bank charges', NULL, NULL, 'MANUAL', 'seed-manual-18', now() - interval '50 days', 2);

-- ---------------------------------------------------------------------------
-- Leadership
-- ---------------------------------------------------------------------------
INSERT INTO leadership (user_id, position, term_start, term_end, is_active) VALUES
  (1, 'PRESIDENT', now() - interval '150 days', now() + interval '215 days', TRUE),
  (2, 'TREASURER', now() - interval '150 days', now() + interval '215 days', TRUE),
  (5, 'VICE_PRESIDENT', now() - interval '150 days', now() + interval '215 days', TRUE),
  (6, 'SECRETARY', now() - interval '150 days', now() + interval '215 days', TRUE),
  (7, 'EVENT_LEAD', now() - interval '150 days', now() + interval '215 days', TRUE),
  (80, 'PRESIDENT', now() - interval '515 days', now() - interval '150 days', FALSE);

-- ---------------------------------------------------------------------------
-- Move every sequence past the explicit ids used above
-- ---------------------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));
SELECT setval(pg_get_serial_sequence('membership_tiers', 'id'), (SELECT MAX(id) FROM membership_tiers));
SELECT setval(pg_get_serial_sequence('members', 'id'), (SELECT MAX(id) FROM members));
SELECT setval(pg_get_serial_sequence('membership_payments', 'id'), (SELECT MAX(id) FROM membership_payments));
SELECT setval(pg_get_serial_sequence('events', 'id'), (SELECT MAX(id) FROM events));
SELECT setval(pg_get_serial_sequence('bookings', 'id'), (SELECT MAX(id) FROM bookings));
SELECT setval(pg_get_serial_sequence('tickets', 'id'), (SELECT MAX(id) FROM tickets));
SELECT setval(pg_get_serial_sequence('check_ins', 'id'), (SELECT MAX(id) FROM check_ins));
SELECT setval(pg_get_serial_sequence('announcements', 'id'), (SELECT MAX(id) FROM announcements));
SELECT setval(pg_get_serial_sequence('email_logs', 'id'), (SELECT MAX(id) FROM email_logs));
SELECT setval(pg_get_serial_sequence('products', 'id'), (SELECT MAX(id) FROM products));
SELECT setval(pg_get_serial_sequence('product_variants', 'id'), (SELECT MAX(id) FROM product_variants));
SELECT setval(pg_get_serial_sequence('orders', 'id'), (SELECT MAX(id) FROM orders));
SELECT setval(pg_get_serial_sequence('order_items', 'id'), (SELECT MAX(id) FROM order_items));
SELECT setval(pg_get_serial_sequence('fundraisers', 'id'), (SELECT MAX(id) FROM fundraisers));
SELECT setval(pg_get_serial_sequence('tasks', 'id'), (SELECT MAX(id) FROM tasks));
SELECT setval(pg_get_serial_sequence('expenses', 'id'), (SELECT MAX(id) FROM expenses));
SELECT setval(pg_get_serial_sequence('transactions', 'id'), (SELECT MAX(id) FROM transactions));
SELECT setval(pg_get_serial_sequence('leadership', 'id'), (SELECT MAX(id) FROM leadership));

COMMIT;
