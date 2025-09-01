'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('events', 'refund_deadline', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('events', 'refund_policy', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: 'Refunds are available until the refund deadline. After refund, original tickets become invalid and cannot be used for entry.'
    });

    await queryInterface.addColumn('events', 'refund_terms', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: {
        allowsRefunds: true,
        refundPercentage: 100,
        processingFee: 0,
        requiresReason: false,
        invalidatesTickets: true
      }
    });

    // Set default refund deadline for existing events (24 hours before start date)
    await queryInterface.sequelize.query(`
      UPDATE events 
      SET refund_deadline = start_date - INTERVAL '24 hours'
      WHERE refund_deadline IS NULL AND start_date IS NOT NULL
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('events', 'refund_deadline');
    await queryInterface.removeColumn('events', 'refund_policy');
    await queryInterface.removeColumn('events', 'refund_terms');
  }
};
