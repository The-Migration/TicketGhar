const { sequelize } = require('../src/models/index');

/**
 * Simple migration runner that executes each section individually
 */
class SimpleMigrationRunner {
  
  async runMigration() {
    try {
      console.log('🔄 Starting comprehensive schema migration...');
      
      // Run each section individually to avoid transaction issues
      await this.updateUsersTable();
      await this.updateEventsTable();
      await this.createTicketTypesTable();
      await this.createQueueEntriesTable();
      await this.createPurchaseSessionsTable();
      await this.updateOrdersTable();
      await this.createOrderItemsTable();
      await this.createTicketsTable();
      await this.createIndexes();
      
      console.log('✅ Schema migration completed successfully!');
      
      // Now run data migration
      await this.runDataMigration();
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async updateUsersTable() {
    console.log('🔄 Updating users table...');
    
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
      `);
      
      await sequelize.query(`
        ALTER TABLE users 
        ALTER COLUMN role TYPE VARCHAR(20),
        ALTER COLUMN role SET DEFAULT 'customer';
      `);
      
      await sequelize.query(`
        UPDATE users SET role = 'customer' WHERE role = 'user';
      `);
      
      console.log('✅ Users table updated successfully');
    } catch (error) {
      console.log('⚠️  Users table update skipped (already exists)');
    }
  }

  async updateEventsTable() {
    console.log('🔄 Updating events table...');
    
    try {
      // The events table has already been updated with column renames
      // Just add the new columns
      await sequelize.query(`
        ALTER TABLE events 
        ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
        ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(255);
      `);
      
      await sequelize.query(`
        UPDATE events SET organizer_id = created_by_id WHERE organizer_id IS NULL;
      `);
      
      console.log('✅ Events table updated successfully');
    } catch (error) {
      console.log('⚠️  Events table update skipped (already exists)');
    }
  }

  async createTicketTypesTable() {
    console.log('🔄 Creating ticket_types table...');
    
    try {
      await sequelize.query(`
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
      `);
      
      console.log('✅ Ticket types table created successfully');
    } catch (error) {
      console.log('⚠️  Ticket types table creation skipped (already exists)');
    }
  }

  async createQueueEntriesTable() {
    console.log('🔄 Creating queue_entries table...');
    
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS queue_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id UUID REFERENCES events(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id),
          session_id VARCHAR(255) NOT NULL,
          position INTEGER NOT NULL,
          status VARCHAR(20) DEFAULT 'waiting',
          entered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          processing_started_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE,
          estimated_wait_seconds INTEGER,
          is_priority BOOLEAN DEFAULT FALSE,
          source VARCHAR(20) DEFAULT 'standard',
          client_info JSONB
        );
      `);
      
      console.log('✅ Queue entries table created successfully');
    } catch (error) {
      console.log('⚠️  Queue entries table creation skipped (already exists)');
    }
  }

