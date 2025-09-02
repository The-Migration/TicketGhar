const { Ticket, Event, Order, OrderItem } = require('../models');
const { Op } = require('sequelize');

// Get refund status for an order
const getRefundStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findByPk(orderId, {
      include: [{
        model: OrderItem,
        as: 'orderItems',
        include: [{
          model: Ticket,
          as: 'tickets',
          include: [{
            model: Event,
            as: 'event'
          }]
        }]
      }]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get all tickets from the order
    const tickets = order.orderItems.flatMap(item => item.tickets);
    
    // Check refund status for each ticket
    const refundStatus = tickets.map(ticket => {
      const refundCheck = ticket.canRefund();
      return {
        ticketId: ticket.id,
        ticketCode: ticket.ticketCode,
        status: ticket.status,
        holderName: ticket.holderName,
        eventName: ticket.event?.name,
        eventStartDate: ticket.event?.startDate,
        refundDeadline: ticket.event?.refundDeadline,
        timezone: ticket.event?.timezone,
        canRefund: refundCheck.canRefund,
        reason: refundCheck.reason,
        refundedAt: ticket.refundedAt,
        refundedBy: ticket.refundedBy,
        refundReason: ticket.refundReason
      };
    });

    // Calculate overall refund status
    const activeTickets = tickets.filter(t => t.status === 'active');
    const refundableTickets = activeTickets.filter(t => t.canRefund().canRefund);
    const pastDeadlineTickets = activeTickets.filter(t => !t.canRefund().canRefund);

    const overallStatus = {
      orderId: order.id,
      totalTickets: tickets.length,
      activeTickets: activeTickets.length,
      refundableTickets: refundableTickets.length,
      pastDeadlineTickets: pastDeadlineTickets.length,
      alreadyRefunded: tickets.filter(t => t.status === 'refunded').length,
      tickets: refundStatus
    };

    res.json(overallStatus);
  } catch (error) {
    console.error('Error getting refund status:', error);
    res.status(500).json({ error: 'Failed to get refund status' });
  }
};

// Process refund for specific tickets
const processRefund = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { ticketIds, reason, operatorId } = req.body;

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({ error: 'Ticket IDs are required' });
    }

    if (!operatorId) {
      return res.status(400).json({ error: 'Operator ID is required' });
    }

    const order = await Order.findByPk(orderId, {
      include: [{
        model: OrderItem,
        as: 'orderItems',
        include: [{
          model: Ticket,
          as: 'tickets',
          where: { id: { [Op.in]: ticketIds } },
          include: [{
            model: Event,
            as: 'event'
          }]
        }]
      }]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const tickets = order.orderItems.flatMap(item => item.tickets);
    
    // Validate all tickets can be refunded
    const validationResults = tickets.map(ticket => {
      const refundCheck = ticket.canRefund();
      return {
        ticketId: ticket.id,
        ticketCode: ticket.ticketCode,
        canRefund: refundCheck.canRefund,
        reason: refundCheck.reason
      };
    });

    const invalidTickets = validationResults.filter(result => !result.canRefund);
    if (invalidTickets.length > 0) {
      return res.status(400).json({
        error: 'Some tickets cannot be refunded',
        invalidTickets
      });
    }

    // Process refunds
    const refundResults = [];
    for (const ticket of tickets) {
      try {
        await ticket.processRefund(operatorId, reason);
        refundResults.push({
          ticketId: ticket.id,
          ticketCode: ticket.ticketCode,
          success: true,
          message: 'Refund processed successfully'
        });
      } catch (error) {
        refundResults.push({
          ticketId: ticket.id,
          ticketCode: ticket.ticketCode,
          success: false,
          error: error.message
        });
      }
    }

    const successfulRefunds = refundResults.filter(r => r.success);
    const failedRefunds = refundResults.filter(r => !r.success);

    res.json({
      message: `Processed ${successfulRefunds.length} refunds successfully`,
      successfulRefunds,
      failedRefunds,
      totalProcessed: tickets.length
    });

  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
};

// Get all refunds for an event (for event organizers)
const getEventRefunds = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const refundedTickets = await Ticket.findAll({
      where: {
        status: 'refunded',
        eventId: eventId
      },
      include: [{
        model: Event,
        as: 'event'
      }],
      order: [['refundedAt', 'DESC']]
    });

    const refundStats = {
      totalRefunded: refundedTickets.length,
      refundsByDate: {},
      refundsByReason: {}
    };

    refundedTickets.forEach(ticket => {
      const date = ticket.refundedAt.toISOString().split('T')[0];
      refundStats.refundsByDate[date] = (refundStats.refundsByDate[date] || 0) + 1;
      
      const reason = ticket.refundReason || 'No reason provided';
      refundStats.refundsByReason[reason] = (refundStats.refundsByReason[reason] || 0) + 1;
    });

    res.json({
      eventId,
      refundedTickets,
      refundStats
    });

  } catch (error) {
    console.error('Error getting event refunds:', error);
    res.status(500).json({ error: 'Failed to get event refunds' });
  }
};

