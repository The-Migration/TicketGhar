const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getRefundStatus,
  processRefund,
  getEventRefunds,
  getRefundAnalytics
} = require('../controllers/refundController');

// Get refund status for an order (for customer service operators)
router.get('/order/:orderId/status', authenticateToken, getRefundStatus);

// Process refund for specific tickets (for customer service operators)
router.post('/order/:orderId/process', authenticateToken, processRefund);

// Get all refunds for an event (for event organizers)
router.get('/event/:eventId', authenticateToken, getEventRefunds);

// Get refund analytics (for admin dashboard)
router.get('/analytics', authenticateToken, getRefundAnalytics);

module.exports = router;
