const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/auth');

// Test endpoint (public, no auth required)
router.get('/test-pdf', orderController.testPDF);

// All other order routes require authentication
router.use(authenticate);

// Order management
router.get('/', orderController.getOrders);
router.post('/', orderController.createOrder);

// User orders
router.get('/user/:userId', orderController.getUserOrders);

// Order statistics
router.get('/events/:eventId/statistics', orderController.getOrderStatistics);

// Ticket downloads (more specific routes first)
router.get('/tickets/:ticketId/download', orderController.downloadTicket);
router.get('/:id/download-tickets', orderController.downloadOrderTickets);

// Ticket management
router.post('/:id/generate-tickets', orderController.generateTickets);
router.get('/:id/tickets', orderController.getOrderTickets);
router.post('/:id/pay', orderController.payOrder);

// Order status management
router.put('/:id/status', orderController.updateOrderStatus);
router.post('/:id/cancel', orderController.cancelOrder);

// Admin functions
router.post('/:id/refund', authorize('admin'), orderController.processRefund);

// Generic order by ID (must be last to avoid conflicts)
router.get('/:id', orderController.getOrderById);

// System cleanup
router.post('/cleanup', authorize('admin'), orderController.cleanupExpiredOrders);

module.exports = router; 