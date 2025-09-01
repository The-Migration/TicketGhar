const { PurchaseSession, QueueEntry, Event, TicketType, Order, OrderItem, User } = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');

// Get active purchase session for user
exports.getActivePurchaseSession = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({ message: 'User authentication required' });
    }

    const purchaseSession = await PurchaseSession.findOne({
      where: {
        userId: userId,
        status: 'active'
      },
      include: [
        {
          model: QueueEntry,
          as: 'queueEntry',
          
          where: { eventId },
          required: true
        }
      ]
    });

    if (!purchaseSession) {
      return res.status(404).json({ message: 'No active purchase session found' });
    }

    // Check if session is expired
    if (purchaseSession.isExpired()) {
      await purchaseSession.expire();
      
      // Also expire the associated queue entry if it exists
      if (purchaseSession.queueEntryId) {
        const queueEntry = await QueueEntry.findByPk(purchaseSession.queueEntryId);
        if (queueEntry && queueEntry.status === 'processing') {
          await queueEntry.expire();
        }
      }

      // Send email notification to user
      try {
        const event = await Event.findByPk(purchaseSession.eventId);
        const user = await User.findByPk(purchaseSession.userId);
        if (event && user) {
          await emailService.sendSessionExpiredNotification(
            user.email,
            user.firstName || 'User',
            event.name,
            'timeout'
          );
        }
      } catch (error) {
        console.error('Failed to send session expired email notification:', error);
      }
      
      return res.status(410).json({ 
        message: 'Your purchase session has expired',
        code: 'SESSION_EXPIRED',
        details: 'Your 8-minute purchase window has expired. You were in position 2 in the queue, but your time to purchase tickets has run out. You can rejoin the queue to get another chance to purchase tickets.',
        queuePosition: purchaseSession.queueEntry?.position || 'unknown',
        eventName: purchaseSession.queueEntry?.event?.name || 'this event',
        reason: 'timeout'
      });
    }

    res.json({
      purchaseSession: purchaseSession.toPublicJSON()
    });

  } catch (error) {
    console.error('Get active purchase session error:', error);
    res.status(500).json({
      message: 'Failed to fetch purchase session',
      error: error.message
    });
  }
};

// Add items to purchase session
exports.addItemsToSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required' });
    }

    const purchaseSession = await PurchaseSession.findByPk(sessionId);
    if (!purchaseSession) {
      return res.status(404).json({ message: 'Purchase session not found' });
    }

    // Check if session is expired
    if (purchaseSession.isExpired()) {
      await purchaseSession.expire();
      return res.status(410).json({ message: 'Purchase session expired' });
    }

    // Check if user has permission
    if (purchaseSession.userId !== req.user?.id && 
        purchaseSession.sessionId !== req.sessionID) {
      return res.status(403).json({ message: 'Not authorized to modify this session' });
    }

    // Validate and add items
    const validatedItems = [];
    for (const item of items) {
      const { ticketTypeId, quantity } = item;

      if (!ticketTypeId || !quantity || quantity < 1) {
        return res.status(400).json({ 
          message: 'Each item must have ticketTypeId and quantity > 0' 
        });
      }

      const ticketType = await TicketType.findByPk(ticketTypeId);
      if (!ticketType) {
        return res.status(400).json({ 
          message: `Ticket type ${ticketTypeId} not found` 
        });
      }

      // Check availability
      const availableQuantity = await ticketType.getAvailableQuantity();
      if (quantity > availableQuantity) {
        return res.status(400).json({
          message: `Only ${availableQuantity} tickets available for ${ticketType.name}`,
          ticketType: ticketType.name,
          requested: quantity,
          available: availableQuantity
        });
      }

      // Check purchase limits
      const canPurchase = await ticketType.canPurchaseWithLimit(quantity, req.user?.id);
      if (!canPurchase.allowed) {
        return res.status(400).json({
          message: canPurchase.reason,
          ticketType: ticketType.name
        });
      }

      validatedItems.push({
        ticketTypeId,
        quantity,
        ticketType
      });
    }

    // Add items to session
    await purchaseSession.addItems(validatedItems);

    res.json({
      message: 'Items added to purchase session',
      purchaseSession: purchaseSession.toPublicJSON()
    });

  } catch (error) {
    console.error('Add items to session error:', error);
    res.status(500).json({
      message: 'Failed to add items to session',
      error: error.message
    });
  }
};

