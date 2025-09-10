require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
const { testConnection, syncDatabase, cleanupExpiredData } = require('./models');
const eventStatusUpdater = require('./services/eventStatusUpdater');
const purchaseSessionReminderService = require('./services/purchaseSessionReminderService');
const purchaseSessionExpiryService = require('./services/purchaseSessionExpiryService');
const automaticQueueProcessor = require('./services/automaticQueueProcessor');
const queueLimitChecker = require('./services/queueLimitChecker');

const app = express();
const PORT = process.env.PORT || 3001;

// -----------------------------
// 🗄️ Database initialization
// -----------------------------
async function initializeDatabase() {
  try {
    await testConnection();
    await syncDatabase(false); // Set to true to force recreate tables
    console.log('🗄️  Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}
initializeDatabase();

// -----------------------------
// 🧹 Scheduled Cleanup
// -----------------------------
function startScheduledCleanup() {
  console.log('🧹 Starting scheduled cleanup job (runs every 5 minutes)');

  setInterval(async () => {
    try {
      console.log('🔄 Running scheduled cleanup...');
      const result = await cleanupExpiredData();
      if (result) {
        console.log(`✅ Cleanup completed: ${result.expiredSessions} sessions, ${result.expiredOrders} orders, ${result.stuckEntries} stuck entries`);
      }
    } catch (error) {
      console.error('❌ Error during scheduled cleanup:', error);
    }
  }, 5 * 60 * 1000);

  setTimeout(async () => {
    try {
      console.log('🔄 Running initial cleanup on startup...');
      const result = await cleanupExpiredData();
      if (result) {
        console.log(`✅ Initial cleanup completed: ${result.expiredSessions} sessions, ${result.expiredOrders} orders, ${result.stuckEntries} stuck entries`);
      }
    } catch (error) {
      console.error('❌ Error during initial cleanup:', error);
    }
  }, 10000);
}
startScheduledCleanup();

// -----------------------------
// 🔄 Automatic Queue Processing
// -----------------------------
async function startAutomaticQueueProcessing() {
  try {
    const { Event } = require('./models');
    const saleStartedEvents = await Event.findAll({ where: { status: 'sale_started' } });

    console.log(`🎯 Found ${saleStartedEvents.length} events with sale_started status`);
    for (const event of saleStartedEvents) {
      console.log(`🚀 Starting automatic queue processing for event: ${event.name} (${event.id})`);
      await automaticQueueProcessor.startProcessingForEvent(event.id);
    }
  } catch (error) {
    console.error('❌ Error starting automatic queue processing:', error);
  }
}

// -----------------------------
// 🧱 Middleware
// -----------------------------
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// -----------------------------
// 🚨 API Health Endpoints
// -----------------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: 'connected'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// -----------------------------
// 🧩 API Routes
// -----------------------------
app.use('/api', require('./routes'));

// -----------------------------
// ⚛️ React Static File Serving
// -----------------------------
const staticPath = path.join(__dirname, '../../frontend/build');
app.use(express.static(staticPath));

// Serve React app for any route not starting with /api
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// -----------------------------
// ❌ Error Handling
// -----------------------------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// -----------------------------
// 🛑 Graceful Shutdown
// -----------------------------
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated');
  });
});

// -----------------------------
// 🚀 Start Server
// -----------------------------
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 API available at http://localhost:${PORT}/api`);
  console.log(`❤️  Health check at http://localhost:${PORT}/health`);

  purchaseSessionReminderService.start();
  console.log('🔔 Purchase session reminder service started');

  purchaseSessionExpiryService.start();
  console.log('⏰ Purchase session expiry service started');

  startAutomaticQueueProcessing();
  console.log('🔄 Automatic queue processing service started');

  queueLimitChecker.start();
  console.log('🚫 Queue limit checker service started');
});

module.exports = app;
