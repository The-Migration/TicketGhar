const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticate, authorize } = require('../middleware/auth');

// All ticket routes require authentication
router.use(authenticate);

// Ticket access
router.get('/user/:userId', ticketController.getUserTickets);
router.get('/:id', ticketController.getTicketById);

// Ticket validation and check-in
router.post('/:id/validate', ticketController.validateTicket);
router.post('/:id/check-in', ticketController.checkInTicket);

// Ticket transfer
router.post('/:id/transfer', ticketController.transferTicket);

// QR code generation and verification
router.get('/:id/qr-code', ticketController.getTicketQRCode);
router.post('/verify-qr', ticketController.verifyTicketQRCode);
router.post('/:id/check-in', ticketController.checkInTicket);

// Ticket download functionality
router.get('/:ticketId/download', ticketController.downloadTicket);
router.post('/:ticketId/generate-download-token', ticketController.generateDownloadToken);
router.get('/:ticketId/download-status', ticketController.getTicketDownloadStatus);

// Event ticket statistics
router.get('/events/:eventId/statistics', ticketController.getEventTicketStatistics);

module.exports = router; 