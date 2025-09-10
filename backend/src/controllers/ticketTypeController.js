const { TicketType, Event, OrderItem, Ticket } = require('../models');
const { Op } = require('sequelize');

// Create new ticket type
exports.createTicketType = async (req, res) => {
  try {
    const { eventId } = req.params;
    const {
      name,
      description,
      price,
      quantityTotal,
      maxPerOrder,
      maxPerUser,
      saleStartTime,
      saleEndTime,
      color,
      sortOrder,
      isVisible,
      requiresApproval,
      originalPrice,
      discountPercentage,
      accessCode,
      isPublic,
      minAge,
      maxAge,
      benefits,
      restrictions
    } = req.body;

    // Check if event exists and user has permission
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.createdById !== req.user.id && 
        event.organizerId !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to manage this event' });
    }

    // Validate required fields
    if (!name || !price || !quantityTotal) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['name', 'price', 'quantityTotal']
      });
    }

    // Validate dates if provided
    if (saleStartTime && saleEndTime) {
      const saleStart = new Date(saleStartTime);
      const saleEnd = new Date(saleEndTime);
      
      if (saleEnd <= saleStart) {
        return res.status(400).json({ message: 'Sale end time must be after sale start time' });
      }
      
      if (saleEnd > event.startDate) {
        return res.status(400).json({ message: 'Sale must end before event starts' });
      }
    }

    const ticketType = await TicketType.create({
      eventId,
      name,
      description,
      price,
      quantityTotal,
      maxPerOrder: maxPerOrder || 10,
      maxPerUser: maxPerUser || 10,
      saleStartTime,
      saleEndTime,
      color,
      sortOrder: sortOrder || 0,
      isVisible: isVisible !== undefined ? isVisible : true,
      requiresApproval: requiresApproval || false,
      originalPrice: originalPrice || price,
      discountPercentage,
      accessCode,
      isPublic: isPublic !== undefined ? isPublic : true,
      minAge,
      maxAge,
      benefits: benefits || [],
      restrictions: restrictions || []
    });

    res.status(201).json({
      message: 'Ticket type created successfully',
      ticketType
    });
  } catch (error) {
    console.error('Create ticket type error:', error);
    res.status(500).json({
      message: 'Failed to create ticket type',
      error: error.message
    });
  }
};

// Get all ticket types for an event
exports.getTicketTypesByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { includeInactive = false } = req.query;

    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const where = { eventId };
    
    // Filter by status unless including inactive
    if (includeInactive !== 'true') {
      where.status = 'active';
      where.isVisible = true;
    }

    const ticketTypes = await TicketType.findAll({
      where,
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']]
    });

    res.json({
      eventId,
      ticketTypes: ticketTypes.map(tt => tt.toPublicJSON())
    });
  } catch (error) {
    console.error('Get ticket types error:', error);
    res.status(500).json({
      message: 'Failed to fetch ticket types',
      error: error.message
    });
  }
};

// Get single ticket type
exports.getTicketTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const { includeStats = false } = req.query;

    const ticketType = await TicketType.findByPk(id, {
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'title', 'startDate', 'status']
        }
      ]
    });

    if (!ticketType) {
      return res.status(404).json({ message: 'Ticket type not found' });
    }

    const response = { ticketType: ticketType.toPublicJSON() };

    // Add statistics if requested and user has permission
    if (includeStats === 'true') {
      const event = ticketType.event;
      if (event.createdById === req.user.id || 
          event.organizerId === req.user.id || 
          req.user.role === 'admin') {
        
        const stats = await TicketType.getItemStatistics(id);
        response.statistics = stats;
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Get ticket type error:', error);
    res.status(500).json({
      message: 'Failed to fetch ticket type',
      error: error.message
    });
  }
};

