const { Sequelize } = require('sequelize');
const config = require('./src/config/database');

async function runMigration() {
  const sequelize = new Sequelize(config);
  
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // First, update any existing waiting_room statuses to 'waiting'
    await sequelize.query(`
      UPDATE queues 
      SET status = 'waiting' 
      WHERE status = 'waiting_room'
    `);
    console.log('Updated waiting_room statuses to waiting');
    
    // Remove the waiting_room_entered_at column if it exists
    await sequelize.query(`
      ALTER TABLE queues DROP COLUMN IF EXISTS waiting_room_entered_at;
    `);
    console.log('Removed waiting_room_entered_at column');
    
    // Clean up any existing new enum from previous attempts
    await sequelize.query(`
      DROP TYPE IF EXISTS "enum_queues_status_new";
    `);
    console.log('Cleaned up any existing new enum');
    
    // For older PostgreSQL versions, we need to recreate the enum without the waiting_room value
    // First, create a new enum without waiting_room
    await sequelize.query(`
      CREATE TYPE "enum_queues_status_new" AS ENUM (
        'waiting', 'active', 'purchasing', 'completed', 'expired', 'left', 'cancelled'
      );
    `);
    console.log('Created new enum without waiting_room');
    
    // Drop the default constraint first
    await sequelize.query(`
      ALTER TABLE queues ALTER COLUMN status DROP DEFAULT;
    `);
    console.log('Dropped default constraint');
    
    // Update the column to use the new enum
    await sequelize.query(`
      ALTER TABLE queues 
      ALTER COLUMN status TYPE "enum_queues_status_new" 
      USING status::text::"enum_queues_status_new";
    `);
    console.log('Updated column to use new enum');
    
    // Add the default constraint back
    await sequelize.query(`
      ALTER TABLE queues ALTER COLUMN status SET DEFAULT 'waiting';
    `);
    console.log('Added default constraint back');
    
    // Drop the old enum
    await sequelize.query(`
      DROP TYPE "enum_queues_status";
    `);
    console.log('Dropped old enum');
    
    // Rename the new enum to the original name
    await sequelize.query(`
      ALTER TYPE "enum_queues_status_new" RENAME TO "enum_queues_status";
    `);
    console.log('Renamed new enum to original name');
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sequelize.close();
  }
}

runMigration();
