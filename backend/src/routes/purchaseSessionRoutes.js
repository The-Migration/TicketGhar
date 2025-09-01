const express = require('express');
const router = express.Router();
const purchaseSessionController = require('../controllers/purchaseSessionController');
const { authenticate, authorize } = require('../middleware/auth');

// All purchase session routes require authentication
router.use(authenticate);

// Purchase session management
router.get('/events/:eventId/active', purchaseSessionController.getActivePurchaseSession);
router.post('/:sessionId/items', purchaseSessionController.addItemsToSession);
router.delete('/:sessionId/items', purchaseSessionController.removeItemsFromSession);
router.delete('/:sessionId/clear', purchaseSessionController.clearSession);

// Customer information
router.put('/:sessionId/customer', purchaseSessionController.updateCustomerInfo);

// Session lifecycle
router.post('/:sessionId/extend', purchaseSessionController.extendSession);
router.post('/:sessionId/complete', purchaseSessionController.completePurchase);
router.post('/:sessionId/abandon', purchaseSessionController.abandonSession);

// Statistics and management
router.get('/events/:eventId/statistics', purchaseSessionController.getSessionStatistics);

// System cleanup
router.post('/cleanup', authorize('admin'), purchaseSessionController.cleanupExpiredSessions);

module.exports = router; 