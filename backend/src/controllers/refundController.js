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

module.exports = {
  getRefundStatus,
  processRefund,
  getEventRefunds,
  getRefundAnalytics
};