// Get refund analytics for admin dashboard
const getRefundAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const whereClause = {
      status: 'refunded'
    };

    if (startDate && endDate) {
      whereClause.refundedAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const refundedTickets = await Ticket.findAll({
      where: whereClause,
      include: [{
        model: Event,
        as: 'event'
      }],
      order: [['refundedAt', 'DESC']]
    });

    const analytics = {
      totalRefunds: refundedTickets.length,
      refundsByEvent: {},
      refundsByOperator: {},
      refundsByDate: {},
      averageRefundTime: 0
    };

    refundedTickets.forEach(ticket => {
      const eventName = ticket.event?.name || 'Unknown Event';
      analytics.refundsByEvent[eventName] = (analytics.refundsByEvent[eventName] || 0) + 1;
      
      const operator = ticket.refundedBy || 'Unknown';
      analytics.refundsByOperator[operator] = (analytics.refundsByOperator[operator] || 0) + 1;
      
      const date = ticket.refundedAt.toISOString().split('T')[0];
      analytics.refundsByDate[date] = (analytics.refundsByDate[date] || 0) + 1;
    });

    res.json(analytics);

  } catch (error) {
    console.error('Error getting refund analytics:', error);
    res.status(500).json({ error: 'Failed to get refund analytics' });
  }
};

// Get all refund requests for admin panel
const getAllRefundRequests = async (req, res) => {
  try {
    const { status, eventId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // Build where clause
    const whereClause = {};
    if (status) {
      if (status === 'allowed') {
        // Tickets that can be refunded (active and within deadline)
        whereClause.status = 'active';
      } else if (status === 'expired') {
        // Tickets that are active but past refund deadline
        whereClause.status = 'active';
      } else if (status === 'refunded') {
        whereClause.status = 'refunded';
      }
    }
    
    if (eventId) {
      whereClause.eventId = eventId;
    }
    
    const tickets = await Ticket.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'startDate', 'refundDeadline', 'refundPolicy']
        },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'customerName', 'customerEmail', 'customerPhone']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Process tickets to add refund status
    const processedTickets = tickets.rows.map(ticket => {
      const refundCheck = ticket.canRefund();
      const now = new Date();
      const deadline = ticket.event?.refundDeadline ? new Date(ticket.event.refundDeadline) : null;
      
      let refundStatus = 'unknown';
      if (ticket.status === 'refunded') {
        refundStatus = 'refunded';
      } else if (ticket.status === 'active' && refundCheck.canRefund) {
        refundStatus = 'allowed';
      } else if (ticket.status === 'active' && !refundCheck.canRefund) {
        refundStatus = 'expired';
      } else {
        refundStatus = ticket.status; // used, cancelled, etc.
      }
      
      return {
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        holderName: ticket.holderName,
        holderEmail: ticket.holderEmail,
        status: ticket.status,
        refundStatus,
        canRefund: refundCheck.canRefund,
        refundStatusReason: refundCheck.reason,
        refundedAt: ticket.refundedAt,
        refundedBy: ticket.refundedBy,
        refundReason: ticket.refundReason,
        event: ticket.event,
        order: ticket.order,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt
      };
    });
    
    // Filter by refund status if specified
    let filteredTickets = processedTickets;
    if (status && ['allowed', 'expired'].includes(status)) {
      filteredTickets = processedTickets.filter(ticket => ticket.refundStatus === status);
    }
    
    res.json({
      tickets: filteredTickets,
      pagination: {
        total: tickets.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(tickets.count / limit)
      },
      summary: {
        total: processedTickets.length,
        allowed: processedTickets.filter(t => t.refundStatus === 'allowed').length,
        expired: processedTickets.filter(t => t.refundStatus === 'expired').length,
        refunded: processedTickets.filter(t => t.refundStatus === 'refunded').length
      }
    });
    
  } catch (error) {
    console.error('Error getting refund requests:', error);
    res.status(500).json({ error: 'Failed to get refund requests' });
  }
};

