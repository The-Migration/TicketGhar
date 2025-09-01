require('dotenv').config();
const { Sequelize } = require('sequelize');

// Create a simple connection without loading models
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

async function removeUser() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🗑️ REMOVING USER: zainabakram243@gmail.com');
    console.log('================================================\n');

    // Find the user
    const users = await sequelize.query(
      'SELECT id, first_name, last_name, email, role, created_at FROM users WHERE email = ?',
      {
        replacements: ['zainabakram243@gmail.com'],
        type: Sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    if (users.length === 0) {
      console.log('❌ User not found: zainabakram243@gmail.com');
      await transaction.rollback();
      return;
    }

    const user = users[0];
    console.log(`👤 Found user: ${user.first_name} ${user.last_name} (${user.email})`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Created: ${user.created_at}`);

    // Check for associated data
    console.log('\n📊 Checking associated data...');

    const queueCount = await sequelize.query(
      'SELECT COUNT(*) as count FROM queue_entries WHERE user_id = ?',
      {
        replacements: [user.id],
        type: Sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    const purchaseCount = await sequelize.query(
      'SELECT COUNT(*) as count FROM purchase_sessions WHERE user_id = ?',
      {
        replacements: [user.id],
        type: Sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    const orderCount = await sequelize.query(
      'SELECT COUNT(*) as count FROM orders WHERE user_id = ?',
      {
        replacements: [user.id],
        type: Sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    const ticketCount = await sequelize.query(
      'SELECT COUNT(*) as count FROM tickets WHERE user_id = ?',
      {
        replacements: [user.id],
        type: Sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    console.log(`   Queue Entries: ${queueCount[0].count}`);
    console.log(`   Purchase Sessions: ${purchaseCount[0].count}`);
    console.log(`   Orders: ${orderCount[0].count}`);
    console.log(`   Tickets: ${ticketCount[0].count}`);

    // Show details of associated data
    if (queueCount[0].count > 0) {
      console.log('\n📋 Queue Entries:');
      const entries = await sequelize.query(
        `SELECT qe.status, qe.position, e.name as event_name 
         FROM queue_entries qe 
         LEFT JOIN events e ON qe.event_id = e.id 
         WHERE qe.user_id = ?`,
        {
          replacements: [user.id],
          type: Sequelize.QueryTypes.SELECT,
          transaction
        }
      );
      entries.forEach(entry => {
        console.log(`   - Event: ${entry.event_name || 'Unknown'}, Status: ${entry.status}, Position: ${entry.position}`);
      });
    }

    if (orderCount[0].count > 0) {
      console.log('\n🛒 Orders:');
      const orders = await sequelize.query(
        `SELECT o.status, o.total_amount, e.name as event_name 
         FROM orders o 
         LEFT JOIN events e ON o.event_id = e.id 
         WHERE o.user_id = ?`,
        {
          replacements: [user.id],
          type: Sequelize.QueryTypes.SELECT,
          transaction
        }
      );
      orders.forEach(order => {
        console.log(`   - Event: ${order.event_name || 'Unknown'}, Status: ${order.status}, Amount: $${order.total_amount}`);
      });
    }

    console.log('\n⚠️ WARNING: This will permanently delete the user and ALL associated data!');
    console.log('🔍 Proceeding with deletion...');

    // Delete in correct order to respect foreign key constraints
    console.log('\n🗑️ Deleting associated data...');

    // Delete tickets first
    if (ticketCount[0].count > 0) {
      console.log(`   Deleting ${ticketCount[0].count} tickets...`);
      await sequelize.query('DELETE FROM tickets WHERE user_id = ?', {
        replacements: [user.id],
        transaction
      });
    }

    // Delete orders (this will cascade to order items)
    if (orderCount[0].count > 0) {
      console.log(`   Deleting ${orderCount[0].count} orders...`);
      await sequelize.query('DELETE FROM orders WHERE user_id = ?', {
        replacements: [user.id],
        transaction
      });
    }

    // Delete purchase sessions
    if (purchaseCount[0].count > 0) {
      console.log(`   Deleting ${purchaseCount[0].count} purchase sessions...`);
      await sequelize.query('DELETE FROM purchase_sessions WHERE user_id = ?', {
        replacements: [user.id],
        transaction
      });
    }

    // Delete queue entries
    if (queueCount[0].count > 0) {
      console.log(`   Deleting ${queueCount[0].count} queue entries...`);
      await sequelize.query('DELETE FROM queue_entries WHERE user_id = ?', {
        replacements: [user.id],
        transaction
      });
    }

    // Finally delete the user
    console.log('   Deleting user account...');
    await sequelize.query('DELETE FROM users WHERE id = ?', {
      replacements: [user.id],
      transaction
    });

    await transaction.commit();

    console.log('\n✅ User successfully removed!');
    console.log(`   Deleted ${ticketCount[0].count} tickets`);
    console.log(`   Deleted ${orderCount[0].count} orders`);
    console.log(`   Deleted ${purchaseCount[0].count} purchase sessions`);
    console.log(`   Deleted ${queueCount[0].count} queue entries`);
    console.log(`   Deleted user account`);

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error removing user:', error);
  } finally {
    await sequelize.close();
  }
}

removeUser();
