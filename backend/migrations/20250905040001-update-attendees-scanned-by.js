'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop the foreign key constraint first
    await queryInterface.removeConstraint('attendees', 'attendees_scanned_by_fkey');
    
    // Change scanned_by column from UUID to STRING
    await queryInterface.changeColumn('attendees', 'scanned_by', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to UUID (this might fail if there are non-UUID values)
    await queryInterface.changeColumn('attendees', 'scanned_by', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    });
  }
};
