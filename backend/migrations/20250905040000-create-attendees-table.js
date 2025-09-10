'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('attendees', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      ticket_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tickets',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      event_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'events',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      ticket_code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      holder_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      holder_email: {
        type: Sequelize.STRING,
        allowNull: true
      },
      holder_phone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      seat_info: {
        type: Sequelize.STRING,
        allowNull: true
      },
      scanned_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      scanned_by: {
        type: Sequelize.STRING,
        allowNull: true
      },
      scan_location: {
        type: Sequelize.STRING,
        allowNull: true
      },
      scan_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_vip: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_accessible: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      special_requests: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('attendees', ['event_id']);
    await queryInterface.addIndex('attendees', ['ticket_code']);
    await queryInterface.addIndex('attendees', ['scanned_at']);
    await queryInterface.addIndex('attendees', ['scanned_by']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('attendees');
  }
};
