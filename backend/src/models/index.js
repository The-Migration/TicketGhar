const { Sequelize } = require('sequelize');
const config = require('../config/database');

// Initialize Sequelize
const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: config.logging,
  pool: config.pool,
  define: {
    underscored: true,
    freezeTableName: true,
    timestamps: true
  }
});

// Import all models
const User = require('./User')(sequelize);
const Event = require('./Event')(sequelize);
const Queue = require('./Queue')(sequelize);
const Order = require('./Order')(sequelize);
const TicketType = require('./TicketType')(sequelize);
const QueueEntry = require('./QueueEntry')(sequelize);
const PurchaseSession = require('./PurchaseSession')(sequelize);
const OrderItem = require('./OrderItem')(sequelize);
const Ticket = require('./Ticket')(sequelize);
const Attendee = require('./Attendee')(sequelize);

// ============================================
// DEFINE COMPREHENSIVE ASSOCIATIONS
// ============================================

// User associations
User.hasMany(Event, { foreignKey: 'createdById', as: 'createdEvents' });
User.hasMany(QueueEntry, { foreignKey: 'userId', as: 'queueEntries' });
User.hasMany(PurchaseSession, { foreignKey: 'userId', as: 'purchaseSessions' });
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
User.hasMany(Ticket, { foreignKey: 'userId', as: 'tickets' });
User.hasMany(Ticket, { foreignKey: 'transferredTo', as: 'transferredTickets' });

// Event associations
Event.belongsTo(User, { foreignKey: 'createdById', as: 'creator' });
Event.hasMany(TicketType, { foreignKey: 'eventId', as: 'ticketTypes' });
Event.hasMany(QueueEntry, { foreignKey: 'eventId', as: 'queueEntries' });
Event.hasMany(Order, { foreignKey: 'eventId', as: 'orders' });
Event.hasMany(Ticket, { foreignKey: 'eventId', as: 'tickets' });
Event.hasMany(Attendee, { foreignKey: 'eventId', as: 'attendees' });

// TicketType associations
TicketType.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
TicketType.hasMany(OrderItem, { foreignKey: 'ticketTypeId', as: 'orderItems' });
TicketType.hasMany(Ticket, { foreignKey: 'ticketTypeId', as: 'tickets' });

// QueueEntry associations
QueueEntry.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
QueueEntry.belongsTo(User, { foreignKey: 'userId', as: 'user' });
QueueEntry.hasOne(PurchaseSession, { foreignKey: 'queueEntryId', as: 'purchaseSession' });

// PurchaseSession associations
PurchaseSession.belongsTo(QueueEntry, { foreignKey: 'queueEntryId', as: 'queueEntry' });
PurchaseSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });
PurchaseSession.hasMany(Order, { foreignKey: 'purchaseSessionId', as: 'orders' });

// Order associations
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Order.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
Order.belongsTo(PurchaseSession, { foreignKey: 'purchaseSessionId', as: 'purchaseSession' });
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'orderItems' });

// OrderItem associations
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
OrderItem.belongsTo(TicketType, { foreignKey: 'ticketTypeId', as: 'ticketType' });
OrderItem.hasMany(Ticket, { foreignKey: 'orderItemId', as: 'tickets' });

// Ticket associations
Ticket.belongsTo(OrderItem, { foreignKey: 'orderItemId', as: 'orderItem' });
Ticket.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
Ticket.belongsTo(TicketType, { foreignKey: 'ticketTypeId', as: 'ticketType' });
Ticket.belongsTo(User, { foreignKey: 'userId', as: 'owner' });
Ticket.belongsTo(User, { foreignKey: 'transferredTo', as: 'transferee' });
Ticket.hasOne(Attendee, { foreignKey: 'ticketId', as: 'attendee' });

// Attendee associations
Attendee.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'ticket' });
Attendee.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
Attendee.belongsTo(User, { foreignKey: 'scannedBy', as: 'scanner' });

