const express = require('express');
const router = express.Router();
const ticketTypeController = require('../controllers/ticketTypeController');
const { authenticate, authorize } = require('../middleware/auth');

// Public routes
router.get('/event/:eventId', ticketTypeController.getTicketTypesByEvent);
router.get('/event/:eventId/available', ticketTypeController.getAvailableTicketTypes);
router.get('/:id', ticketTypeController.getTicketTypeById);

// Protected routes
router.use(authenticate);

// Ticket type management
router.post('/event/:eventId', ticketTypeController.createTicketType);
router.put('/:id', ticketTypeController.updateTicketType);
router.delete('/:id', ticketTypeController.deleteTicketType);

// Ticket type status management
router.post('/:id/activate', ticketTypeController.activateTicketType);
router.post('/:id/deactivate', ticketTypeController.deactivateTicketType);

// Pricing and quantity management
router.post('/:id/discount', ticketTypeController.applyDiscount);
router.delete('/:id/discount', ticketTypeController.removeDiscount);
router.put('/:id/quantity', ticketTypeController.updateQuantity);

// Statistics
router.get('/:id/statistics', ticketTypeController.getTicketTypeStatistics);

module.exports = router; 