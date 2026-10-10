-- ClubFlow seed verification. Run after clubflow_schema_and_seed.sql.
-- Query 1 lists row counts. Every query after it must return zero rows.

SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'membership_tiers', COUNT(*) FROM membership_tiers
UNION ALL SELECT 'members', COUNT(*) FROM members
UNION ALL SELECT 'membership_payments', COUNT(*) FROM membership_payments
UNION ALL SELECT 'events', COUNT(*) FROM events
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL SELECT 'tickets', COUNT(*) FROM tickets
UNION ALL SELECT 'check_ins', COUNT(*) FROM check_ins
UNION ALL SELECT 'announcements', COUNT(*) FROM announcements
UNION ALL SELECT 'email_logs', COUNT(*) FROM email_logs
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'product_variants', COUNT(*) FROM product_variants
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'fundraisers', COUNT(*) FROM fundraisers
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL SELECT 'leadership', COUNT(*) FROM leadership;

-- Ticket income in the ledger equals the price of every paid or refunded booking
SELECT 'tickets mismatch' AS problem
WHERE (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE source_type = 'BOOKING' AND type = 'INCOME')
   <> (SELECT COALESCE(SUM(price_at_booking), 0) FROM bookings WHERE payment_status IN ('PAID', 'REFUNDED'));

-- Dues income equals paid membership payments
SELECT 'dues mismatch' AS problem
WHERE (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE category = 'DUES')
   <> (SELECT COALESCE(SUM(amount), 0) FROM membership_payments WHERE status = 'PAID');

-- Merchandise income equals order totals
SELECT 'merchandise mismatch' AS problem
WHERE (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE source_type = 'ORDER' AND type = 'INCOME')
   <> (SELECT COALESCE(SUM(total), 0) FROM orders);

-- Reimbursement expenses equal reimbursed claims
SELECT 'reimbursement mismatch' AS problem
WHERE (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE category = 'REIMBURSEMENT')
   <> (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE status = 'REIMBURSED');

-- No event is oversold
SELECT 'oversold' AS problem, e.id FROM events e
WHERE (SELECT COUNT(*) FROM bookings b WHERE b.event_id = e.id AND b.status = 'CONFIRMED') > e.capacity;

-- Every check-in points at a USED ticket
SELECT 'check-in on non-used ticket' AS problem, c.id FROM check_ins c JOIN tickets t ON t.id = c.ticket_id
WHERE t.status <> 'USED';

-- The demo needs an upcoming gala and members expiring soon
SELECT 'gala not upcoming' AS problem
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'Spring Gala' AND start_at > now() AND status = 'PUBLISHED');

SELECT 'no expiring members' AS problem
WHERE NOT EXISTS (SELECT 1 FROM members WHERE membership_status = 'ACTIVE' AND expires_at BETWEEN now() AND now() + interval '30 days');

-- Order totals match their lines
SELECT 'order total mismatch' AS problem, o.id FROM orders o
WHERE o.subtotal <> (SELECT SUM(unit_price * quantity) FROM order_items i WHERE i.order_id = o.id)
   OR o.total <> o.subtotal - o.discount_total;
