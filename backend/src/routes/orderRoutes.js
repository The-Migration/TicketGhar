const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/auth');

// All order routes require authentication
router.use(authenticate);

// Order management
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderById);
router.post('/', orderController.createOrder);

// Order status management
router.put('/:id/status', orderController.updateOrderStatus);
router.post('/:id/cancel', orderController.cancelOrder);

// Admin functions
router.post('/:id/refund', authorize('admin'), orderController.processRefund);

// User orders
router.get('/user/:userId', orderController.getUserOrders);

// Order statistics
router.get('/events/:eventId/statistics', orderController.getOrderStatistics);

// Ticket management
router.post('/:id/generate-tickets', orderController.generateTickets);
router.get('/:id/tickets', orderController.getOrderTickets);
router.post('/:id/pay', orderController.payOrder);

// System cleanup
router.post('/cleanup', authorize('admin'), orderController.cleanupExpiredOrders);

module.exports = router; 