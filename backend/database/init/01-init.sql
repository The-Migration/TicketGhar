-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS ticket_ghar_dev;

-- Use the database
\c ticket_ghar_dev;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (comprehensive schema)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'organizer')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login TIMESTAMP,
    otp_code VARCHAR(10),
    otp_expires_at TIMESTAMP,
    is_email_verified BOOLEAN DEFAULT FALSE,
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create events table (comprehensive schema)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    venue VARCHAR(255),
    address TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    ticket_sale_start_time TIMESTAMP,
    ticket_sale_end_time TIMESTAMP,
    total_tickets INTEGER NOT NULL,
    available_tickets INTEGER NOT NULL,
    ticket_price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    timezone VARCHAR(50) DEFAULT 'UTC',
    max_tickets_per_user INTEGER DEFAULT 10,
    concurrent_users INTEGER DEFAULT 100,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'sold_out')),
    image_url VARCHAR(500),
    category VARCHAR(100),
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_by_id UUID REFERENCES users(id),
    refund_deadline TIMESTAMP,
    refund_policy TEXT,
    refund_terms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ticket_types table
CREATE TABLE IF NOT EXISTS ticket_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    available INTEGER NOT NULL,
    max_per_user INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create queue_entries table (comprehensive schema)
CREATE TABLE IF NOT EXISTS queue_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'processing', 'completed', 'abandoned', 'expired')),
    entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_started_at TIMESTAMP,
    completed_at TIMESTAMP,
    estimated_wait_seconds INTEGER,
    is_priority BOOLEAN DEFAULT FALSE,
    source VARCHAR(20) DEFAULT 'standard' CHECK (source IN ('standard', 'emergency')),
    client_info JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_fingerprint VARCHAR(64),
    referrer VARCHAR(500),
    waiting_room_entered_at TIMESTAMP,
    queue_joined_at TIMESTAMP,
    processing_expires_at TIMESTAMP,
    admin_notes TEXT,
    admin_user_id UUID REFERENCES users(id),
    notifications_sent INTEGER DEFAULT 0,
    last_notification_at TIMESTAMP,
    total_wait_time INTEGER DEFAULT 0,
    processing_time INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create purchase_sessions table (comprehensive schema)
CREATE TABLE IF NOT EXISTS purchase_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_entry_id UUID REFERENCES queue_entries(id),
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'expired', 'cancelled')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    slot_type VARCHAR(20) DEFAULT 'standard' CHECK (slot_type IN ('standard', 'emergency', 'vip', 'admin')),
    -- Purchase details
    event_id UUID REFERENCES events(id),
    selected_tickets JSONB DEFAULT '[]',
    total_amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    -- Payment tracking
    payment_intent_id VARCHAR(255),
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
    -- Customer information
    customer_info JSONB,
    billing_address JSONB,
    -- Session tracking
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_fingerprint VARCHAR(64),
    -- Activity tracking
    last_activity TIMESTAMP,
    step_progress INTEGER DEFAULT 1 CHECK (step_progress >= 1 AND step_progress <= 5),
    step_data JSONB DEFAULT '{}',
    -- Warnings and notifications
    warnings JSON DEFAULT '[]',
    notifications JSON DEFAULT '[]',
    -- Extension tracking
    extension_count INTEGER DEFAULT 0,
    max_extensions INTEGER DEFAULT 2,
    -- Admin tracking
    admin_notes TEXT,
    created_by_admin UUID REFERENCES users(id),
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create purchase_session_items table
CREATE TABLE IF NOT EXISTS purchase_session_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES purchase_sessions(id) ON DELETE CASCADE,
    ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_event_id ON orders(event_id);
CREATE INDEX IF NOT EXISTS idx_queue_entries_event_id ON queue_entries(event_id);
CREATE INDEX IF NOT EXISTS idx_queue_entries_user_id ON queue_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_sessions_user_id ON purchase_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_sessions_event_id ON purchase_sessions(event_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ticket_types_updated_at BEFORE UPDATE ON ticket_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_queue_entries_updated_at BEFORE UPDATE ON queue_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_sessions_updated_at BEFORE UPDATE ON purchase_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_session_items_updated_at BEFORE UPDATE ON purchase_session_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