// Remove items from purchase session
exports.removeItemsFromSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { ticketTypeId, quantity } = req.body;

    const purchaseSession = await PurchaseSession.findByPk(sessionId);
    if (!purchaseSession) {
      return res.status(404).json({ message: 'Purchase session not found' });
    }

    // Check if session is expired
    if (purchaseSession.isExpired()) {
      await purchaseSession.expire();
      return res.status(410).json({ message: 'Purchase session expired' });
    }

    // Check if user has permission
    if (purchaseSession.userId !== req.user?.id && 
        purchaseSession.sessionId !== req.sessionID) {
      return res.status(403).json({ message: 'Not authorized to modify this session' });
    }

    await purchaseSession.removeItems(ticketTypeId, quantity);

    res.json({
      message: 'Items removed from purchase session',
      purchaseSession: purchaseSession.toPublicJSON()
    });

  } catch (error) {
    console.error('Remove items from session error:', error);
    res.status(500).json({
      message: 'Failed to remove items from session',
      error: error.message
    });
  }
};

// Clear all items from purchase session
exports.clearSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const purchaseSession = await PurchaseSession.findByPk(sessionId);
    if (!purchaseSession) {
      return res.status(404).json({ message: 'Purchase session not found' });
    }

    // Check if user has permission
    if (purchaseSession.userId !== req.user?.id && 
        purchaseSession.sessionId !== req.sessionID) {
      return res.status(403).json({ message: 'Not authorized to modify this session' });
    }

    await purchaseSession.clearItems();

    res.json({
      message: 'Purchase session cleared',
      purchaseSession: purchaseSession.toPublicJSON()
    });

  } catch (error) {
    console.error('Clear session error:', error);
    res.status(500).json({
      message: 'Failed to clear session',
      error: error.message
    });
  }
};

// Update customer information
exports.updateCustomerInfo = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { customerName, customerEmail, customerPhone } = req.body;

    const purchaseSession = await PurchaseSession.findByPk(sessionId);
    if (!purchaseSession) {
      return res.status(404).json({ message: 'Purchase session not found' });
    }

    // Check if session is expired
    if (purchaseSession.isExpired()) {
      await purchaseSession.expire();
      return res.status(410).json({ message: 'Purchase session expired' });
    }

    // Check if user has permission
    if (purchaseSession.userId !== req.user?.id && 
        purchaseSession.sessionId !== req.sessionID) {
      return res.status(403).json({ message: 'Not authorized to modify this session' });
    }

    await purchaseSession.updateCustomerInfo({
      customerName,
      customerEmail,
      customerPhone
    });

    res.json({
      message: 'Customer information updated',
      purchaseSession: purchaseSession.toPublicJSON()
    });

  } catch (error) {
    console.error('Update customer info error:', error);
    res.status(500).json({
      message: 'Failed to update customer information',
      error: error.message
    });
  }
};

// Extend purchase session
exports.extendSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { minutes = 2 } = req.body;

    const purchaseSession = await PurchaseSession.findByPk(sessionId);
    if (!purchaseSession) {
      return res.status(404).json({ message: 'Purchase session not found' });
    }

    // Check if user has permission
    if (purchaseSession.userId !== req.user?.id && 
        purchaseSession.sessionId !== req.sessionID) {
      return res.status(403).json({ message: 'Not authorized to modify this session' });
    }

    // Check if session can be extended
    if (purchaseSession.extensionCount >= 2) {
      return res.status(400).json({ 
        message: 'Maximum number of extensions reached',
        maxExtensions: 2,
        currentExtensions: purchaseSession.extensionCount
      });
    }

    await purchaseSession.extend(minutes);

    res.json({
      message: `Session extended by ${minutes} minutes`,
      purchaseSession: purchaseSession.toPublicJSON()
    });

  } catch (error) {
    console.error('Extend session error:', error);
    res.status(500).json({
      message: 'Failed to extend session',
      error: error.message
    });
  }
};

