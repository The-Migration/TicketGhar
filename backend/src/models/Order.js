const { DataTypes } = require('sequelize');
const crypto = require('crypto');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'order_number'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'user_id'
    },
    purchaseSessionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'purchase_sessions',
        key: 'id'
      },
      field: 'purchase_session_id'
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending',
      allowNull: false,
      validate: {
        isIn: [['pending', 'paid', 'cancelled', 'refunded', 'failed']]
      }
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      },
      field: 'total_amount'
    },
    commissionAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      field: 'commission_amount'
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
      validate: {
        isUppercase: true,
        len: [3, 3]
      }
    },
    paymentProcessor: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'payment_processor'
    },
    paymentReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'payment_reference'
    },
    // Customer information
    customerEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true
      },
      field: 'customer_email'
    },
    customerName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'customer_name'
    },
    customerPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'customer_phone'
    },
    billingAddress: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'billing_address'
    },
    // Legacy fields (for backwards compatibility)
    eventId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'events',
        key: 'id'
      },
      field: 'event_id'
    },
    queueId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'queues',
        key: 'id'
      },
      field: 'queue_id'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      },
      field: 'unit_price'
    },
    paymentStatus: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['pending', 'authorized', 'captured', 'failed', 'refunded']]
      },
      field: 'payment_status'
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'payment_method'
    },
    paymentIntentId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'payment_intent_id'
    },
    stripeSessionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'stripe_session_id'
    },
    tickets: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at'
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at'
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'cancelled_at'
    },
    refundedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'refunded_at'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    // Additional fields for comprehensive schema
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
      field: 'discount_amount'
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
      field: 'tax_amount'
    },
    serviceFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
      field: 'service_fee'
    },
    processingFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
      field: 'processing_fee'
    },
    // Refund tracking
    refundReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'refund_reason'
    },
    refundedAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'refunded_amount'
    },
    refundReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'refund_reference'
    },
    // Admin tracking
    processedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'processed_by'
    },
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'admin_notes'
    }
  }, {
    tableName: 'orders',
    timestamps: true,
    hooks: {
      beforeCreate: (order) => {
        if (!order.orderNumber) {
          order.orderNumber = generateOrderNumber();
        }
        if (!order.expiresAt) {
          order.expiresAt = new Date(Date.now() + 8 * 60 * 1000); // 8 minutes
        }
      },
      beforeUpdate: (order) => {
        // Update completion time when status changes to paid
        if (order.changed('status') && order.status === 'paid') {
          order.completedAt = new Date();
        }
        
        // Update cancelled time when status changes to cancelled
        if (order.changed('status') && order.status === 'cancelled') {
          order.cancelledAt = new Date();
        }
        
        // Update refunded time when status changes to refunded
        if (order.changed('status') && order.status === 'refunded') {
          order.refundedAt = new Date();
        }
      }
    },
    indexes: [
      {
        unique: true,
        fields: ['order_number']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['purchase_session_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['customer_email']
      },
      {
        fields: ['payment_reference']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['completed_at']
      },
      {
        fields: ['event_id']
      },
      {
        fields: ['payment_processor']
      }
    ]
  });

  // Instance methods
  Order.prototype.isPending = function() {
    return this.status === 'pending';
  };

  Order.prototype.isPaid = function() {
    return this.status === 'paid';
  };

  Order.prototype.isCancelled = function() {
    return this.status === 'cancelled';
  };

  Order.prototype.isRefunded = function() {
    return this.status === 'refunded';
  };

  Order.prototype.isFailed = function() {
    return this.status === 'failed';
  };

  Order.prototype.isExpired = function() {
    return this.expiresAt && new Date() > this.expiresAt;
  };

  Order.prototype.getNetAmount = function() {
    return this.totalAmount - this.commissionAmount;
  };

  Order.prototype.getSubtotal = function() {
    return this.totalAmount - this.taxAmount - this.serviceFee - this.processingFee;
  };

  Order.prototype.getTotalQuantity = function() {
    if (this.quantity) return this.quantity; // Legacy support
    
    if (this.tickets && this.tickets.length > 0) {
      return this.tickets.length;
    }
    
    return 0;
  };

  Order.prototype.generateTickets = async function() {
    const { OrderItem, Ticket, Event, TicketType } = require('./index');
    // Fetch all order items for this order
    const orderItems = await OrderItem.findAll({ where: { orderId: this.id } });
    const eventId = this.eventId;
    const createdTickets = [];
    
    // Calculate total tickets to be created
    const totalTickets = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    
    // Helper function to generate ticket code
    const generateTicketCode = () => {
      return 'TKT-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    };
    
    for (const item of orderItems) {
      for (let i = 0; i < item.quantity; i++) {
        try {
          const ticket = await Ticket.create({
            orderItemId: item.id,
            eventId: eventId,
            ticketTypeId: item.ticketTypeId,
            status: 'valid',
            holderName: this.customerName,
            holderEmail: this.customerEmail,
            holderPhone: this.customerPhone,
            ticketCode: generateTicketCode(),
            downloadToken: crypto.randomBytes(32).toString('hex'),
            downloadTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            downloadTokenUsed: false
          });
          console.log('🎫 Created ticket:', {
            id: ticket.id,
            ticketCode: ticket.ticketCode,
            orderItemId: ticket.orderItemId,
            eventId: ticket.eventId
          });
          createdTickets.push(ticket);
        } catch (err) {
          console.error('Ticket Generation Error:', err);
        }
      }
    }
    
    // Update event's available tickets
    try {
      const event = await Event.findByPk(eventId);
      if (event) {
        const currentAvailable = event.availableTickets || 0;
        await event.update({
          availableTickets: Math.max(0, currentAvailable - totalTickets)
        });
        console.log(`✅ Updated event availableTickets: ${currentAvailable} → ${Math.max(0, currentAvailable - totalTickets)}`);
      }
    } catch (err) {
      console.error('Error updating event available tickets:', err);
    }
    
    // Update ticket type quantities sold
    try {
      for (const item of orderItems) {
        const ticketType = await TicketType.findByPk(item.ticketTypeId);
        if (ticketType) {
          const currentSold = ticketType.quantitySold || 0;
          const newSold = currentSold + item.quantity;
          await ticketType.update({
            quantitySold: newSold
          });
          console.log(`✅ Updated ticket type ${ticketType.name} quantitySold: ${currentSold} → ${newSold}`);
        }
      }
    } catch (err) {
      console.error('Error updating ticket type quantities:', err);
    }
    
    return createdTickets;
  };

  Order.prototype.getTickets = async function() {
    const { OrderItem, Ticket } = require('./index');
    
    // Get all order items for this order
    const orderItems = await OrderItem.findAll({ 
      where: { orderId: this.id },
      include: [
        {
          model: Ticket,
          as: 'tickets',
          attributes: ['id', 'ticketCode', 'status', 'holderName', 'holderEmail', 'createdAt', 'downloadToken', 'downloadTokenUsed']
        }
      ]
    });
    
    // Flatten all tickets from all order items
    const tickets = [];
    for (const item of orderItems) {
      if (item.tickets && item.tickets.length > 0) {
        tickets.push(...item.tickets);
      }
    }
    
    return tickets;
  };

  Order.prototype.markAsPaid = function() {
    this.status = 'paid';
    this.completedAt = new Date();
    this.paymentStatus = 'captured';
    return this.save();
  };

  Order.prototype.cancel = function(reason = null) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    if (reason) {
      this.notes = reason;
    }
    return this.save();
  };

  Order.prototype.refund = function(amount = null, reason = null, reference = null) {
    this.status = 'refunded';
    this.refundedAt = new Date();
    this.refundedAmount = amount || this.totalAmount;
    this.refundReason = reason;
    this.refundReference = reference;
    return this.save();
  };

  Order.prototype.fail = function(reason = null) {
    this.status = 'failed';
    if (reason) {
      this.notes = reason;
    }
    return this.save();
  };

  Order.prototype.extend = function(minutes = 15) {
    this.expiresAt = new Date(Date.now() + minutes * 60 * 1000);
    return this.save();
  };

  Order.prototype.addAdminNote = function(note, adminId) {
    this.adminNotes = this.adminNotes ? `${this.adminNotes}\n${note}` : note;
    this.processedBy = adminId;
    return this.save();
  };

  Order.prototype.calculateCommission = function(rate = 0.05) {
    this.commissionAmount = this.totalAmount * rate;
    return this.save();
  };

  Order.prototype.applyDiscount = function(amount, type = 'fixed') {
    if (type === 'percentage') {
      this.discountAmount = this.totalAmount * (amount / 100);
    } else {
      this.discountAmount = amount;
    }
    
    // Recalculate total amount
    this.totalAmount = this.getSubtotal() + this.taxAmount + this.serviceFee + this.processingFee - this.discountAmount;
    
    return this.save();
  };

  Order.prototype.addServiceFee = function(amount) {
    this.serviceFee = amount;
    this.totalAmount += amount;
    return this.save();
  };

  Order.prototype.addProcessingFee = function(amount) {
    this.processingFee = amount;
    this.totalAmount += amount;
    return this.save();
  };

  Order.prototype.addTax = function(amount) {
    this.taxAmount = amount;
    this.totalAmount += amount;
    return this.save();
  };

  Order.prototype.getCustomerFullName = function() {
    return this.customerName;
  };

  Order.prototype.getFormattedAmount = function() {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency
    }).format(this.totalAmount);
  };

  Order.prototype.getOrderAge = function() {
    return Math.floor((new Date() - this.createdAt) / (1000 * 60)); // in minutes
  };

  Order.prototype.toReceiptJSON = function() {
    return {
      orderNumber: this.orderNumber,
      customerName: this.customerName,
      customerEmail: this.customerEmail,
      totalAmount: this.totalAmount,
      currency: this.currency,
      subtotal: this.getSubtotal(),
      taxAmount: this.taxAmount,
      serviceFee: this.serviceFee,
      processingFee: this.processingFee,
      discountAmount: this.discountAmount,
      status: this.status,
      createdAt: this.createdAt,
      completedAt: this.completedAt,
      tickets: this.tickets,
      quantity: this.getTotalQuantity()
    };
  };

  Order.prototype.toPublicJSON = function() {
    const values = Object.assign({}, this.get());
    
    // Remove sensitive fields
    delete values.adminNotes;
    delete values.processedBy;
    delete values.refundReference;
    delete values.paymentReference;
    delete values.metadata;
    
    // Add computed fields
    values.netAmount = this.getNetAmount();
    values.subtotal = this.getSubtotal();
    values.totalQuantity = this.getTotalQuantity();
    values.formattedAmount = this.getFormattedAmount();
    values.orderAge = this.getOrderAge();
    
    return values;
  };

  // Class methods
  Order.findByOrderNumber = function(orderNumber) {
    return this.findOne({ where: { orderNumber } });
  };

  Order.findByUser = function(userId) {
    return this.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
  };

  Order.findByCustomerEmail = function(email) {
    return this.findAll({
      where: { customerEmail: email },
      order: [['createdAt', 'DESC']]
    });
  };

  Order.findByStatus = function(status) {
    return this.findAll({
      where: { status },
      order: [['createdAt', 'DESC']]
    });
  };

  Order.findExpiredOrders = function() {
    return this.findAll({
      where: {
        status: 'pending',
        expiresAt: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      }
    });
  };

  Order.findRecentOrders = function(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.findAll({
      where: {
        createdAt: {
          [sequelize.Sequelize.Op.gte]: since
        }
      },
      order: [['createdAt', 'DESC']]
    });
  };

  Order.getOrderStatistics = async function(eventId = null) {
    const whereClause = eventId ? { eventId } : {};
    
    const [stats, revenue] = await Promise.all([
      this.findAll({
        where: whereClause,
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      }),
      this.findOne({
        where: {
          ...whereClause,
          status: 'paid'
        },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalRevenue'],
          [sequelize.fn('SUM', sequelize.col('commission_amount')), 'totalCommission']
        ],
        raw: true
      })
    ]);

    const result = {
      pending: 0,
      paid: 0,
      cancelled: 0,
      refunded: 0,
      failed: 0,
      total: 0,
      totalRevenue: parseFloat(revenue.totalRevenue) || 0,
      totalCommission: parseFloat(revenue.totalCommission) || 0
    };

    stats.forEach(stat => {
      result[stat.status] = parseInt(stat.count);
      result.total += parseInt(stat.count);
    });

    return result;
  };

  Order.getRevenueByPeriod = async function(period = 'day', eventId = null) {
    const whereClause = eventId ? { eventId } : {};
    
    let dateFormat;
    switch (period) {
      case 'hour':
        dateFormat = 'YYYY-MM-DD HH24:00:00';
        break;
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'week':
        dateFormat = 'IYYY-IW';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
    }

    const result = await this.findAll({
      where: {
        ...whereClause,
        status: 'paid'
      },
      attributes: [
        [sequelize.fn('TO_CHAR', sequelize.col('created_at'), dateFormat), 'period'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'revenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'orders']
      ],
      group: [sequelize.fn('TO_CHAR', sequelize.col('created_at'), dateFormat)],
      order: [[sequelize.fn('TO_CHAR', sequelize.col('created_at'), dateFormat), 'ASC']],
      raw: true
    });

    return result.map(row => ({
      period: row.period,
      revenue: parseFloat(row.revenue),
      orders: parseInt(row.orders)
    }));
  };

  Order.cleanupExpiredOrders = async function() {
    const expiredOrders = await this.findExpiredOrders();
    
    const updates = expiredOrders.map(order => {
      return order.cancel('Order expired');
    });
    
    await Promise.all(updates);
    return expiredOrders.length;
  };

  return Order;
};

function generateOrderNumber() {
  const prefix = 'TG';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

function generateTicketNumber() {
  const prefix = 'TKT';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

function generateQRCode() {
  return require('crypto').randomBytes(16).toString('hex');
} 