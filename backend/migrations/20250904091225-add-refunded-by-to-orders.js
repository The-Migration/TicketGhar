'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'refunded_by', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'refunded_by'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('orders', 'refunded_by');
  }
};
