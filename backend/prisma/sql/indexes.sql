-- ClubFlow database indexes. Idempotent: safe to run any number of times.
--   Apply:  node scripts/apply-indexes.mjs      (or paste into the Neon SQL editor)
--   Check:  node scripts/index-report.mjs
-- This supersedes performance_indexes.sql, which was never applied to the live database.
--
-- Why these indexes: every list screen sorts and filters. Without a matching index PostgreSQL has to read every row and
-- sort them (cost grows with the table); with one it jumps straight to the newest 10. Measured on 300,000 rows:
-- 80x to 1,700x faster (see scripts/index-scale-proof.mjs). Each index is named after the screen/query it serves.
-- Trigram (GIN) indexes serve the "contains" searches (ILIKE '%text%'), which a normal index cannot do.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---- ledger (Finance page, exports, reports) ----
-- newest first, the default ledger order
CREATE INDEX IF NOT EXISTS idx_txn_occurred_id        ON transactions (occurred_at DESC, id DESC);
-- filtered by type or category, still newest first
CREATE INDEX IF NOT EXISTS idx_txn_type_occurred      ON transactions (type, occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_txn_category_occurred  ON transactions (category, occurred_at DESC, id DESC);
-- income / expense totals read only this small index
CREATE INDEX IF NOT EXISTS idx_txn_type_amount        ON transactions (type) INCLUDE (amount);
-- per-event income and expense
CREATE INDEX IF NOT EXISTS idx_txn_event_type         ON transactions (event_id, type) WHERE event_id IS NOT NULL;
-- ledger search box
CREATE INDEX IF NOT EXISTS idx_txn_description_trgm   ON transactions USING gin (description gin_trgm_ops);

-- ---- orders ----
CREATE INDEX IF NOT EXISTS idx_orders_created_id      ON orders (created_at DESC, id DESC);           -- admin order list
CREATE INDEX IF NOT EXISTS idx_orders_user_created    ON orders (user_id, created_at DESC);           -- "my orders"
CREATE INDEX IF NOT EXISTS idx_orders_status_created  ON orders (status, created_at DESC, id DESC);   -- list filtered by status

-- ---- bookings, tickets, check-in ----
CREATE INDEX IF NOT EXISTS idx_bookings_user_created  ON bookings (user_id, created_at DESC);         -- "my bookings"
CREATE INDEX IF NOT EXISTS idx_bookings_event_created ON bookings (event_id, created_at DESC);        -- an event's attendee list
CREATE INDEX IF NOT EXISTS idx_bookings_event_status  ON bookings (event_id, status);                 -- seats taken per event
CREATE INDEX IF NOT EXISTS idx_bookings_confirmed_created ON bookings (created_at DESC) WHERE status = 'CONFIRMED';  -- dashboard "recent registrations"
CREATE INDEX IF NOT EXISTS idx_checkins_at            ON check_ins (checked_in_at DESC);

-- ---- events ----
CREATE INDEX IF NOT EXISTS idx_events_status_start    ON events (status, start_at);                   -- upcoming / published lists
CREATE INDEX IF NOT EXISTS idx_events_title_trgm      ON events USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_events_venue_trgm      ON events USING gin (venue gin_trgm_ops);

-- ---- members and users ----
CREATE INDEX IF NOT EXISTS idx_members_status_expires ON members (membership_status, expires_at);     -- filters, expiry job, reminders
CREATE INDEX IF NOT EXISTS idx_members_joined         ON members (joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_student_trgm   ON members USING gin (student_id gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_name_trgm        ON users USING gin (name gin_trgm_ops);         -- member / staff search
CREATE INDEX IF NOT EXISTS idx_users_email_trgm       ON users USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_role_active      ON users (role, is_active);                     -- staff lists, pickers
CREATE INDEX IF NOT EXISTS idx_mpay_member_created    ON membership_payments (member_id, created_at DESC);

-- ---- expenses ----
CREATE INDEX IF NOT EXISTS idx_expenses_created_id    ON expenses (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_status_created ON expenses (status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_submitter_created ON expenses (submitted_by_id, created_at DESC);  -- "my claims"
CREATE INDEX IF NOT EXISTS idx_expenses_description_trgm ON expenses USING gin (description gin_trgm_ops);

-- ---- tasks ----
CREATE INDEX IF NOT EXISTS idx_tasks_event_status     ON tasks (event_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status  ON tasks (assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_open         ON tasks (due_date) WHERE status <> 'COMPLETED';  -- overdue tasks

-- ---- announcements, products ----
CREATE INDEX IF NOT EXISTS idx_announcements_feed     ON announcements (is_pinned DESC, published_at DESC, id DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_variants_stock         ON product_variants (stock);                    -- low-stock alerts

-- Refresh the planner's statistics so it starts using the new indexes straight away.
ANALYZE;
