'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop the foreign key constraint first if it exists
    try {
      await queryInterface.removeConstraint('tickets', 'tickets_used_by_fkey');
    } catch (error) {
      // Constraint might not exist, ignore error
      console.log('Foreign key constraint not found, continuing...');
    }
    
    // Change used_by column from UUID to STRING
    await queryInterface.changeColumn('tickets', 'used_by', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to UUID (this might fail if there are non-UUID values)
    await queryInterface.changeColumn('tickets', 'used_by', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    });
  }
};
