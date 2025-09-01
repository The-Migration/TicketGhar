const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { authenticate, authorize } = require('../middleware/auth');

// All queue routes require authentication
router.use(authenticate);

// User queue management
router.get('/user/queues', queueController.getUserQueues);

// Queue management
router.post('/events/:eventId/join', queueController.joinQueue);
router.get('/events/:eventId/status', queueController.getQueueStatus);
router.delete('/events/:eventId/leave', queueController.leaveQueue);

// Admin queue management
router.post('/events/:eventId/process-next', queueController.processNext);
router.get('/events/:eventId/statistics', queueController.getQueueStatistics);
router.get('/events/:eventId/entries', queueController.getQueueEntries);

// Queue entry management
router.post('/entries/:entryId/extend', queueController.extendProcessingTime);
router.post('/entries/:entryId/priority', authorize('admin'), queueController.markAsPriority);
router.put('/entries/:entryId/status', queueController.updateQueueEntryStatus);

// System cleanup
router.post('/cleanup', authorize('admin'), queueController.cleanupExpiredEntries);

module.exports = router; 