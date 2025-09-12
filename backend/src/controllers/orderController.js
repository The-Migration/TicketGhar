const { Order, OrderItem, Ticket, Event, User, TicketType, PurchaseSession, QueueEntry } = require('../models');
const { Op } = require('sequelize');
const { sendTicketEmail, generateTicketPDF, sendTicketConfirmationEmail } = require('../services/emailService');

// Create order (usually called from purchase session)
exports.createOrder = async (req, res) => {
  try {
    console.log('🎫 Starting order creation process...');
    console.log('🔍 Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 User info:', req.user ? { id: req.user.id, email: req.user.email, role: req.user.role } : 'No user');

    const {
      eventId,
      purchaseSessionId,
      items,
      customerName,
      customerEmail,
      customerPhone,
      paymentMethod,
      paymentDetails
    } = req.body;

    // Validate required fields
    if (!eventId || !items || !customerName || !customerEmail) {
      console.error('❌ Missing required fields:', { eventId, items: !!items, customerName, customerEmail });
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['eventId', 'items', 'customerName', 'customerEmail']
      });
    }

    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      console.error('❌ Invalid items array:', items);
      return res.status(400).json({
        message: 'Items must be a non-empty array'
      });
    }

    // Check if event exists
    let event;
    try {
      event = await Event.findByPk(eventId);
      if (!event) {
        console.error('❌ Event not found:', eventId);
        return res.status(404).json({ message: 'Event not found' });
      }
      console.log('✅ Event found:', event.name);
    } catch (error) {
      console.error('❌ Error fetching event:', error);
      return res.status(500).json({ message: 'Error fetching event', error: error.message });
    }

    // Check if sale has started - if so, user must be in queue with active purchase session
    const now = new Date();
    const saleStart = new Date(event.ticketSaleStartTime);
    const saleStarted = now >= saleStart;

    if (saleStarted) {
      // Sale has started - user must be in queue with active purchase session
      if (!purchaseSessionId || (purchaseSessionId && purchaseSessionId.startsWith('session_'))) {
        // For development/testing purposes, allow orders without purchase sessions or with dummy session IDs
        if (process.env.NODE_ENV === 'development') {
          console.log(`⚠️  Development mode: Allowing order without valid purchase session for event ${eventId}`);
        } else {
          return res.status(403).json({
            message: 'Ticket sales have started. You must join the queue to purchase tickets.',
            requiresQueue: true
          });
        }
      }

      // Check if user has an active purchase session (skip validation for dummy session IDs)
      if (purchaseSessionId && !purchaseSessionId.startsWith('session_')) {
        try {
          const purchaseSession = await PurchaseSession.findOne({
            where: {
              id: purchaseSessionId,
              userId: req.user?.id,
              status: 'active',
              expiresAt: { [Op.gt]: now }
            },
            include: [
              {
                model: QueueEntry,
                as: 'queueEntry',
                where: { eventId }
              }
            ]
          });

          if (!purchaseSession) {
            // For development/testing purposes, allow orders without valid purchase sessions
            if (process.env.NODE_ENV === 'development') {
              console.log(`⚠️  Development mode: Allowing order without valid purchase session ${purchaseSessionId}`);
            } else {
              return res.status(403).json({
                message: 'You do not have an active purchase session. Please wait for your turn in the queue.',
                requiresQueue: true
              });
            }
          }
        } catch (error) {
          console.error('❌ Error validating purchase session:', error);
          if (process.env.NODE_ENV === 'development') {
            console.log(`⚠️  Development mode: Allowing order despite purchase session validation error`);
          } else {
            return res.status(500).json({
              message: 'Error validating purchase session',
              error: error.message
            });
          }
        }
      }

      console.log(`✅ User ${req.user?.id} has active purchase session ${purchaseSessionId} for event ${eventId}`);
    }

    // Calculate totals
    let subtotalAmount = 0;
    const validatedItems = [];

    console.log('🔍 Processing items:', items.length);

    for (const item of items) {
      try {
        // Validate item structure
        if (!item.ticketTypeId || !item.quantity || item.quantity <= 0) {
          console.error('❌ Invalid item structure:', item);
          return res.status(400).json({
            message: 'Invalid item structure. Each item must have ticketTypeId and quantity > 0'
          });
        }

        // Fetch ticket type
        const ticketType = await TicketType.findByPk(item.ticketTypeId);
        if (!ticketType) {
          console.error('❌ Ticket type not found:', item.ticketTypeId);
          return res.status(400).json({
            message: `Ticket type ${item.ticketTypeId} not found`
          });
        }

        console.log('✅ Ticket type found:', ticketType.name, 'Available:', ticketType.getAvailableQuantity());

        // Check purchase limits for this user (only if user is authenticated)
        if (req.user?.id) {
          console.log('🔍 Checking purchase limits for authenticated user:', req.user.id);
          try {
            const canPurchase = await ticketType.canPurchaseWithLimit(item.quantity, req.user.id);
            console.log('🔍 Purchase limit check result:', canPurchase);
            if (!canPurchase.allowed) {
              return res.status(400).json({
                message: canPurchase.reason,
                ticketType: ticketType.name
              });
            }
          } catch (error) {
            console.error('🔍 Error in canPurchaseWithLimit:', error);
            // In development, allow the purchase to continue
            if (process.env.NODE_ENV === 'development') {
              console.log('⚠️  Development mode: Allowing purchase despite limit check error');
            } else {
              throw error;
            }
          }
        } else {
          // For unauthenticated users, just check basic availability
          console.log('🔍 Checking availability for unauthenticated user');
          const availableQuantity = ticketType.getAvailableQuantity();
          if (item.quantity > availableQuantity) {
            return res.status(400).json({
              message: `Only ${availableQuantity} tickets available`,
              ticketType: ticketType.name
            });
          }
          
          if (item.quantity > ticketType.maxPerOrder) {
            return res.status(400).json({
              message: `Maximum ${ticketType.maxPerOrder} tickets per order allowed`,
              ticketType: ticketType.name
            });
          }
        }

        // Calculate prices with fallbacks
        let unitPrice, itemTotal, discountAmount;
        try {
          unitPrice = ticketType.calculateFinalPrice();
          itemTotal = unitPrice * item.quantity;
          discountAmount = ticketType.getDiscountAmount() * item.quantity;
        } catch (error) {
          console.error('❌ Error calculating prices:', error);
          // Fallback to basic price calculation
          unitPrice = ticketType.price || 0;
          itemTotal = unitPrice * item.quantity;
          discountAmount = 0;
          console.log('⚠️  Using fallback price calculation');
        }

        subtotalAmount += itemTotal;

        validatedItems.push({
          ...item,
          unitPrice,
          totalPrice: itemTotal,
          discountAmount
        });

        console.log('✅ Item validated:', ticketType.name, 'Qty:', item.quantity, 'Total:', itemTotal);

      } catch (error) {
        console.error('❌ Error processing item:', item, error);
        return res.status(500).json({
          message: 'Error processing item',
          error: error.message,
          item
        });
      }
    }

    // Calculate taxes and fees
    const taxAmount = subtotalAmount * 0.1; // 10% tax
    const feeAmount = subtotalAmount * 0.03; // 3% processing fee
    const totalAmount = subtotalAmount + taxAmount + feeAmount;

    // Determine order status based on session type
    // For dummy payments, we'll detect them by checking if paymentMethod is 'dummy', if no purchaseSessionId is provided, or if it's a dummy session ID
    const isDummySession = !purchaseSessionId || paymentMethod === 'dummy' || (purchaseSessionId && purchaseSessionId.startsWith('session_'));
    const orderStatus = isDummySession ? 'confirmed' : 'pending';
    const paymentStatus = isDummySession ? 'paid' : 'pending';
    
    console.log(`🎫 Creating order with status: ${orderStatus}, paymentStatus: ${paymentStatus} (dummy session: ${isDummySession})`);

    // Create order
    let order;
    try {
      console.log('🔍 Creating order with data:', {
        userId: req.user?.id || null,
        eventId,
        purchaseSessionId,
        status: orderStatus,
        totalAmount,
        subtotalAmount,
        taxAmount,
        feeAmount
      });

      order = await Order.create({
        userId: req.user?.id || null, // Allow null for unauthenticated users
        eventId,
        purchaseSessionId: isDummySession ? null : purchaseSessionId, // Set to null for dummy sessions to avoid UUID validation error
        orderNumber: 'TG' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase(), // Simple order number generation
        status: orderStatus,
        paymentStatus: paymentStatus,
        totalAmount,
        subtotalAmount,
        taxAmount,
        feeAmount,
        commissionAmount: 0.00, // Required field with default value
        discountAmount: validatedItems.reduce((sum, item) => sum + item.discountAmount, 0),
        currency: event.currency || 'USD',
        paymentMethod: paymentMethod || 'dummy',
        paymentDetails: paymentDetails || {},
        customerName,
        customerEmail,
        customerPhone,
        orderDate: new Date(),
        // For dummy payments, explicitly set expiresAt to null to prevent cancellation
        expiresAt: isDummySession ? null : undefined,
        // For dummy payments, set completedAt since they are treated as completed payments
        completedAt: isDummySession ? new Date() : undefined
      });

      console.log('✅ Order created successfully:', order.id, 'Status:', order.status);
    } catch (error) {
      console.error('❌ Error creating order:', error);
      return res.status(500).json({
        message: 'Failed to create order',
        error: error.message
      });
    }

    // Create order items
    try {
      for (const item of validatedItems) {
        console.log('🔍 Creating order item:', item);
        const orderItem = await OrderItem.create({
          orderId: order.id,
          ticketTypeId: item.ticketTypeId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          discountAmount: item.discountAmount
        });
        console.log('✅ Order item created:', orderItem.id, 'for order:', order.id);
      }
    } catch (error) {
      console.error('❌ Error creating order items:', error);
      // Try to clean up the order if items creation fails
      try {
        await order.destroy();
        console.log('🧹 Cleaned up order after item creation failure');
      } catch (cleanupError) {
        console.error('❌ Error cleaning up order:', cleanupError);
      }
      return res.status(500).json({
        message: 'Failed to create order items',
        error: error.message
      });
    }

    // For dummy sessions, automatically generate tickets since order is marked as 'paid'
    if (isDummySession) {
      console.log('🎫 Dummy session detected - generating tickets automatically');
      try {
        const generatedTickets = await order.generateTickets();
        console.log('✅ Tickets generated successfully for dummy session order:', generatedTickets?.length || 'unknown count');
        
        // Send ticket confirmation email asynchronously (non-blocking)
        if (generatedTickets && generatedTickets.length > 0) {
          console.log('📧 Scheduling ticket confirmation email to:', customerEmail);
          // Send email in background without blocking order creation
          setImmediate(async () => {
            try {
              await sendTicketConfirmationEmail({
                to: customerEmail,
                customerName,
                order,
                tickets: generatedTickets,
                event
              });
              console.log('✅ Ticket confirmation email sent successfully');
            } catch (emailError) {
              console.error('❌ Error sending ticket confirmation email:', emailError);
              // Don't fail the order if email fails
            }
          });
        }
      } catch (ticketError) {
        console.error('❌ Error generating tickets for dummy session:', ticketError);
        // Don't fail the order creation if ticket generation fails
        console.log('⚠️  Order created but ticket generation failed - tickets can be generated later');
      }
    }

    // Fetch complete order
    let completeOrder;
    try {
      completeOrder = await Order.findByPk(order.id, {
        include: [
          {
            model: OrderItem,
            as: 'orderItems',
            include: [
              {
                model: TicketType,
                as: 'ticketType'
              }
            ]
          },
          {
            model: Event,
            as: 'event'
          }
        ]
      });

      if (!completeOrder) {
        console.error('❌ Failed to fetch complete order after creation');
        return res.status(500).json({
          message: 'Order created but failed to fetch complete details'
        });
      }

      console.log('✅ Order creation completed successfully:', completeOrder.id);
      res.status(201).json({
        message: 'Order created successfully',
        order: completeOrder.toPublicJSON ? completeOrder.toPublicJSON() : completeOrder
      });

    } catch (error) {
      console.error('❌ Error fetching complete order:', error);
      res.status(201).json({
        message: 'Order created successfully',
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: order.totalAmount,
          customerName: order.customerName,
          customerEmail: order.customerEmail
        }
      });
    }

  } catch (error) {
    console.error('❌ Create order error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      message: 'Failed to create order',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Download ticket as PDF
exports.downloadTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    // Find the ticket with event information
    const ticket = await Ticket.findByPk(ticketId, {
      include: [
        {
          model: Event,
          as: 'event'
        },
        {
          model: TicketType,
          as: 'ticketType'
        }
      ]
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if user has access to this ticket
    if (req.user && req.user.id !== ticket.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Generate PDF
    const pdfBuffer = await generateTicketPDF({ 
      event: ticket.event, 
      ticket 
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.ticketNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send the PDF
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Download ticket error:', error);
    res.status(500).json({
      message: 'Failed to download ticket',
      error: error.message
    });
  }
};

// Test PDF generation endpoint
exports.testPDF = async (req, res) => {
  try {
    console.log('🧪 Testing PDF generation...');
    
    const testEvent = {
      name: 'Test Event',
      venue: 'Test Venue',
      startDate: new Date()
    };
    
    const testTicket = {
      ticketCode: 'TEST-123',
      ticketNumber: 'TKT-TEST-123',
      holderName: 'Test User',
      holderEmail: 'test@example.com'
    };
    
    const { generateTicketPDF } = require('../services/emailService');
    const pdfBuffer = await generateTicketPDF({ event: testEvent, ticket: testTicket });
    
    console.log('✅ Test PDF generated successfully, size:', pdfBuffer.length);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="test-ticket.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('❌ Test PDF generation failed:', error);
    res.status(500).json({ message: 'PDF generation test failed', error: error.message });
  }
};

// Download all tickets for an order as ZIP
exports.downloadOrderTickets = async (req, res) => {
  try {
    console.log('🎫 downloadOrderTickets - Function called!');
    console.log('🎫 downloadOrderTickets - Request method:', req.method);
    console.log('🎫 downloadOrderTickets - Request URL:', req.url);
    console.log('🎫 downloadOrderTickets - Request params:', req.params);
    
    const { id: orderId } = req.params;
    console.log('🔍 downloadOrderTickets - Requested order ID:', orderId);
    console.log('🔍 downloadOrderTickets - User:', req.user?.id);
    
    // Find the order with tickets
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: Event,
          as: 'event'
        },
        {
          model: OrderItem,
          as: 'orderItems',
          include: [
            {
              model: Ticket,
              as: 'tickets',
              include: [
                {
                  model: TicketType,
                  as: 'ticketType'
                }
              ]
            }
          ]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log('🔍 downloadOrderTickets - Order found:', order.id);
    console.log('🔍 downloadOrderTickets - Order status:', order.status);
    console.log('🔍 downloadOrderTickets - Order items count:', order.orderItems?.length || 0);

    // Check if user has access to this order
    if (req.user && req.user.id !== order.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Collect all tickets from order items
    const allTickets = [];
    for (const orderItem of order.orderItems) {
      console.log('🔍 downloadOrderTickets - OrderItem:', orderItem.id, 'Tickets:', orderItem.tickets?.length || 0);
      if (orderItem.tickets) {
        allTickets.push(...orderItem.tickets);
      }
    }
    
    console.log('🔍 downloadOrderTickets - Total tickets found:', allTickets.length);

    if (allTickets.length === 0) {
      return res.status(404).json({ message: 'No tickets found for this order' });
    }

    // If only one ticket, download as PDF
    if (allTickets.length === 1) {
      const ticket = allTickets[0];
      console.log('🔍 downloadOrderTickets - Generating PDF for single ticket:', ticket.id);
      console.log('🔍 downloadOrderTickets - Event data:', { id: order.event?.id, name: order.event?.name, title: order.event?.title });
      console.log('🔍 downloadOrderTickets - Ticket data:', { id: ticket.id, ticketNumber: ticket.ticketNumber, ticketCode: ticket.ticketCode });
      
      try {
        console.log('🔍 downloadOrderTickets - About to generate PDF...');
        console.log('🔍 downloadOrderTickets - Event object:', order.event ? 'Present' : 'Missing');
        console.log('🔍 downloadOrderTickets - Ticket object:', ticket ? 'Present' : 'Missing');
        
        const pdfBuffer = await generateTicketPDF({ 
          event: order.event, 
          ticket 
        });
        
        console.log('✅ downloadOrderTickets - PDF generated successfully, size:', pdfBuffer.length);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.ticketCode}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
        return;
      } catch (pdfError) {
        console.error('❌ downloadOrderTickets - PDF generation error:', pdfError);
        return res.status(500).json({ message: 'Failed to generate PDF', error: pdfError.message });
      }
    }

    // For multiple tickets, create a ZIP file
    const archiver = require('archiver');
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="tickets-order-${order.orderNumber}.zip"`);

    archive.pipe(res);

    // Add each ticket as a PDF to the ZIP
    for (const ticket of allTickets) {
      try {
        const pdfBuffer = await generateTicketPDF({ 
          event: order.event, 
          ticket 
        });
        archive.append(pdfBuffer, { name: `ticket-${ticket.ticketNumber}.pdf` });
      } catch (error) {
        console.error(`Error generating PDF for ticket ${ticket.id}:`, error);
      }
    }

    await archive.finalize();

  } catch (error) {
    console.error('❌ downloadOrderTickets - Main error:', error);
    console.error('❌ downloadOrderTickets - Error stack:', error.stack);
    res.status(500).json({
      message: 'Failed to download tickets',
      error: error.message
    });
  }
};

// Get all orders with filtering and pagination
exports.getOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      eventId,
      userId,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (status) {
      where.status = status;
    }
    if (eventId) {
      where.eventId = eventId;
    }
    if (userId) {
      where.userId = userId;
    }

    // Check authorization
    if (req.user.role !== 'admin') {
      // Non-admin users can only see their own orders
      where.userId = req.user.id;
    }

    const orders = await Order.findAndCountAll({
      where,
      include: [
        {
          model: OrderItem,
          as: 'orderItems',
          include: [
            {
              model: TicketType,
              as: 'ticketType'
            },
            {
              model: require('../models').Ticket,
              as: 'tickets'
            }
          ]
        },
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'startDate', 'venue']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      orders: orders.rows.map(order => order.toPublicJSON()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(orders.count / limit),
        totalItems: orders.count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

// Get single order by ID
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: 'orderItems',
          include: [
            { model: TicketType, as: 'ticketType' },
            { 
              model: Ticket, 
              as: 'tickets',
              where: {
                status: {
                  [require('sequelize').Op.ne]: 'used' // Exclude scanned/used tickets
                }
              },
              required: false,
              include: [
                {
                  model: Event,
                  as: 'event',
                  attributes: ['id', 'name', 'venue', 'startDate', 'endDate', 'description']
                }
              ]
            }
          ]
        },
        { 
          model: Event, 
          as: 'event',
          attributes: ['id', 'name', 'venue', 'startDate', 'endDate', 'description']
        },
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'firstName', 'lastName', 'email'], 
          required: false 
        },
        { 
          model: PurchaseSession, 
          as: 'purchaseSession', 
          required: false 
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && order.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    // Ensure event info is attached to each ticket
    if (order && order.orderItems) {
      console.log('🔍 Order items found:', order.orderItems.length);
      const eventInfo = order.event;
      order.orderItems.forEach((item, index) => {
        console.log(`🔍 Order item ${index}:`, {
          id: item.id,
          quantity: item.quantity,
          ticketsCount: item.tickets ? item.tickets.length : 0
        });
        if (item.tickets && Array.isArray(item.tickets)) {
          item.tickets = item.tickets.map(ticket => {
            // Always attach event info
            if (eventInfo) {
              ticket.event = eventInfo;
            }
            return ticket.toPublicJSON ? ticket.toPublicJSON() : ticket.toJSON();
          });
        }
      });
    }

    res.json({
      order: order.toPublicJSON ? order.toPublicJSON() : order.toJSON()
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      message: 'Failed to fetch order',
      error: error.message
    });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && order.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    // Validate status transition
    const validStatuses = ['processing', 'confirmed', 'cancelled', 'refunded', 'expired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid status',
        validStatuses
      });
    }

    // Update order status
    await order.update({ status });

    // Add status change to history
    if (reason) {
      const statusHistory = order.statusHistory || [];
      statusHistory.push({
        status,
        reason,
        changedBy: req.user.id,
        changedAt: new Date()
      });
      await order.update({ statusHistory });
    }

    // Handle status-specific actions
    if (status === 'confirmed' || status === 'paid') {
      await order.generateTickets();
    }

    res.json({
      message: 'Order status updated successfully',
      order: { id: order.id, status: order.status }
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && order.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    // Check if order can be cancelled
    if (!['processing', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        message: `Cannot cancel order with status: ${order.status}`
      });
    }

    await order.cancel(reason);

    res.json({
      message: 'Order cancelled successfully',
      order: { id: order.id, status: order.status }
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      message: 'Failed to cancel order',
      error: error.message
    });
  }
};

// Process refund for order
exports.processRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only admins can process refunds
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can process refunds' });
    }

    // Check if order can be refunded
    if (!['confirmed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        message: `Cannot refund order with status: ${order.status}`
      });
    }

    const refundAmount = amount || order.totalAmount;
    await order.processRefund(refundAmount, reason);

    res.json({
      message: 'Refund processed successfully',
      order: { id: order.id, status: order.status },
      refundAmount
    });

  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      message: 'Failed to process refund',
      error: error.message
    });
  }
};

// Get order statistics
exports.getOrderStatistics = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Check authorization for event
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.createdById !== req.user.id &&
        event.organizerId !== req.user.id &&
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view order statistics' });
    }

    const stats = await Order.getOrderStatsByEvent(eventId);

    res.json({
      eventId,
      statistics: stats
    });

  } catch (error) {
    console.error('Get order statistics error:', error);
    res.status(500).json({
      message: 'Failed to fetch order statistics',
      error: error.message
    });
  }
};

// Get user orders
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    // Check authorization
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view these orders' });
    }

    const offset = (page - 1) * limit;
    const where = { userId };

    if (status) {
      where.status = status;
    }

    const orders = await Order.findAndCountAll({
      where,
      include: [
        {
          model: OrderItem,
          as: 'orderItems',
          include: [
            {
              model: TicketType,
              as: 'ticketType'
            }
          ]
        },
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'startDate', 'venue']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      orders: orders.rows.map(order => order.toPublicJSON()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(orders.count / limit),
        totalItems: orders.count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      message: 'Failed to fetch user orders',
      error: error.message
    });
  }
};

// Generate tickets for confirmed order
exports.generateTickets = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: 'orderItems',
          include: [
            {
              model: TicketType,
              as: 'ticketType'
            }
          ]
        },
        {
          model: Event,
          as: 'event'
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && order.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to generate tickets for this order' });
    }

    if (order.status !== 'confirmed' && order.status !== 'paid') {
      return res.status(400).json({
        message: 'Order must be confirmed or paid before generating tickets'
      });
    }

    const tickets = await order.generateTickets();

    res.json({
      message: 'Tickets generated successfully',
      tickets: tickets.map(ticket => ticket.toPublicJSON())
    });

  } catch (error) {
    console.error('Generate tickets error:', error);
    res.status(500).json({
      message: 'Failed to generate tickets',
      error: error.message
    });
  }
};

// Get order tickets - FIXED VERSION
exports.getOrderTickets = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('OrderTickets Debug - Order ID:', id);
    
    // Get the order with event information
    const order = await Order.findByPk(id, {
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'venue', 'startDate', 'endDate', 'description']
        },
        {
          model: OrderItem,
          as: 'orderItems',
          include: [
            {
              model: Ticket,
              as: 'tickets',
              where: {
                status: {
                  [require('sequelize').Op.ne]: 'used' // Exclude scanned/used tickets
                }
              },
              required: false,
              include: [
                {
                  model: Event,
                  as: 'event',
                  attributes: ['id', 'name', 'venue', 'startDate', 'endDate', 'description']
                }
              ]
            }
          ]
        }
      ]
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Collect all tickets from all order items
    const allTickets = [];
    const eventInfo = order.event;
    
    order.orderItems.forEach(item => {
      if (item.tickets && item.tickets.length > 0) {
        item.tickets.forEach(ticket => {
          // Ensure each ticket has event information
          if (!ticket.event && eventInfo) {
            ticket.event = eventInfo;
          }
          allTickets.push(ticket);
        });
      }
    });
    
    console.log('OrderTickets Debug - Tickets found:', allTickets.length);
    
    res.json({
      orderId: id,
      event: eventInfo,
      tickets: allTickets.map(ticket => ({
        ...ticket.toJSON(),
        event: ticket.event || eventInfo
      }))
    });
    
  } catch (error) {
    console.error('Get order tickets error:', error);
    res.status(500).json({
      message: 'Failed to fetch order tickets',
      error: error.message
    });
  }
};

// Cleanup expired orders (system function)
exports.cleanupExpiredOrders = async (req, res) => {
  try {
    const expiredOrders = await Order.findExpiredOrders();

    const cleanupResults = await Promise.all(
      expiredOrders.map(order => order.expire())
    );

    res.json({
      message: `Cleaned up ${expiredOrders.length} expired orders`,
      cleanedOrders: expiredOrders.length
    });

  } catch (error) {
    console.error('Cleanup expired orders error:', error);
    res.status(500).json({
      message: 'Failed to cleanup expired orders',
      error: error.message
    });
  }
};

// Mark order as paid and remove user from queue - FIXED VERSION
exports.payOrder = async (req, res) => {
  console.log('PayOrder Debug - Endpoint called for order:', req.params.id);
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Find the order WITH EVENT INFO
    const order = await Order.findByPk(id, {
      include: [
        { 
          model: Event, 
          as: 'event',
          attributes: ['id', 'name', 'venue', 'startDate', 'endDate', 'description', 'refundDeadline', 'refundPolicy', 'refundTerms', 'timezone']
        },
        {
          model: OrderItem,
          as: 'orderItems',
          include: [
            {
              model: TicketType,
              as: 'ticketType'
            },
            {
              model: Ticket,
              as: 'tickets'
            }
          ]
        }
      ]
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    if (!order.event) {
      return res.status(400).json({ message: 'Order event information not found' });
    }
    
    console.log('PayOrder Debug - Order status before payment:', order.status);
    console.log('PayOrder Debug - Event info:', order.event.name, order.event.venue);
    
    // Only allow paying for own order (unless admin)
    if (req.user.role !== 'admin' && order.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to pay for this order' });
    }
    
    // Mark as paid if not already
    let createdTickets = [];
    let shouldSendEmail = false;
    
    if (order.status !== 'paid') {
      await order.update({ status: 'paid', completedAt: new Date() });
      console.log('Calling generateTickets for order:', order.id);
      
      // Generate tickets with event info
      createdTickets = await order.generateTickets();
      console.log('Generated tickets count:', createdTickets.length);
      shouldSendEmail = true; // Send email for newly paid orders
      
      // Ensure each ticket has event information
      createdTickets = createdTickets.map(ticket => {
        if (!ticket.event) {
          ticket.event = order.event;
        }
        return ticket;
      });
      
      console.log('Finished generateTickets for order:', order.id);
    } else {
      // Order is already paid - check if we have existing tickets
      console.log('Order already paid, checking for existing tickets:', order.id);
      
      // Get existing tickets for this order
      const existingTickets = [];
      if (order.orderItems) {
        for (const item of order.orderItems) {
          if (item.tickets) {
            existingTickets.push(...item.tickets);
          }
        }
      }
      
      createdTickets = existingTickets;
      console.log('Found existing tickets count:', createdTickets.length);
      
      // Send email for existing tickets if they exist and no email was sent before
      shouldSendEmail = createdTickets.length > 0;
    }
    
    // Send ticket(s) to user's email (for both new and existing tickets)
    if (shouldSendEmail && createdTickets.length > 0) {
        try {
          const ticketListHtml = createdTickets.map(ticket => `
            <li>
              <b>Event:</b> ${order.event.name}<br/>
              <b>Venue:</b> ${order.event.venue}<br/>
              <b>Date:</b> ${new Date(order.event.startDate).toLocaleDateString()}<br/>
              <b>Ticket Code:</b> ${ticket.ticketCode}<br/>
              <b>Holder:</b> ${ticket.holderName || order.customerName} (${ticket.holderEmail || order.customerEmail})
            </li>
          `).join('');
          
          // Generate PDFs for each ticket with complete event info
          const attachments = await Promise.all(createdTickets.map(async (ticket, idx) => {
            const ticketData = {
              event: {
                name: order.event.name,
                venue: order.event.venue,
                startDate: order.event.startDate,
                endDate: order.event.endDate,
                description: order.event.description,
                refundDeadline: order.event.refundDeadline,
                refundPolicy: order.event.refundPolicy,
                refundTerms: order.event.refundTerms,
                timezone: order.event.timezone
              },
              ticket: {
                ticketCode: ticket.ticketCode,
                holderName: ticket.holderName || order.customerName,
                holderEmail: ticket.holderEmail || order.customerEmail,
                qrCode: ticket.qrCode,
                id: ticket.id,
                qrCodeToken: ticket.qrCodeToken,
                createdAt: ticket.createdAt
              }
            };
            
            const pdfBuffer = await generateTicketPDF(ticketData);
            return {
              filename: `ticket-${ticket.ticketCode}.pdf`,
              content: pdfBuffer
            };
          }));
          
          // Format refund deadline if it exists
          let refundPolicyHtml = '';
          if (order.event.refundDeadline && order.event.refundPolicy) {
            const refundDeadline = new Date(order.event.refundDeadline);
            const now = new Date();
            
            if (refundDeadline > now) {
              const timeRemaining = Math.ceil((refundDeadline - now) / (1000 * 60 * 60 * 24));
              refundPolicyHtml = `
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #856404; margin-top: 0;">💰 Refund Policy</h3>
                  <p style="color: #856404; margin-bottom: 10px;"><strong>${order.event.refundPolicy}</strong></p>
                  <p style="color: #856404; margin-bottom: 10px;"><strong>⏰ Refund Deadline:</strong> ${refundDeadline.toLocaleString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    timeZoneName: 'short'
                  })}</p>
                  <p style="color: #856404; margin-bottom: 10px;"><strong>⏳ Time Remaining:</strong> ${timeRemaining} day${timeRemaining !== 1 ? 's' : ''}</p>
                  <div style="border-top: 1px solid #ffeaa7; padding-top: 10px; margin-top: 10px;">
                    <p style="color: #856404; margin-bottom: 5px;"><strong>📧 For refund requests, contact:</strong></p>
                    <p style="color: #856404; margin-bottom: 2px;">Email: support@ticketghar.com</p>
                    <p style="color: #856404; margin-bottom: 0;">Phone: +92 300 1234567</p>
                  </div>
                </div>
              `;
            }
          }

          await sendTicketEmail({
            to: order.customerEmail,
            subject: `Your Ticket(s) for ${order.event.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">🎫 Thank you for your purchase!</h2>
                <p>Your tickets for <strong>${order.event.name}</strong> are ready!</p>
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #1e293b; margin-top: 0;">Your Tickets:</h3>
                  <ul style="color: #475569;">${ticketListHtml}</ul>
                </div>
                
                ${refundPolicyHtml}
                
                <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #0369a1; margin-top: 0;">📋 Important Information:</h3>
                  <ul style="color: #0c4a6e;">
                    <li>Please bring your tickets (printed or on your phone) to the event</li>
                    <li>Each ticket has a unique QR code for entry</li>
                    <li>Keep your tickets secure and don't share them</li>
                    <li>Contact support if you have any questions</li>
                  </ul>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  Thank you for choosing Ticket Ghar! We hope you enjoy your event.
                </p>
              </div>
            `,
            attachments
          });
        } catch (emailErr) {
          console.error('Failed to send ticket email:', emailErr);
        }
    }
    
    // Check if user has reached maximum tickets limit for this event
    const { QueueEntry } = require('../models');
    
    // Use the new method to check if user has reached all limits for this event
    const hasReachedAllLimits = await TicketType.hasUserReachedAllEventLimits(order.eventId, order.userId);
    
    // Remove user from queue for this event
    const queueEntry = await QueueEntry.findOne({
      where: {
        eventId: order.eventId,
        userId: order.userId,
        status: ['waiting', 'processing', 'active', 'purchasing']
      }
    });
    
    if (queueEntry) {
      if (hasReachedAllLimits) {
        // User has reached max limit for ALL ticket types - remove from queue permanently
        await queueEntry.update({ 
          status: 'completed', 
          completedAt: new Date(),
          adminNotes: 'Removed from queue - maximum tickets purchased for all ticket types'
        });
        console.log(`✅ User ${order.userId} removed from queue for event ${order.eventId} - maximum tickets limit reached for all ticket types`);
      } else {
        // User can still purchase more tickets - mark as completed for this session but allow rejoining
        await queueEntry.update({ 
          status: 'completed', 
          completedAt: new Date(),
          adminNotes: 'Purchase session completed - user can still purchase more tickets and rejoin queue'
        });
        console.log(`✅ User ${order.userId} completed purchase session for event ${order.eventId} - can still purchase more tickets and rejoin queue`);
      }
    }
    
    // Return updated order details with all includes
    const updatedOrder = await Order.findByPk(id, {
      include: [
        { 
          model: OrderItem, 
          as: 'orderItems', 
          include: [
            { model: TicketType, as: 'ticketType' },
            {
              model: Ticket,
              as: 'tickets',
              include: [
                {
                  model: Event,
                  as: 'event',
                  attributes: ['id', 'name', 'venue', 'startDate', 'endDate', 'description']
                }
              ]
            }
          ]
        },
        { 
          model: Event, 
          as: 'event',
          attributes: ['id', 'name', 'venue', 'startDate', 'endDate', 'description']
        },
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'firstName', 'lastName', 'email'], 
          required: false 
        }
      ]
    });
    
    res.json({
      message: 'Order paid successfully',
      order: updatedOrder.toPublicJSON ? updatedOrder.toPublicJSON() : updatedOrder.toJSON(),
      ticketsGenerated: createdTickets.length
    });
    
  } catch (error) {
    console.error('Pay order error:', error);
    res.status(500).json({
      message: 'Failed to pay for order',
      error: error.message
    });
  }
};