// Update ticket type
exports.updateTicketType = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const ticketType = await TicketType.findByPk(id, {
      include: [
        {
          model: Event,
          as: 'event'
        }
      ]
    });

    if (!ticketType) {
      return res.status(404).json({ message: 'Ticket type not found' });
    }

    // Check authorization
    const event = ticketType.event;
    if (event.createdById !== req.user.id && 
        event.organizerId !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this ticket type' });
    }

    // Validate quantity update
    if (updateData.quantityTotal !== undefined) {
      if (updateData.quantityTotal < ticketType.quantitySold) {
        return res.status(400).json({ 
          message: 'New total quantity cannot be less than quantity already sold',
          currentSold: ticketType.quantitySold,
          requestedTotal: updateData.quantityTotal
        });
      }
    }

    // Update ticket type
    await ticketType.update(updateData);

    res.json({
      message: 'Ticket type updated successfully',
      ticketType: ticketType.toPublicJSON()
    });
  } catch (error) {
    console.error('Update ticket type error:', error);
    res.status(500).json({
      message: 'Failed to update ticket type',
      error: error.message
    });
  }
};

// Delete ticket type
exports.deleteTicketType = async (req, res) => {
  try {
    const { id } = req.params;

    const ticketType = await TicketType.findByPk(id, {
      include: [
        {
          model: Event,
          as: 'event'
        }
      ]
    });

    if (!ticketType) {
      return res.status(404).json({ message: 'Ticket type not found' });
    }

    // Check authorization
    const event = ticketType.event;
    if (event.createdById !== req.user.id && 
        event.organizerId !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this ticket type' });
    }

    // Check if any tickets have been sold
    const soldCount = ticketType.quantitySold;
    if (soldCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete ticket type with sold tickets. Deactivate it instead.',
        soldTickets: soldCount
      });
    }

    await ticketType.destroy();

    res.json({ message: 'Ticket type deleted successfully' });
  } catch (error) {
    console.error('Delete ticket type error:', error);
    res.status(500).json({
      message: 'Failed to delete ticket type',
      error: error.message
    });
  }
};

// Activate ticket type
exports.activateTicketType = async (req, res) => {
  try {
    const { id } = req.params;

    const ticketType = await TicketType.findByPk(id, {
      include: [
        {
          model: Event,
          as: 'event'
        }
      ]
    });

    if (!ticketType) {
      return res.status(404).json({ message: 'Ticket type not found' });
    }

    // Check authorization
    const event = ticketType.event;
    if (event.createdById !== req.user.id && 
        event.organizerId !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to manage this ticket type' });
    }

    await ticketType.activate();

    res.json({
      message: 'Ticket type activated successfully',
      ticketType: ticketType.toPublicJSON()
    });
  } catch (error) {
    console.error('Activate ticket type error:', error);
    res.status(500).json({
      message: 'Failed to activate ticket type',
      error: error.message
    });
  }
};

// Deactivate ticket type
exports.deactivateTicketType = async (req, res) => {
  try {
    const { id } = req.params;

    const ticketType = await TicketType.findByPk(id, {
      include: [
        {
          model: Event,
          as: 'event'
        }
      ]
    });

    if (!ticketType) {
      return res.status(404).json({ message: 'Ticket type not found' });
    }

    // Check authorization
    const event = ticketType.event;
    if (event.createdById !== req.user.id && 
        event.organizerId !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to manage this ticket type' });
    }

    await ticketType.deactivate();

    res.json({
      message: 'Ticket type deactivated successfully',
      ticketType: ticketType.toPublicJSON()
    });
  } catch (error) {
    console.error('Deactivate ticket type error:', error);
    res.status(500).json({
      message: 'Failed to deactivate ticket type',
      error: error.message
    });
  }
};

// Apply discount to ticket type
exports.applyDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const { percentage, reason } = req.body;

    if (!percentage || percentage < 0 || percentage > 100) {
      return res.status(400).json({ 
        message: 'Invalid discount percentage. Must be between 0 and 100.' 
      });
    }

    const ticketType = await TicketType.findByPk(id, {
      include: [
        {
          model: Event,
          as: 'event'
        }
      ]
    });

    if (!ticketType) {
      return res.status(404).json({ message: 'Ticket type not found' });
    }

    // Check authorization
    const event = ticketType.event;
    if (event.createdById !== req.user.id && 
        event.organizerId !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to manage this ticket type' });
    }

    await ticketType.applyDiscount(percentage);

    // Log the discount application
    const metadata = ticketType.metadata || {};
    metadata.discountHistory = metadata.discountHistory || [];
    metadata.discountHistory.push({
      percentage,
      reason,
      appliedBy: req.user.id,
      appliedAt: new Date()
    });
    
    await ticketType.update({ metadata });

    res.json({
      message: 'Discount applied successfully',
      ticketType: ticketType.toPublicJSON(),
      discountAmount: ticketType.getDiscountAmount()
    });
  } catch (error) {
    console.error('Apply discount error:', error);
    res.status(500).json({
      message: 'Failed to apply discount',
      error: error.message
    });
  }
};

