module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new enum values to status field only if they do not already exist
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'waiting_room' AND enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'enum_queues_status')) THEN
          ALTER TYPE "enum_queues_status" ADD VALUE 'waiting_room';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled' AND enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'enum_queues_status')) THEN
          ALTER TYPE "enum_queues_status" ADD VALUE 'cancelled';
        END IF;
      END$$;
    `);

    // Helper to add column only if it does not exist
    async function addColumnIfNotExists(queryInterface, table, column, options) {
      const tableDesc = await queryInterface.describeTable(table);
      if (!tableDesc[column]) {
        await queryInterface.addColumn(table, column, options);
      }
    }

    // Add new columns
    await addColumnIfNotExists(queryInterface, 'queues', 'waiting_room_entered_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await addColumnIfNotExists(queryInterface, 'queues', 'queue_assigned_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await addColumnIfNotExists(queryInterface, 'queues', 'randomization_score', {
      type: Sequelize.FLOAT,
      allowNull: true
    });

    // Create slot_type enum and add column
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_queues_slot_type') THEN
          CREATE TYPE "enum_queues_slot_type" AS ENUM('standard', 'emergency');
        END IF;
      END$$;
    `);

    await addColumnIfNotExists(queryInterface, 'queues', 'slot_type', {
      type: Sequelize.ENUM('standard', 'emergency'),
      allowNull: false,
      defaultValue: 'standard'
    });

    // Change default status to waiting_room
    await queryInterface.changeColumn('queues', 'status', {
      type: Sequelize.ENUM('waiting_room', 'waiting', 'active', 'purchasing', 'completed', 'expired', 'left', 'cancelled'),
      allowNull: false,
      defaultValue: 'waiting_room'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns
    await queryInterface.removeColumn('queues', 'waiting_room_entered_at');
    await queryInterface.removeColumn('queues', 'queue_assigned_at');
    await queryInterface.removeColumn('queues', 'randomization_score');
    await queryInterface.removeColumn('queues', 'slot_type');

    // Drop the slot_type enum
    await queryInterface.sequelize.query(`
      DROP TYPE "enum_queues_slot_type";
    `);

    // Revert status enum (remove new values)
    await queryInterface.changeColumn('queues', 'status', {
      type: Sequelize.ENUM('waiting', 'active', 'purchasing', 'completed', 'expired', 'left'),
      allowNull: false,
      defaultValue: 'waiting'
    });
  }
}; 