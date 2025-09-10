const express = require('express');
const router = express.Router();
const { scanTicket, getEventAttendees, getEventAttendeeStats, checkTicketScanStatus } = require('../controllers/ticketScanController');
const { authenticateToken } = require('../middleware/auth');

// Scan a ticket
router.post('/scan', authenticateToken, scanTicket);

// Check if a ticket can be scanned
router.get('/check/:ticketCode', authenticateToken, checkTicketScanStatus);

// Get attendees for an event (admin only)
router.get('/events/:eventId/attendees', authenticateToken, getEventAttendees);

// Get attendee statistics for an event (admin only)
router.get('/events/:eventId/attendees/stats', authenticateToken, getEventAttendeeStats);

module.exports = router;
