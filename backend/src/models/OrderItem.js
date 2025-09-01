const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrderItem = sequelize.define('OrderItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id'
      },
      onDelete: 'CASCADE',
      field: 'order_id'
    },
    ticketTypeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'ticket_types',
        key: 'id'
      },
      field: 'ticket_type_id'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      },
      field: 'unit_price'
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      },
      field: 'total_price'
    },
    // Pricing breakdown
    originalUnitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'original_unit_price'
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
      field: 'discount_amount'
    },
    discountType: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['percentage', 'fixed', 'coupon', 'promotion']]
      },
      field: 'discount_type'
    },
    discountCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'discount_code'
    },
    // Fees and taxes
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
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
      field: 'tax_amount'
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
      field: 'tax_rate'
    },
    // Status and tracking
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending',
      allowNull: false,
      validate: {
        isIn: [['pending', 'confirmed', 'cancelled', 'refunded']]
      }
    },
    deliveryStatus: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending',
      allowNull: false,
      validate: {
        isIn: [['pending', 'generated', 'delivered', 'failed']]
      },
      field: 'delivery_status'
    },
    // Seat/section information (for assigned seating)
    seatInfo: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'seat_info'
    },
    // Special instructions or notes
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Refund tracking
    refundedQuantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'refunded_quantity'
    },
    refundedAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      field: 'refunded_amount'
    },
    refundReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'refund_reason'
    },
    refundedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'refunded_at'
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
    },
    // Additional metadata
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'order_items',
    timestamps: true,
    hooks: {
      beforeCreate: (orderItem) => {
        // Calculate total price if not provided
        if (!orderItem.totalPrice) {
          orderItem.totalPrice = orderItem.unitPrice * orderItem.quantity;
        }
        
        // Set original unit price if not provided
        if (!orderItem.originalUnitPrice) {
          orderItem.originalUnitPrice = orderItem.unitPrice;
        }
      },
      beforeUpdate: (orderItem) => {
        // Recalculate total price if quantity or unit price changed
        if (orderItem.changed('quantity') || orderItem.changed('unitPrice')) {
          orderItem.totalPrice = orderItem.unitPrice * orderItem.quantity;
        }
        
        // Update status when refunded
        if (orderItem.changed('refundedQuantity') && orderItem.refundedQuantity > 0) {
          if (orderItem.refundedQuantity >= orderItem.quantity) {
            orderItem.status = 'refunded';
          }
          orderItem.refundedAt = new Date();
        }
      }
    },
    indexes: [
      {
        fields: ['order_id']
      },
      {
        fields: ['ticket_type_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['delivery_status']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['discount_code']
      }
    ]
  });

  // Instance methods
  OrderItem.prototype.isPending = function() {
    return this.status === 'pending';
  };

  OrderItem.prototype.isConfirmed = function() {
    return this.status === 'confirmed';
  };

  OrderItem.prototype.isCancelled = function() {
    return this.status === 'cancelled';
  };

  OrderItem.prototype.isRefunded = function() {
    return this.status === 'refunded';
  };

  OrderItem.prototype.isPartiallyRefunded = function() {
    return this.refundedQuantity > 0 && this.refundedQuantity < this.quantity;
  };

  OrderItem.prototype.isFullyRefunded = function() {
    return this.refundedQuantity >= this.quantity;
  };

  OrderItem.prototype.getAvailableQuantity = function() {
    return this.quantity - this.refundedQuantity;
  };

  OrderItem.prototype.getSubtotal = function() {
    return this.unitPrice * this.quantity;
  };

  OrderItem.prototype.getTotalWithFees = function() {
    return this.totalPrice + this.serviceFee + this.processingFee + this.taxAmount;
  };

  OrderItem.prototype.getNetPrice = function() {
    return this.totalPrice - this.discountAmount;
  };

  OrderItem.prototype.getDiscountPercentage = function() {
    if (!this.originalUnitPrice || this.originalUnitPrice === 0) return 0;
    return ((this.originalUnitPrice - this.unitPrice) / this.originalUnitPrice) * 100;
  };

  OrderItem.prototype.hasDiscount = function() {
    return this.discountAmount > 0;
  };

  OrderItem.prototype.confirm = function() {
    this.status = 'confirmed';
    return this.save();
  };

  OrderItem.prototype.cancel = function(reason = null) {
    this.status = 'cancelled';
    if (reason) {
      this.notes = reason;
    }
    return this.save();
  };

  OrderItem.prototype.refund = function(quantity = null, reason = null, amount = null) {
    const refundQuantity = quantity || this.quantity;
    const refundAmount = amount || (this.unitPrice * refundQuantity);
    
    this.refundedQuantity += refundQuantity;
    this.refundedAmount += refundAmount;
    this.refundReason = reason;
    this.refundedAt = new Date();
    
    // Update status if fully refunded
    if (this.refundedQuantity >= this.quantity) {
      this.status = 'refunded';
    }
    
    return this.save();
  };

  OrderItem.prototype.applyDiscount = function(amount, type = 'fixed', code = null) {
    if (type === 'percentage') {
      this.discountAmount = this.getSubtotal() * (amount / 100);
    } else {
      this.discountAmount = amount;
    }
    
    this.discountType = type;
    this.discountCode = code;
    
    // Recalculate unit price
    this.unitPrice = this.originalUnitPrice - (this.discountAmount / this.quantity);
    this.totalPrice = this.unitPrice * this.quantity;
    
    return this.save();
  };

  OrderItem.prototype.removeDiscount = function() {
    this.discountAmount = 0;
    this.discountType = null;
    this.discountCode = null;
    this.unitPrice = this.originalUnitPrice;
    this.totalPrice = this.unitPrice * this.quantity;
    
    return this.save();
  };

  OrderItem.prototype.addServiceFee = function(amount) {
    this.serviceFee = amount;
    return this.save();
  };

  OrderItem.prototype.addProcessingFee = function(amount) {
    this.processingFee = amount;
    return this.save();
  };

  OrderItem.prototype.addTax = function(rate) {
    this.taxRate = rate;
    this.taxAmount = this.getNetPrice() * rate;
    return this.save();
  };

  OrderItem.prototype.assignSeats = function(seatInfo) {
    this.seatInfo = seatInfo;
    return this.save();
  };

  OrderItem.prototype.updateDeliveryStatus = function(status) {
    this.deliveryStatus = status;
    return this.save();
  };

  OrderItem.prototype.addAdminNote = function(note, adminId) {
    this.adminNotes = this.adminNotes ? `${this.adminNotes}\n${note}` : note;
    this.processedBy = adminId;
    return this.save();
  };

  OrderItem.prototype.getFormattedPrice = function() {
    // Get currency from order if available, otherwise default to USD
    const currency = this.order ? this.order.currency : 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(this.unitPrice);
  };

  OrderItem.prototype.getFormattedTotal = function() {
    // Get currency from order if available, otherwise default to USD
    const currency = this.order ? this.order.currency : 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(this.totalPrice);
  };

  OrderItem.prototype.toReceiptJSON = function() {
    return {
      ticketTypeName: this.TicketType ? this.TicketType.name : 'Unknown',
      quantity: this.quantity,
      unitPrice: this.unitPrice,
      totalPrice: this.totalPrice,
      originalUnitPrice: this.originalUnitPrice,
      discountAmount: this.discountAmount,
      discountType: this.discountType,
      discountCode: this.discountCode,
      serviceFee: this.serviceFee,
      processingFee: this.processingFee,
      taxAmount: this.taxAmount,
      seatInfo: this.seatInfo,
      formattedPrice: this.getFormattedPrice(),
      formattedTotal: this.getFormattedTotal()
    };
  };

  OrderItem.prototype.toPublicJSON = function() {
    const values = Object.assign({}, this.get());
    
    // Remove sensitive fields
    delete values.adminNotes;
    delete values.processedBy;
    delete values.metadata;
    
    // Add computed fields
    values.subtotal = this.getSubtotal();
    values.totalWithFees = this.getTotalWithFees();
    values.netPrice = this.getNetPrice();
    values.discountPercentage = this.getDiscountPercentage();
    values.availableQuantity = this.getAvailableQuantity();
    values.formattedPrice = this.getFormattedPrice();
    values.formattedTotal = this.getFormattedTotal();

    // If tickets are loaded, add event info to each ticket
    if (values.tickets && Array.isArray(values.tickets)) {
      values.tickets = values.tickets.map(ticket => {
        // Try to get event from this.order.event, fallback to this.event
        let eventInfo = null;
        if (this.order && this.order.event) {
          eventInfo = {
            name: this.order.event.name,
            venue: this.order.event.venue,
            startDate: this.order.event.startDate
          };
        } else if (this.event) {
          eventInfo = {
            name: this.event.name,
            venue: this.event.venue,
            startDate: this.event.startDate
          };
        }
        if (!ticket.event && eventInfo) {
          ticket.event = eventInfo;
        }
        return ticket;
      });
    }
    
    return values;
  };

  // Class methods
  OrderItem.findByOrder = function(orderId) {
    return this.findAll({
      where: { orderId },
      order: [['createdAt', 'ASC']]
    });
  };

  OrderItem.findByTicketType = function(ticketTypeId) {
    return this.findAll({
      where: { ticketTypeId },
      order: [['createdAt', 'DESC']]
    });
  };

  OrderItem.findByStatus = function(status) {
    return this.findAll({
      where: { status },
      order: [['createdAt', 'DESC']]
    });
  };

  OrderItem.findByDiscountCode = function(discountCode) {
    return this.findAll({
      where: { discountCode },
      order: [['createdAt', 'DESC']]
    });
  };

  OrderItem.findRefundable = function() {
    return this.findAll({
      where: {
        status: 'confirmed',
        refundedQuantity: {
          [sequelize.Sequelize.Op.lt]: sequelize.Sequelize.col('quantity')
        }
      },
      order: [['createdAt', 'DESC']]
    });
  };

  OrderItem.getItemStatistics = async function(ticketTypeId = null) {
    const whereClause = ticketTypeId ? { ticketTypeId } : {};
    
    const stats = await this.findAll({
      where: whereClause,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.col('total_price')), 'totalRevenue']
      ],
      group: ['status'],
      raw: true
    });

    const result = {
      pending: { count: 0, quantity: 0, revenue: 0 },
      confirmed: { count: 0, quantity: 0, revenue: 0 },
      cancelled: { count: 0, quantity: 0, revenue: 0 },
      refunded: { count: 0, quantity: 0, revenue: 0 },
      total: { count: 0, quantity: 0, revenue: 0 }
    };

    stats.forEach(stat => {
      result[stat.status] = {
        count: parseInt(stat.count),
        quantity: parseInt(stat.totalQuantity),
        revenue: parseFloat(stat.totalRevenue)
      };
      
      result.total.count += parseInt(stat.count);
      result.total.quantity += parseInt(stat.totalQuantity);
      result.total.revenue += parseFloat(stat.totalRevenue);
    });

    return result;
  };

  OrderItem.getTopSellingTicketTypes = async function(limit = 10) {
    const results = await this.findAll({
      where: {
        status: 'confirmed'
      },
      attributes: [
        'ticketTypeId',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalSold'],
        [sequelize.fn('SUM', sequelize.col('total_price')), 'totalRevenue']
      ],
      group: ['ticketTypeId'],
      order: [[sequelize.fn('SUM', sequelize.col('quantity')), 'DESC']],
      limit,
      raw: true
    });

    return results.map(result => ({
      ticketTypeId: result.ticketTypeId,
      totalSold: parseInt(result.totalSold),
      totalRevenue: parseFloat(result.totalRevenue)
    }));
  };

  OrderItem.getDiscountUsage = async function(discountCode = null) {
    const whereClause = discountCode ? { discountCode } : { discountCode: { [sequelize.Sequelize.Op.ne]: null } };
    
    const results = await this.findAll({
      where: whereClause,
      attributes: [
        'discountCode',
        [sequelize.fn('COUNT', sequelize.col('id')), 'usageCount'],
        [sequelize.fn('SUM', sequelize.col('discount_amount')), 'totalDiscount']
      ],
      group: ['discountCode'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      raw: true
    });

    return results.map(result => ({
      discountCode: result.discountCode,
      usageCount: parseInt(result.usageCount),
      totalDiscount: parseFloat(result.totalDiscount)
    }));
  };

  return OrderItem;
}; 