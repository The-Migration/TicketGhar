const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getRefundStatus,
  processRefund,
  getEventRefunds,
  getRefundAnalytics,
  getAllRefundRequests,
  createManualRefundRequest,
  adminOverrideRefund,
  updateRefundRequest
} = require('../controllers/refundController');

// Get refund status for an order (for customer service operators)
router.get('/order/:orderId/status', authenticateToken, getRefundStatus);

// Process refund for specific tickets (for customer service operators)
router.post('/order/:orderId/process', authenticateToken, processRefund);

// Get all refunds for an event (for event organizers)
router.get('/event/:eventId', authenticateToken, getEventRefunds);

// Get refund analytics (for admin dashboard)
router.get('/analytics', authenticateToken, getRefundAnalytics);

// Admin-only routes
// Get all refund requests for admin panel
router.get('/admin/requests', authenticateToken, getAllRefundRequests);

// Create manual refund request (when admin receives call/email)
router.post('/admin/requests', authenticateToken, createManualRefundRequest);

// Admin override refund (bypass normal restrictions)
router.post('/admin/tickets/:ticketId/override', authenticateToken, adminOverrideRefund);

// Update refund request notes/status
router.put('/admin/tickets/:ticketId', authenticateToken, updateRefundRequest);

module.exports = router;
