'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove waiting_room from enum
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_queues_status" DROP VALUE 'waiting_room';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Remove waiting_room_entered_at column
    await queryInterface.removeColumn('queues', 'waiting_room_entered_at');

    // Update default status from 'waiting_room' to 'waiting'
    await queryInterface.changeColumn('queues', 'status', {
      type: Sequelize.ENUM('waiting', 'active', 'purchasing', 'completed', 'expired', 'left', 'cancelled'),
      defaultValue: 'waiting'
    });

    // Update all existing 'waiting_room' statuses to 'waiting'
    await queryInterface.sequelize.query(`
      UPDATE queues 
      SET status = 'waiting' 
      WHERE status = 'waiting_room'
    `);
  },

  async down(queryInterface, Sequelize) {
    // Add waiting_room back to enum
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_queues_status" ADD VALUE 'waiting_room';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add waiting_room_entered_at column back
    await queryInterface.addColumn('queues', 'waiting_room_entered_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Change default status back to 'waiting_room'
    await queryInterface.changeColumn('queues', 'status', {
      type: Sequelize.ENUM('waiting_room', 'waiting', 'active', 'purchasing', 'completed', 'expired', 'left', 'cancelled'),
      defaultValue: 'waiting_room'
    });
  }
};
