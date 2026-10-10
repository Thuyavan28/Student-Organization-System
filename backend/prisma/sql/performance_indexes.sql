-- Run this once in the Neon SQL Editor after the schema is applied.
-- Trigram indexes are SQL-only (pg_trgm is an extension); they are noted in schema.prisma with a comment.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_bookings_event_status ON bookings(event_id, status);
CREATE INDEX IF NOT EXISTS idx_txn_type_occurred ON transactions(type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_txn_category_occurred ON transactions(category, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_status_expires ON members(membership_status, expires_at);
CREATE INDEX IF NOT EXISTS idx_tasks_fund_status ON tasks(fundraiser_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_status_created ON expenses(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON users USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON users USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_members_student_trgm ON members USING gin (student_id gin_trgm_ops);

ANALYZE;
