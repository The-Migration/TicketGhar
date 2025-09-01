'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Tickets', 'downloadToken', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Tickets', 'downloadTokenUsed', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Tickets', 'downloadToken');
    await queryInterface.removeColumn('Tickets', 'downloadTokenUsed');
  }
}; 