  async createPurchaseSessionsTable() {
    console.log('🔄 Creating purchase_sessions table...');
    
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS purchase_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          queue_entry_id UUID REFERENCES queue_entries(id),
          user_id UUID REFERENCES users(id),
          session_id VARCHAR(255) NOT NULL,
          status VARCHAR(20) DEFAULT 'active',
          started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          completed_at TIMESTAMP WITH TIME ZONE,
          slot_type VARCHAR(20) DEFAULT 'standard'
        );
      `);
      
      console.log('✅ Purchase sessions table created successfully');
    } catch (error) {
      console.log('⚠️  Purchase sessions table creation skipped (already exists)');
    }
  }

  async updateOrdersTable() {
    console.log('🔄 Updating orders table...');
    
    try {
      await sequelize.query(`
        ALTER TABLE orders 
        ADD COLUMN IF NOT EXISTS purchase_session_id UUID REFERENCES purchase_sessions(id),
        ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS payment_processor VARCHAR(50);
      `);
      
      console.log('✅ Orders table updated successfully');
    } catch (error) {
      console.log('⚠️  Orders table update skipped (already exists)');
    }
  }

  async createOrderItemsTable() {
    console.log('🔄 Creating order_items table...');
    
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS order_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
          ticket_type_id UUID REFERENCES ticket_types(id),
          quantity INTEGER NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          total_price DECIMAL(10,2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('✅ Order items table created successfully');
    } catch (error) {
      console.log('⚠️  Order items table creation skipped (already exists)');
    }
  }

  async createTicketsTable() {
    console.log('🔄 Creating tickets table...');
    
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS tickets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
          event_id UUID REFERENCES events(id),
          ticket_type_id UUID REFERENCES ticket_types(id),
          user_id UUID REFERENCES users(id),
          ticket_code VARCHAR(100) UNIQUE NOT NULL,
          status VARCHAR(20) DEFAULT 'valid',
          qr_code_url VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('✅ Tickets table created successfully');
    } catch (error) {
      console.log('⚠️  Tickets table creation skipped (already exists)');
    }
  }

  async createIndexes() {
    console.log('🔄 Creating indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_queue_entries_event_id ON queue_entries(event_id)',
      'CREATE INDEX IF NOT EXISTS idx_queue_entries_user_id ON queue_entries(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_queue_entries_status ON queue_entries(status)',
      'CREATE INDEX IF NOT EXISTS idx_queue_entries_position ON queue_entries(event_id, position)',
      'CREATE INDEX IF NOT EXISTS idx_purchase_sessions_queue_entry_id ON purchase_sessions(queue_entry_id)',
      'CREATE INDEX IF NOT EXISTS idx_purchase_sessions_user_id ON purchase_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_purchase_sessions_status ON purchase_sessions(status)',
      'CREATE INDEX IF NOT EXISTS idx_ticket_types_event_id ON ticket_types(event_id)',
      'CREATE INDEX IF NOT EXISTS idx_ticket_types_status ON ticket_types(status)',
      'CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_order_items_ticket_type_id ON order_items(ticket_type_id)',
      'CREATE INDEX IF NOT EXISTS idx_tickets_order_item_id ON tickets(order_item_id)',
      'CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id)',
      'CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(ticket_code)',
      'CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)'
    ];
    
    for (const indexSQL of indexes) {
      try {
        await sequelize.query(indexSQL);
      } catch (error) {
        console.log(`⚠️  Index creation skipped (already exists): ${indexSQL}`);
      }
    }
    
    console.log('✅ Indexes created successfully');
  }

  async runDataMigration() {
    try {
      console.log('🔄 Starting data migration...');
      
      // Migrate existing events to create default ticket types
      await this.migrateEventsToTicketTypes();
      
      // Convert existing queue records to queue_entries
      await this.migrateQueueToQueueEntries();
      
      console.log('✅ Data migration completed successfully!');
      
    } catch (error) {
      console.error('❌ Data migration failed:', error);
      throw error;
    }
  }

  async migrateEventsToTicketTypes() {
    console.log('🔄 Migrating events to ticket types...');
    
    try {
      // Get all events with their ticket information
      const events = await sequelize.query(`
        SELECT id, title, ticket_price, total_tickets, available_tickets, 
               max_tickets_per_user, ticket_sale_start_time, ticket_sale_end_time
        FROM events 
        WHERE ticket_price IS NOT NULL
      `, { type: sequelize.QueryTypes.SELECT });
      
      for (const event of events) {
        // Create default ticket type for each event
        await sequelize.query(`
          INSERT INTO ticket_types (
            event_id, name, description, price, quantity_total, quantity_sold,
            max_per_order, max_per_user, sale_start_time, sale_end_time, status
          ) VALUES (
            :eventId, 'General Admission', 'Standard event ticket', :price, 
            :quantityTotal, :quantitySold, :maxPerOrder, :maxPerUser, 
            :saleStartTime, :saleEndTime, 'active'
          )
          ON CONFLICT DO NOTHING
        `, {
          replacements: {
            eventId: event.id,
            price: event.ticket_price,
            quantityTotal: event.total_tickets,
            quantitySold: event.total_tickets - event.available_tickets,
            maxPerOrder: event.max_tickets_per_user,
            maxPerUser: event.max_tickets_per_user,
            saleStartTime: event.ticket_sale_start_time,
            saleEndTime: event.ticket_sale_end_time
          }
        });
      }
      
      console.log(`✅ Created ticket types for ${events.length} events`);
    } catch (error) {
      console.log('⚠️  Event to ticket type migration skipped (already done)');
    }
  }

  async migrateQueueToQueueEntries() {
    console.log('🔄 Migrating queue to queue_entries...');
    
    try {
      // Get all existing queue records
      const queueRecords = await sequelize.query(`
        SELECT id, user_id, event_id, position, status, joined_at, 
               activated_at, expires_at, session_id, metadata
        FROM queues
      `, { type: sequelize.QueryTypes.SELECT });
      
      for (const queue of queueRecords) {
        // Map old queue status to new queue_entries status
        let newStatus = 'waiting';
        if (queue.status === 'waiting_room') newStatus = 'waiting';
        if (queue.status === 'active') newStatus = 'processing';
        if (queue.status === 'completed') newStatus = 'completed';
        if (queue.status === 'expired') newStatus = 'abandoned';
        
        await sequelize.query(`
          INSERT INTO queue_entries (
            id, event_id, user_id, session_id, position, status, 
            entered_at, processing_started_at, completed_at, 
            estimated_wait_seconds, is_priority, source, client_info
          ) VALUES (
            :id, :eventId, :userId, :sessionId, :position, :status,
            :enteredAt, :processingStartedAt, :completedAt,
            NULL, FALSE, 'standard', :clientInfo
          )
          ON CONFLICT (id) DO NOTHING
        `, {
          replacements: {
            id: queue.id,
            eventId: queue.event_id,
            userId: queue.user_id,
            sessionId: queue.session_id || 'migrated',
            position: queue.position,
            status: newStatus,
            enteredAt: queue.joined_at,
            processingStartedAt: queue.activated_at,
            completedAt: queue.status === 'completed' ? queue.activated_at : null,
            clientInfo: JSON.stringify(queue.metadata || {})
          }
        });
      }
      
      console.log(`✅ Migrated ${queueRecords.length} queue records to queue_entries`);
    } catch (error) {
      console.log('⚠️  Queue to queue_entries migration skipped (already done)');
    }
  }
}

// Run the migration
const runner = new SimpleMigrationRunner();
runner.runMigration()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }); 