// Create manual refund request (for admin when customer calls/emails)
const createManualRefundRequest = async (req, res) => {
  try {
    const { 
      ticketCode, 
      reason, 
      contactMethod, 
      customerNotes, 
      adminNotes,
      priority = 'normal' 
    } = req.body;
    
    if (!ticketCode || !reason) {
      return res.status(400).json({ error: 'Ticket code and reason are required' });
    }
    
    // Find the ticket
    const ticket = await Ticket.findOne({
      where: { ticketCode },
      include: [
        {
          model: Event,
          as: 'event'
        },
        {
          model: Order,
          as: 'order'
        }
      ]
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Create a refund request record (we'll need to add this model)
    // For now, we'll add notes to the ticket
    await ticket.update({
      adminNotes: adminNotes || `Manual refund request created by admin. Reason: ${reason}. Contact: ${contactMethod}. Customer notes: ${customerNotes}`,
      refundRequestedAt: new Date(),
      refundRequestReason: reason,
      refundPriority: priority
    });
    
    res.json({
      message: 'Manual refund request created successfully',
      ticket: {
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        holderName: ticket.holderName,
        status: ticket.status,
        event: ticket.event,
        order: ticket.order,
        refundRequestReason: reason,
        adminNotes: ticket.adminNotes
      }
    });
    
  } catch (error) {
    console.error('Error creating manual refund request:', error);
    res.status(500).json({ error: 'Failed to create manual refund request' });
  }
};

// Admin override refund (bypass normal restrictions)
const adminOverrideRefund = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { reason, adminId, overrideReason } = req.body;
    
    if (!adminId || !overrideReason) {
      return res.status(400).json({ error: 'Admin ID and override reason are required' });
    }
    
    const ticket = await Ticket.findByPk(ticketId, {
      include: [
        {
          model: Event,
          as: 'event'
        }
      ]
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Admin override - process refund regardless of normal restrictions
    await ticket.update({
      status: 'refunded',
      refundedAt: new Date(),
      refundedBy: adminId,
      refundReason: reason || 'Admin override refund',
      adminOverride: true,
      overrideReason: overrideReason,
      adminNotes: `${ticket.adminNotes || ''}\nAdmin override refund processed by ${adminId}. Override reason: ${overrideReason}`
    });
    
    // Update event's available tickets count
    const event = await ticket.getEvent();
    if (event) {
      await event.increment('availableTickets');
    }
    
    res.json({
      message: 'Admin override refund processed successfully',
      ticket: {
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        status: ticket.status,
        refundedAt: ticket.refundedAt,
        refundedBy: ticket.refundedBy,
        refundReason: ticket.refundReason,
        adminOverride: ticket.adminOverride,
        overrideReason: ticket.overrideReason
      }
    });
    
  } catch (error) {
    console.error('Error processing admin override refund:', error);
    res.status(500).json({ error: 'Failed to process admin override refund' });
  }
};

// Update refund request status/notes
const updateRefundRequest = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { adminNotes, priority, internalStatus } = req.body;
    
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    const updateData = {};
    if (adminNotes) updateData.adminNotes = adminNotes;
    if (priority) updateData.refundPriority = priority;
    if (internalStatus) updateData.internalRefundStatus = internalStatus;
    
    await ticket.update(updateData);
    
    res.json({
      message: 'Refund request updated successfully',
      ticket: {
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        adminNotes: ticket.adminNotes,
        refundPriority: ticket.refundPriority,
        internalRefundStatus: ticket.internalRefundStatus
      }
    });
    
  } catch (error) {
    console.error('Error updating refund request:', error);
    res.status(500).json({ error: 'Failed to update refund request' });
  }
};

module.exports = {
  getRefundStatus,
  processRefund,
  getEventRefunds,
  getRefundAnalytics,
  getAllRefundRequests,
  createManualRefundRequest,
  adminOverrideRefund,
  updateRefundRequest
};
