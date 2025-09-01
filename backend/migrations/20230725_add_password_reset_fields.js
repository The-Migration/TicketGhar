module.exports = {
    up: async (queryInterface, Sequelize) => {
      await queryInterface.sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);`);
      await queryInterface.sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP WITH TIME ZONE;`);
    },
    down: async (queryInterface, Sequelize) => {
      await queryInterface.removeColumn('users', 'reset_password_token');
      await queryInterface.removeColumn('users', 'reset_password_expires');
    }
  };