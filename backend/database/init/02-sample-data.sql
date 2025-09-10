-- Use the database
\c ticket_ghar_dev;

-- Insert sample admin user (password: admin123)
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, status, is_email_verified) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'admin@ticketghar.com', '$2b$10$rQZ8K9vX8K9vX8K9vX8K9e', 'Admin', 'User', '+1234567890', 'admin', 'active', true),
('550e8400-e29b-41d4-a716-446655440001', 'user@example.com', '$2b$10$rQZ8K9vX8K9vX8K9vX8K9e', 'John', 'Doe', '+1234567891', 'customer', 'active', true);

-- Insert sample events
INSERT INTO events (id, name, description, venue, address, start_date, end_date, ticket_sale_start_time, ticket_sale_end_time, total_tickets, available_tickets, ticket_price, currency, timezone, max_tickets_per_user, concurrent_users, status, image_url, category, tags, created_by_id, refund_deadline, refund_policy, refund_terms) VALUES
('650e8400-e29b-41d4-a716-446655440000', 'Summer Music Festival 2024', 'An amazing outdoor music festival featuring top artists from around the world. Join us for a day of great music, food, and fun!', 'Central Park', 'Central Park, New York, NY', '2024-07-15 18:00:00', '2024-07-17 23:00:00', '2024-06-01 00:00:00', '2024-07-14 23:59:59', 1000, 850, 75.00, 'USD', 'America/New_York', 4, 100, 'active', 'https://example.com/festival.jpg', 'Music', ARRAY['music', 'festival', 'summer'], '550e8400-e29b-41d4-a716-446655440000', '2024-07-10 23:59:59', 'Full refund available until 5 days before event', 'Refunds processed within 5-7 business days'),
('650e8400-e29b-41d4-a716-446655440001', 'Tech Conference 2024', 'Annual technology conference featuring keynote speakers, workshops, and networking opportunities for tech professionals.', 'Convention Center', '123 Tech Ave, San Francisco, CA', '2024-08-20 09:00:00', '2024-08-22 17:00:00', '2024-07-01 00:00:00', '2024-08-19 23:59:59', 500, 320, 150.00, 'USD', 'America/Los_Angeles', 3, 50, 'active', 'https://example.com/tech.jpg', 'Technology', ARRAY['tech', 'conference', 'innovation'], '550e8400-e29b-41d4-a716-446655440000', '2024-08-15 23:59:59', 'Full refund available until 5 days before event', 'Refunds processed within 5-7 business days'),
('650e8400-e29b-41d4-a716-446655440002', 'Art Exhibition Opening', 'Contemporary art exhibition featuring works from local and international artists. Wine and cheese reception included.', 'Modern Art Gallery', '456 Art St, Chicago, IL', '2024-06-30 19:00:00', '2024-06-30 22:00:00', '2024-05-01 00:00:00', '2024-06-29 23:59:59', 200, 45, 25.00, 'USD', 'America/Chicago', 4, 25, 'active', 'https://example.com/art.jpg', 'Art', ARRAY['art', 'exhibition', 'contemporary'], '550e8400-e29b-41d4-a716-446655440000', '2024-06-25 23:59:59', 'Full refund available until 4 days before event', 'Refunds processed within 3-5 business days'),
('650e8400-e29b-41d4-a716-446655440003', 'Comedy Night', 'Stand-up comedy show featuring popular comedians. Perfect for a fun night out with friends!', 'Comedy Club', '789 Laugh Ln, New York, NY', '2024-07-05 20:00:00', '2024-07-05 23:00:00', '2024-05-01 00:00:00', '2024-07-04 23:59:59', 150, 0, 30.00, 'USD', 'America/New_York', 4, 20, 'sold_out', 'https://example.com/comedy.jpg', 'Comedy', ARRAY['comedy', 'stand-up', 'entertainment'], '550e8400-e29b-41d4-a716-446655440000', '2024-06-30 23:59:59', 'Full refund available until 5 days before event', 'Refunds processed within 5-7 business days');

-- Insert sample ticket types
INSERT INTO ticket_types (id, event_id, name, description, price, available, max_per_user) VALUES
-- Summer Music Festival
('750e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440000', 'General Admission', 'Access to all festival areas and performances', 75.00, 500, 4),
('750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440000', 'VIP Pass', 'VIP area access, premium seating, and complimentary drinks', 150.00, 200, 2),
('750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440000', 'Backstage Pass', 'Backstage access, meet & greet with artists', 300.00, 50, 1),

-- Tech Conference
('750e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440001', 'Standard Ticket', 'Access to all sessions and networking events', 150.00, 200, 3),
('750e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440001', 'Premium Ticket', 'Premium seating, lunch included, and exclusive workshops', 250.00, 100, 2),
('750e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440001', 'Student Ticket', 'Discounted ticket for students with valid ID', 75.00, 50, 1),

-- Art Exhibition
('750e8400-e29b-41d4-a716-446655440006', '650e8400-e29b-41d4-a716-446655440002', 'General Admission', 'Access to exhibition and reception', 25.00, 150, 4),
('750e8400-e29b-41d4-a716-446655440007', '650e8400-e29b-41d4-a716-446655440002', 'VIP Experience', 'Private tour with curator and premium wine selection', 50.00, 20, 2),

-- Comedy Night (Sold Out)
('750e8400-e29b-41d4-a716-446655440008', '650e8400-e29b-41d4-a716-446655440003', 'General Admission', 'Access to comedy show', 30.00, 0, 4);

-- Insert sample orders
INSERT INTO orders (id, user_id, event_id, total_amount, status, payment_status, payment_method, payment_reference) VALUES
('850e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440000', 150.00, 'confirmed', 'paid', 'credit_card', 'txn_123456789'),
('850e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 150.00, 'confirmed', 'paid', 'credit_card', 'txn_123456790');

-- Insert sample order items
INSERT INTO order_items (id, order_id, ticket_type_id, quantity, unit_price, total_price) VALUES
('950e8400-e29b-41d4-a716-446655440000', '850e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440000', 2, 75.00, 150.00),
('950e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440003', 1, 150.00, 150.00);