// Legacy Queue associations (for backward compatibility)
User.hasMany(Queue, { foreignKey: 'userId', as: 'queues' });
Queue.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Event.hasMany(Queue, { foreignKey: 'eventId', as: 'queues' });
Queue.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
Queue.hasMany(Order, { foreignKey: 'queueId', as: 'orders' });
Order.belongsTo(Queue, { foreignKey: 'queueId', as: 'queue' });

// ============================================
// HELPER FUNCTIONS
// ============================================

// Database connection test
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    return false;
  }
}

// Sync database
async function syncDatabase(force = false) {
  try {
    await sequelize.sync({ force, alter: !force });
    console.log(`✅ Database synchronized successfully ${force ? '(forced)' : ''}`);
    return true;
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
    return false;
  }
}

// Initialize database with sample data
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Check if we need to initialize
    const userCount = await User.count();
    if (userCount > 0) {
      console.log('✅ Database already initialized');
      return;
    }
    
    // Create sample admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@ticketghar.com',
      password: 'admin123', // This should be hashed
      role: 'admin'
    });
    
    console.log('✅ Database initialized with admin user');
    return adminUser;
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

// Get database statistics
async function getDatabaseStats() {
  try {
    const stats = {
      users: await User.count(),
      events: await Event.count(),
      ticketTypes: await TicketType.count(),
      queueEntries: await QueueEntry.count(),
      purchaseSessions: await PurchaseSession.count(),
      orders: await Order.count(),
      orderItems: await OrderItem.count(),
      tickets: await Ticket.count()
    };
    
    return stats;
  } catch (error) {
    console.error('❌ Error getting database stats:', error);
    return null;
  }
}

// Clean up expired sessions and queue entries
async function cleanupExpiredData() {
  try {
    console.log('🔄 Cleaning up expired data...');
    
    // Cleanup expired purchase sessions
    const expiredSessions = await PurchaseSession.cleanupExpiredSessions();
    console.log(`✅ Cleaned up ${expiredSessions} expired purchase sessions`);
    
    // Cleanup expired orders
    const expiredOrders = await Order.cleanupExpiredOrders();
    console.log(`✅ Cleaned up ${expiredOrders} expired orders`);
    
    // Find and expire old queue entries that are stuck
    const stuckEntries = await QueueEntry.findAll({
      where: {
        status: 'processing',
        processingStartedAt: {
          [sequelize.Sequelize.Op.lt]: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
        }
      }
    });
    
    for (const entry of stuckEntries) {
      await entry.expire();
    }
    
    console.log(`✅ Cleaned up ${stuckEntries.length} stuck queue entries`);
    
    // Find queue entries with expired purchase sessions and clean them up
    const expiredPurchaseSessions = await PurchaseSession.findAll({
      where: {
        status: 'expired'
      },
      include: [{
        model: QueueEntry,
        as: 'queueEntry',
        where: {
          status: 'processing'
        }
      }]
    });
    
    let cleanedQueueEntries = 0;
    for (const session of expiredPurchaseSessions) {
      if (session.queueEntry) {
        await session.queueEntry.expire();
        cleanedQueueEntries++;
      }
    }
    
    console.log(`✅ Cleaned up ${cleanedQueueEntries} queue entries with expired sessions`);
    
    return {
      expiredSessions,
      expiredOrders,
      stuckEntries: stuckEntries.length,
      cleanedQueueEntries
    };
  } catch (error) {
    console.error('❌ Error cleaning up expired data:', error);
    return null;
  }
}

// Health check for database
async function healthCheck() {
  try {
    const isConnected = await testConnection();
    const stats = await getDatabaseStats();
    
    return {
      connected: isConnected,
      stats,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

module.exports = {
  sequelize,
  // Core models
  User,
  Event,
  TicketType,
  QueueEntry,
  PurchaseSession,
  Order,
  OrderItem,
  Ticket,
  Attendee,
  // Legacy models (for backward compatibility)
  Queue,
  // Helper functions
  testConnection,
  syncDatabase,
  initializeDatabase,
  getDatabaseStats,
  cleanupExpiredData,
  healthCheck
}; 