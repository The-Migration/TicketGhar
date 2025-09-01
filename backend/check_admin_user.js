require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'ticket_ghar_dev',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function checkAdminUser() {
  try {
    console.log('🔍 Checking admin user information...');
    console.log('=====================================\n');

    // First, check the table schema
    const columns = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position",
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    console.log('📋 Users table columns:');
    console.log('=======================');
    columns.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    console.log('');
    
    // Check for admin@ticketghar.com specifically
    const adminUser = await sequelize.query(
      'SELECT * FROM users WHERE email = ?',
      {
        replacements: ['admin@ticketghar.com'],
        type: Sequelize.QueryTypes.SELECT
      }
    );
    
    if (adminUser.length > 0) {
      const user = adminUser[0];
      console.log('👤 Admin User (admin@ticketghar.com):');
      console.log('====================================');
      console.log('ID:', user.id);
      console.log('Email:', user.email);
      console.log('First Name:', user.first_name || user.firstName);
      console.log('Last Name:', user.last_name || user.lastName);
      console.log('Role:', user.role);
      console.log('Password Hash:', user.password_hash || user.passwordHash || 'Not found');
      console.log('Created:', user.created_at || user.createdAt);
      console.log('Updated:', user.updated_at || user.updatedAt);
      
      if (user.password_hash || user.passwordHash) {
        console.log('\n⚠️  Security Note:');
        console.log('   The password is hashed using bcrypt for security.');
        console.log('   You cannot retrieve the original password from the hash.');
        console.log('   If you need to access the admin account, you should:');
        console.log('   1. Use the password reset functionality');
        console.log('   2. Or create a new admin user');
        console.log('   3. Or update the password hash directly in the database');
      }
    } else {
      console.log('❌ Admin user (admin@ticketghar.com) not found');
    }
    
    // Check for any admin users
    const allAdmins = await sequelize.query(
      'SELECT * FROM users WHERE role = ? OR email LIKE ?',
      {
        replacements: ['admin', '%admin%'],
        type: Sequelize.QueryTypes.SELECT
      }
    );
    
    if (allAdmins.length > 0) {
      console.log('\n👥 All admin users found:');
      console.log('=========================');
      allAdmins.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   Name: ${user.first_name || user.firstName} ${user.last_name || user.lastName}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   ID: ${user.id}`);
        console.log('   ---');
      });
    }
    
    // Check total user count
    const userCount = await sequelize.query(
      'SELECT COUNT(*) as count FROM users',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    console.log(`\n📊 Total users in database: ${userCount[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkAdminUser();
