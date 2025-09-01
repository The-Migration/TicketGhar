const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/models/index');

/**
 * Migration runner for comprehensive schema upgrade
 */
class MigrationRunner {
  constructor() {
    this.migrationPath = path.join(__dirname, '001_comprehensive_schema.sql');
  }

  async runMigration() {
    try {
      console.log('🔄 Starting comprehensive schema migration...');
      
      // Read migration SQL file
      const migrationSQL = fs.readFileSync(this.migrationPath, 'utf8');
      
      // Execute migration within a transaction
      await sequelize.transaction(async (t) => {
        // Split SQL into individual statements
        const statements = migrationSQL
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📝 Executing ${statements.length} migration statements...`);
        
        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i];
          if (statement.length > 0) {
            try {
              await sequelize.query(statement, { transaction: t });
              console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
            } catch (error) {
              // Log error but continue if it's a non-critical error (like column already exists)
              if (error.message.includes('already exists') || 
                  error.message.includes('does not exist') ||
                  error.message.includes('duplicate')) {
                console.log(`⚠️  Statement ${i + 1}/${statements.length} skipped (already exists)`);
                continue;
              }
              throw error;
            }
          }
        }
      });
      
      console.log('✅ Schema migration completed successfully!');
      
      // Now run data migration
      await this.runDataMigration();
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async runDataMigration() {
    try {
      console.log('🔄 Starting data migration...');
      
      // Migrate existing events to create default ticket types
      await this.migrateEventsToTicketTypes();
      
      // Convert existing queue records to queue_entries
      await this.migrateQueueToQueueEntries();
      
      // Note: Orders migration would happen here if there were any orders
      
      console.log('✅ Data migration completed successfully!');
      
    } catch (error) {
      console.error('❌ Data migration failed:', error);
      throw error;
    }
  }

  async migrateEventsToTicketTypes() {
    console.log('🔄 Migrating events to ticket types...');
    
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
  }

  async migrateQueueToQueueEntries() {
    console.log('🔄 Migrating queue to queue_entries...');
    
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
  }

  async rollback() {
    console.log('🔄 Rolling back migration...');
    
    try {
      await sequelize.transaction(async (t) => {
        // Drop new tables in reverse order
        await sequelize.query('DROP TABLE IF EXISTS tickets CASCADE', { transaction: t });
        await sequelize.query('DROP TABLE IF EXISTS order_items CASCADE', { transaction: t });
        await sequelize.query('DROP TABLE IF EXISTS purchase_sessions CASCADE', { transaction: t });
        await sequelize.query('DROP TABLE IF EXISTS queue_entries CASCADE', { transaction: t });
        await sequelize.query('DROP TABLE IF EXISTS ticket_types CASCADE', { transaction: t });
        
        // Restore events table columns
        await sequelize.query('ALTER TABLE events RENAME COLUMN title TO name', { transaction: t });
        await sequelize.query('ALTER TABLE events RENAME COLUMN start_date TO startTime', { transaction: t });
        await sequelize.query('ALTER TABLE events RENAME COLUMN end_date TO endTime', { transaction: t });
        
        // Remove added columns
        await sequelize.query('ALTER TABLE events DROP COLUMN IF EXISTS organizer_id', { transaction: t });
        await sequelize.query('ALTER TABLE events DROP COLUMN IF EXISTS timezone', { transaction: t });
        await sequelize.query('ALTER TABLE events DROP COLUMN IF EXISTS cover_image_url', { transaction: t });
        
        // Restore users table
        await sequelize.query('ALTER TABLE users DROP COLUMN IF EXISTS status', { transaction: t });
        await sequelize.query('ALTER TABLE users DROP COLUMN IF EXISTS last_login', { transaction: t });
        await sequelize.query('ALTER TABLE users DROP COLUMN IF EXISTS timezone', { transaction: t });
        
        // Restore orders table
        await sequelize.query('ALTER TABLE orders DROP COLUMN IF EXISTS purchase_session_id', { transaction: t });
        await sequelize.query('ALTER TABLE orders DROP COLUMN IF EXISTS commission_amount', { transaction: t });
        await sequelize.query('ALTER TABLE orders DROP COLUMN IF EXISTS payment_processor', { transaction: t });
        
        console.log('✅ Migration rolled back successfully');
      });
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
}

module.exports = MigrationRunner;

// If run directly
if (require.main === module) {
  const runner = new MigrationRunner();
  
  const command = process.argv[2];
  
  if (command === 'rollback') {
    runner.rollback().catch(console.error);
  } else {
    runner.runMigration().catch(console.error);
  }
} 