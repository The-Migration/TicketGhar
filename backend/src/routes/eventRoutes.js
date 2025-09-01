const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticate, authorize, optionalAuthenticate, authenticateToken, requireAdmin } = require('../middleware/auth');
// const { uploadEventCover, handleUploadError } = require('../middleware/upload'); // REMOVE

// Public routes with optional authentication (for draft filtering)
router.get('/', optionalAuthenticate, eventController.getEvents);
router.get('/search', optionalAuthenticate, eventController.searchEvents);

// User events (specific route before generic :id route)
router.get('/user/:userId', eventController.getUserEvents);

// Admin routes for queue management (specific routes before generic :id route)
router.put('/:eventId/concurrent-users', authenticateToken, requireAdmin, eventController.updateConcurrentUsers);
router.get('/:eventId/queue-status', authenticateToken, requireAdmin, eventController.getQueueProcessingStatus);

// Event ticket types (specific route before generic :id route)
router.get('/:id/ticket-types', optionalAuthenticate, eventController.getEventTicketTypes);

// Event ticket type statistics (specific route before generic :id route)
router.get('/:id/ticket-type-statistics', eventController.getEventTicketTypeStatistics);

// User ticket allowance for an event (specific route before generic :id route)
router.get('/:id/user-ticket-allowance', eventController.getUserTicketAllowance);

// Event statistics (specific route before generic :id route)
router.get('/:id/statistics', eventController.getEventStatistics);

// Event attendees (specific route before generic :id route)
router.get('/:id/attendees', eventController.getEventAttendees);

// Generic event route (must be last to avoid conflicts)
router.get('/:id', optionalAuthenticate, eventController.getEventById);

// Protected routes
router.use(authenticate);

// Event management (no file upload)
router.post('/', eventController.createEvent);
router.put('/:id', eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

// Event status management
router.post('/:id/publish', eventController.publishEvent);
router.post('/:id/cancel', eventController.cancelEvent);

module.exports = router; 