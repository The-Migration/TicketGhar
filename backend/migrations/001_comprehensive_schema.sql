-- Migration: Transform simple schema to comprehensive schema
-- Date: 2025-01-09
-- Purpose: Upgrade from simple single-table event system to comprehensive multi-table system

-- ============================================
-- 1. UPDATE USERS TABLE
-- ============================================

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';

-- Add password reset fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP WITH TIME ZONE;

-- Update role enum to match new schema
ALTER TABLE users 
ALTER COLUMN role TYPE VARCHAR(20),
ALTER COLUMN role SET DEFAULT 'customer';

-- Update existing users to have 'customer' role instead of 'user'
UPDATE users SET role = 'customer' WHERE role = 'user';

-- ============================================
-- 2. UPDATE EVENTS TABLE
-- ============================================

-- Rename and add columns to events table
ALTER TABLE events 
RENAME COLUMN name TO title;

ALTER TABLE events 
RENAME COLUMN start_time TO start_date;

ALTER TABLE events 
RENAME COLUMN end_time TO end_date;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(255);

-- Update organizer_id to match createdById
UPDATE events SET organizer_id = created_by_id WHERE organizer_id IS NULL;

-- Remove old single-ticket columns (will be moved to ticket_types)
-- Note: We'll keep these for data migration then remove them
-- ALTER TABLE events DROP COLUMN IF EXISTS totalTickets;
-- ALTER TABLE events DROP COLUMN IF EXISTS availableTickets;
-- ALTER TABLE events DROP COLUMN IF EXISTS ticketPrice;
-- ALTER TABLE events DROP COLUMN IF EXISTS maxTicketsPerUser;

-- ============================================
-- 3. CREATE TICKET_TYPES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS ticket_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    quantity_total INTEGER NOT NULL,
    quantity_sold INTEGER DEFAULT 0,
    max_per_order INTEGER DEFAULT 10,
    max_per_user INTEGER DEFAULT 10,
    sale_start_time TIMESTAMP WITH TIME ZONE,
    sale_end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. CREATE QUEUE_ENTRIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS queue_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting', -- waiting, processing, completed, abandoned
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_wait_seconds INTEGER,
    is_priority BOOLEAN DEFAULT FALSE,
    source VARCHAR(20) DEFAULT 'standard', -- standard, emergency
    client_info JSONB -- store browser/device info
);

-- ============================================
-- 5. CREATE PURCHASE_SESSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS purchase_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_entry_id UUID REFERENCES queue_entries(id),
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, abandoned, expired
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    slot_type VARCHAR(20) DEFAULT 'standard' -- standard, emergency
);

-- ============================================
-- 6. UPDATE ORDERS TABLE
-- ============================================

-- Add new columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS purchase_session_id UUID REFERENCES purchase_sessions(id),
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS payment_processor VARCHAR(50);

-- Rename columns to match new schema
ALTER TABLE orders 
RENAME COLUMN paymentIntentId TO payment_reference;

-- Update status enum values
ALTER TABLE orders 
ALTER COLUMN status TYPE VARCHAR(20);

-- Update existing orders to have 'paid' status instead of 'completed'
UPDATE orders SET status = 'paid' WHERE status = 'completed';

-- ============================================
-- 7. CREATE ORDER_ITEMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    ticket_type_id UUID REFERENCES ticket_types(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. CREATE TICKETS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id),
    ticket_type_id UUID REFERENCES ticket_types(id),
    user_id UUID REFERENCES users(id),
    ticket_code VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'valid', -- valid, used, cancelled, refunded
    qr_code_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 9. CREATE INDEXES
-- ============================================

-- Queue entries indexes
CREATE INDEX IF NOT EXISTS idx_queue_entries_event_id ON queue_entries(event_id);
CREATE INDEX IF NOT EXISTS idx_queue_entries_user_id ON queue_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_entries_status ON queue_entries(status);
CREATE INDEX IF NOT EXISTS idx_queue_entries_position ON queue_entries(event_id, position);

-- Purchase sessions indexes
CREATE INDEX IF NOT EXISTS idx_purchase_sessions_queue_entry_id ON purchase_sessions(queue_entry_id);
CREATE INDEX IF NOT EXISTS idx_purchase_sessions_user_id ON purchase_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_sessions_status ON purchase_sessions(status);

-- Ticket types indexes
CREATE INDEX IF NOT EXISTS idx_ticket_types_event_id ON ticket_types(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_types_status ON ticket_types(status);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_ticket_type_id ON order_items(ticket_type_id);

-- Tickets indexes
CREATE INDEX IF NOT EXISTS idx_tickets_order_item_id ON tickets(order_item_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- ============================================
-- 10. DATA MIGRATION NOTES
-- ============================================

-- After running this migration, you need to:
-- 1. Migrate existing events to create default ticket types
-- 2. Convert existing queue records to queue_entries
-- 3. Migrate existing order JSON tickets to individual ticket records
-- 4. Remove old columns from events table
-- 5. Update all application code to use new schema

-- The migration script will be run by the application startup process
-- followed by data migration functions in the models. 