// Remove discount from ticket type
exports.removeDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    const ticketType = await TicketType.findByPk(id, {
      include: [
        {
          model: Event,
          as: 'event'
        }
      ]
    });

    if (!ticketType) {
      return res.status(404).json({ message: 'Ticket type not found' });
    }

    // Check authorization
    const event = ticketType.event;
    if (event.createdById !== req.user.id && 
        event.organizerId !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to manage this ticket type' });
    }

    await ticketType.removeDiscount();

    res.json({
      message: 'Discount removed successfully',
      ticketType: ticketType.toPublicJSON()
    });
  } catch (error) {
    console.error('Remove discount error:', error);
    res.status(500).json({
      message: 'Failed to remove discount',
      error: error.message
    });
  }
};

// Update ticket type quantity
exports.updateQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantityTotal, reason } = req.body;

    if (!quantityTotal || quantityTotal < 1) {
      return res.status(400).json({ 
        message: 'Invalid quantity. Must be greater than 0.' 
      });
    }

    const ticketType = await TicketType.findByPk(id, {
      include: [
        {
          model: Event,
          as: 'event'
        }
      ]
    });

    if (!ticketType) {
      return res.status(404).json({ message: 'Ticket type not found' });
    }

    // Check authorization
    const event = ticketType.event;
    if (event.createdById !== req.user.id && 
        event.organizerId !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to manage this ticket type' });
    }

    const oldQuantity = ticketType.quantityTotal;
    await ticketType.updateQuantity(quantityTotal);

    // Log the quantity change
    const metadata = ticketType.metadata || {};
    metadata.quantityHistory = metadata.quantityHistory || [];
    metadata.quantityHistory.push({
      oldQuantity,
      newQuantity: quantityTotal,
      reason,
      changedBy: req.user.id,
      changedAt: new Date()
    });
    
    await ticketType.update({ metadata });

    res.json({
      message: 'Quantity updated successfully',
      ticketType: ticketType.toPublicJSON(),
      change: {
        from: oldQuantity,
        to: quantityTotal,
        difference: quantityTotal - oldQuantity
      }
    });
  } catch (error) {
    console.error('Update quantity error:', error);
    res.status(500).json({
      message: 'Failed to update quantity',
      error: error.message
    });
  }
};

// Get ticket type statistics
exports.getTicketTypeStatistics = async (req, res) => {
  try {
    const { id } = req.params;

    const ticketType = await TicketType.findByPk(id, {
      include: [
        {
          model: Event,
          as: 'event'
        }
      ]
    });

    if (!ticketType) {
      return res.status(404).json({ message: 'Ticket type not found' });
    }

    // Check authorization
    const event = ticketType.event;
    if (event.createdById !== req.user.id && 
        event.organizerId !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view statistics' });
    }

    const stats = await TicketType.getItemStatistics(id);

    res.json({
      ticketTypeId: id,
      ticketTypeName: ticketType.name,
      statistics: stats
    });
  } catch (error) {
    console.error('Get ticket type statistics error:', error);
    res.status(500).json({
      message: 'Failed to fetch ticket type statistics',
      error: error.message
    });
  }
};

// Get available ticket types for purchase
exports.getAvailableTicketTypes = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.status !== 'active') {
      return res.status(400).json({ message: 'Event is not available for purchase' });
    }

    const ticketTypes = await TicketType.findAvailableByEvent(eventId);

    res.json({
      eventId,
      eventTitle: event.title,
      ticketTypes: ticketTypes.map(tt => tt.toPublicJSON())
    });
  } catch (error) {
    console.error('Get available ticket types error:', error);
    res.status(500).json({
      message: 'Failed to fetch available ticket types',
      error: error.message
    });
  }
}; 