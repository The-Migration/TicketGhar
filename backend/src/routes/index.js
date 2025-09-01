const express = require('express');
const authRoutes = require('./authRoutes');
const eventRoutes = require('./eventRoutes');
const queueRoutes = require('./queueRoutes');
const adminRoutes = require('./adminRoutes');


const ticketTypeRoutes = require('./ticketTypeRoutes');
const purchaseSessionRoutes = require('./purchaseSessionRoutes');
const orderRoutes = require('./orderRoutes');
const ticketRoutes = require('./ticketRoutes');
const refundRoutes = require('./refundRoutes');

const router = express.Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/queue', queueRoutes);
router.use('/admin', adminRoutes);


router.use('/ticket-types', ticketTypeRoutes);
router.use('/purchase-sessions', purchaseSessionRoutes);
router.use('/orders', orderRoutes);
router.use('/tickets', ticketRoutes);
router.use('/refunds', refundRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Ticket Ghar API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        profile: 'GET /api/auth/profile',
        updateProfile: 'PUT /api/auth/profile',
        changePassword: 'PUT /api/auth/change-password'
      },
      events: {
        getAll: 'GET /api/events',
        getById: 'GET /api/events/:id',
        create: 'POST /api/events (auth required)',
        update: 'PUT /api/events/:id (auth required)',
        delete: 'DELETE /api/events/:id (auth required)',
        publish: 'POST /api/events/:id/publish (auth required)',
        cancel: 'POST /api/events/:id/cancel (auth required)',
        getUserEvents: 'GET /api/events/user/:userId',
        getStatistics: 'GET /api/events/:id/statistics (auth required)',
        search: 'GET /api/events/search'
      },

      ticketTypes: {
        getByEvent: 'GET /api/ticket-types/event/:eventId',
        getById: 'GET /api/ticket-types/:id',
        create: 'POST /api/events/:eventId/ticket-types (auth required)',
        update: 'PUT /api/ticket-types/:id (auth required)',
        delete: 'DELETE /api/ticket-types/:id (auth required)',
        activate: 'POST /api/ticket-types/:id/activate (auth required)',
        deactivate: 'POST /api/ticket-types/:id/deactivate (auth required)',
        applyDiscount: 'POST /api/ticket-types/:id/discount (auth required)',
        updateQuantity: 'PUT /api/ticket-types/:id/quantity (auth required)',
        getStatistics: 'GET /api/ticket-types/:id/statistics (auth required)',
        getAvailable: 'GET /api/events/:eventId/ticket-types/available'
      },
      queue: {
        join: 'POST /api/queue/events/:eventId/join (auth required)',
        getStatus: 'GET /api/queue/events/:eventId/status (auth required)',
        leave: 'DELETE /api/queue/events/:eventId/leave (auth required)',
        processNext: 'POST /api/queue/events/:eventId/process-next (auth required)',
        getStatistics: 'GET /api/queue/events/:eventId/statistics (auth required)',
        extendProcessing: 'POST /api/queue/entries/:entryId/extend (auth required)',
        markPriority: 'POST /api/queue/entries/:entryId/priority (auth required)',
        getEntries: 'GET /api/queue/events/:eventId/entries (auth required)',
        updateStatus: 'PUT /api/queue/entries/:entryId/status (auth required)',
        cleanup: 'POST /api/queue/cleanup (system)'
      },
      purchaseSessions: {
        getActive: 'GET /api/purchase-sessions/events/:eventId/active (auth required)',
        addItems: 'POST /api/purchase-sessions/:sessionId/items (auth required)',
        removeItems: 'DELETE /api/purchase-sessions/:sessionId/items (auth required)',
        clear: 'DELETE /api/purchase-sessions/:sessionId/clear (auth required)',
        updateCustomer: 'PUT /api/purchase-sessions/:sessionId/customer (auth required)',
        extend: 'POST /api/purchase-sessions/:sessionId/extend (auth required)',
        complete: 'POST /api/purchase-sessions/:sessionId/complete (auth required)',
        abandon: 'POST /api/purchase-sessions/:sessionId/abandon (auth required)',
        getStatistics: 'GET /api/purchase-sessions/events/:eventId/statistics (auth required)',
        cleanup: 'POST /api/purchase-sessions/cleanup (system)'
      },
      orders: {
        getAll: 'GET /api/orders (auth required)',
        getById: 'GET /api/orders/:id (auth required)',
        create: 'POST /api/orders (auth required)',
        updateStatus: 'PUT /api/orders/:id/status (auth required)',
        cancel: 'POST /api/orders/:id/cancel (auth required)',
        refund: 'POST /api/orders/:id/refund (admin required)',
        getStatistics: 'GET /api/orders/events/:eventId/statistics (auth required)',
        getUserOrders: 'GET /api/orders/user/:userId',
        generateTickets: 'POST /api/orders/:id/generate-tickets (auth required)',
        getTickets: 'GET /api/orders/:id/tickets (auth required)',
        cleanup: 'POST /api/orders/cleanup (system)'
      },
      tickets: {
        getByUser: 'GET /api/tickets/user/:userId',
        getById: 'GET /api/tickets/:id (auth required)',
        validate: 'POST /api/tickets/:id/validate (auth required)',
        checkIn: 'POST /api/tickets/:id/check-in (auth required)',
        transfer: 'POST /api/tickets/:id/transfer (auth required)',
        getQRCode: 'GET /api/tickets/:id/qr-code (auth required)',
        getStatistics: 'GET /api/tickets/events/:eventId/statistics (auth required)'
      },
      system: {
        health: 'GET /api/health',
        cleanup: 'POST /api/system/cleanup (admin required)',
        stats: 'GET /api/system/stats (admin required)'
      }
    }
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

module.exports = router; 