// Complete purchase (create order)
exports.completePurchase = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { paymentMethod, paymentDetails } = req.body;

    const purchaseSession = await PurchaseSession.findByPk(sessionId, {
      include: [
        {
          model: QueueEntry,
          as: 'queueEntry',
          include: [
            {
              model: Event,
              as: 'event'
            }
          ]
        }
      ]
    });

    if (!purchaseSession) {
      return res.status(404).json({ message: 'Purchase session not found' });
    }

    // Check if session is expired
    if (purchaseSession.isExpired()) {
      await purchaseSession.expire();
      return res.status(410).json({ message: 'Purchase session expired' });
    }

    // Check if user has permission
    if (purchaseSession.userId !== req.user?.id && 
        purchaseSession.sessionId !== req.sessionID) {
      return res.status(403).json({ message: 'Not authorized to complete this purchase' });
    }

    // Validate session has items
    const sessionItems = purchaseSession.sessionData?.items || [];
    if (sessionItems.length === 0) {
      return res.status(400).json({ message: 'No items in purchase session' });
    }

    // Validate customer information
    const customerInfo = purchaseSession.customerInfo;
    if (!customerInfo?.customerName || !customerInfo?.customerEmail) {
      return res.status(400).json({ 
        message: 'Customer name and email are required' 
      });
    }

    // Create order
    const order = await Order.create({
      userId: purchaseSession.userId,
      eventId: purchaseSession.queueEntry.eventId,
      purchaseSessionId: purchaseSession.id,
      status: 'processing',
      totalAmount: purchaseSession.totalAmount,
      subtotalAmount: purchaseSession.subtotalAmount,
      taxAmount: purchaseSession.taxAmount,
      feeAmount: purchaseSession.feeAmount,
      discountAmount: purchaseSession.discountAmount,
      currency: purchaseSession.queueEntry.event.currency || 'USD',
      paymentMethod,
      paymentDetails,
      customerName: customerInfo.customerName,
      customerEmail: customerInfo.customerEmail,
      customerPhone: customerInfo.customerPhone,
      orderDate: new Date()
    });

    // Create order items
    for (const item of sessionItems) {
      await OrderItem.create({
        orderId: order.id,
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        discountAmount: item.discountAmount || 0
      });
    }

    // Mark session as completed
    await purchaseSession.complete();

    // Mark queue entry as completed
    await purchaseSession.queueEntry.complete();

    // TODO: Process payment here
    // TODO: Generate tickets
    // TODO: Send confirmation email

    res.status(201).json({
      message: 'Purchase completed successfully',
      order: {
        id: order.id,
        totalAmount: order.totalAmount,
        status: order.status
      }
    });

  } catch (error) {
    console.error('Complete purchase error:', error);
    res.status(500).json({
      message: 'Failed to complete purchase',
      error: error.message
    });
  }
};

// Abandon purchase session
exports.abandonSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const purchaseSession = await PurchaseSession.findByPk(sessionId, {
      include: [
        {
          model: QueueEntry,
          as: 'queueEntry'
        }
      ]
    });

    if (!purchaseSession) {
      return res.status(404).json({ message: 'Purchase session not found' });
    }

    // Check if user has permission
    if (purchaseSession.userId !== req.user?.id && 
        purchaseSession.sessionId !== req.sessionID) {
      return res.status(403).json({ message: 'Not authorized to abandon this session' });
    }

    await purchaseSession.abandon();

    // Mark queue entry as abandoned
    await purchaseSession.queueEntry.abandon();

    res.json({
      message: 'Purchase session abandoned'
    });

  } catch (error) {
    console.error('Abandon session error:', error);
    res.status(500).json({
      message: 'Failed to abandon session',
      error: error.message
    });
  }
};

// Get session statistics (admin function)
exports.getSessionStatistics = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Check authorization
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.createdById !== req.user.id && 
        event.organizerId !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view session statistics' });
    }

    const stats = await PurchaseSession.getSessionStatsByEvent(eventId);
    const conversionRate = await PurchaseSession.getConversionRate(eventId);
    const averageSessionDuration = await PurchaseSession.getAverageSessionDuration(eventId);

    res.json({
      eventId,
      statistics: {
        ...stats,
        conversionRate,
        averageSessionDuration
      }
    });

  } catch (error) {
    console.error('Get session statistics error:', error);
    res.status(500).json({
      message: 'Failed to fetch session statistics',
      error: error.message
    });
  }
};

// Cleanup expired sessions (system function)
exports.cleanupExpiredSessions = async (req, res) => {
  try {
    const expiredSessions = await PurchaseSession.findExpiredSessions();
    
    const cleanupResults = await Promise.all(
      expiredSessions.map(session => session.expire())
    );

    res.json({
      message: `Cleaned up ${expiredSessions.length} expired purchase sessions`,
      cleanedSessions: expiredSessions.length
    });

  } catch (error) {
    console.error('Cleanup expired sessions error:', error);
    res.status(500).json({
      message: 'Failed to cleanup expired sessions',
      error: error.message
    });
  }
}; 