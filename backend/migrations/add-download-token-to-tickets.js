const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tickets', 'download_token', {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true
    });

    await queryInterface.addColumn('tickets', 'download_token_expires_at', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('tickets', 'download_token_used', {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    });

    // Add index for download token
    await queryInterface.addIndex('tickets', ['download_token'], {
      unique: true,
      name: 'tickets_download_token_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('tickets', 'tickets_download_token_unique');
    await queryInterface.removeColumn('tickets', 'download_token_used');
    await queryInterface.removeColumn('tickets', 'download_token_expires_at');
    await queryInterface.removeColumn('tickets', 'download_token');
  }
};
