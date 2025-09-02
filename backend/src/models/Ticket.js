const { DataTypes } = require('sequelize');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

module.exports = (sequelize) => {
  const Ticket = sequelize.define('Ticket', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderItemId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'order_items',
        key: 'id'
      },
      onDelete: 'CASCADE',
      field: 'order_item_id'
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'events',
        key: 'id'
      },
      field: 'event_id'
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
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'user_id'
    },
    ticketCode: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'ticket_code'
    },
    status: {
      type: DataTypes.ENUM('active', 'used', 'refunded', 'cancelled'),
      allowNull: false,
      defaultValue: 'active'
    },
    qrCodeUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'qr_code_url'
    },
    qrCodeToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'qr_code_token'
    },
    // Ticket holder information
    holderName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'holder_name'
    },
    holderEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'holder_email'
    },
    holderPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'holder_phone'
    },
    // Seat/section information
    seatInfo: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'seat_info'
    },
    // Usage tracking
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'used_at'
    },
    usedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'used_by'
    },
    usedLocation: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'used_location'
    },
    scanCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'scan_count'
    },
    // Transfer tracking
    transferredTo: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'transferred_to'
    },
    transferredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'transferred_at'
    },
    transferredBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'transferred_by'
    },
    transferCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'transfer_code'
    },
    // Cancellation/refund tracking
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'cancelled_at'
    },
    cancelledBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'cancelled_by'
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'cancellation_reason'
    },
    refundedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'refunded_at'
    },
    refundedBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    refundReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    refundAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'refund_amount'
    },
    refundReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'refund_reference'
    },
    // Admin refund management fields
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'admin_notes'
    },
    refundRequestedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'refund_requested_at'
    },
    refundRequestReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'refund_request_reason'
    },
    refundPriority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
      defaultValue: 'normal',
      field: 'refund_priority'
    },
    internalRefundStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'internal_refund_status'
    },
    adminOverride: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'admin_override'
    },
    overrideReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'override_reason'
    },
    // Security and verification
    securityCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'security_code'
    },
    verificationHash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'verification_hash'
    },
    // Delivery information
    deliveryMethod: {
      type: DataTypes.STRING(20),
      defaultValue: 'digital',
      validate: {
        isIn: [['digital', 'email', 'sms', 'physical', 'pickup']]
      },
      field: 'delivery_method'
    },
    deliveryStatus: {
      type: DataTypes.ENUM('pending', 'sent', 'delivered', 'failed', 'bounced'),
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'sent', 'delivered', 'failed', 'bounced']]
      },
      field: 'delivery_status'
    },
    // Download token for one-time access
    downloadToken: {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true,
      field: 'download_token'
    },
    downloadTokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'download_token_expires_at'
    },
    downloadTokenUsed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'download_token_used'
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'delivered_at'
    },
    deliveryAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'delivery_attempts'
    },
    // Special attributes
    isVip: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_vip'
    },
    isAccessible: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_accessible'
    },
    specialRequests: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'special_requests'
    },
    // Admin tracking
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'admin_notes'
    },
    processedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'processed_by'
    },
    // Additional metadata
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
  }, {
    tableName: 'tickets',
    timestamps: true,
    hooks: {
      beforeCreate: (ticket) => {
        // Generate ticket code if not provided
        if (!ticket.ticketCode) {
          ticket.ticketCode = generateTicketCode();
        }
        
        // Generate security code
        if (!ticket.securityCode) {
          ticket.securityCode = generateSecurityCode();
        }
        
        // Generate verification hash
        ticket.verificationHash = generateVerificationHash(ticket.ticketCode, ticket.securityCode);

        if (!ticket.downloadToken) {
          ticket.downloadToken = crypto.randomBytes(32).toString('hex');
        }
      },
      beforeUpdate: (ticket) => {
        // Update verification hash if ticket code or security code changed
        if (ticket.changed('ticketCode') || ticket.changed('securityCode')) {
          ticket.verificationHash = generateVerificationHash(ticket.ticketCode, ticket.securityCode);
        }
        
        // Update timestamps based on status changes
        if (ticket.changed('status')) {
          switch (ticket.status) {
            case 'used':
              ticket.usedAt = new Date();
              ticket.scanCount += 1;
              break;
            case 'cancelled':
              ticket.cancelledAt = new Date();
              break;
            case 'refunded':
              ticket.refundedAt = new Date();
              break;
            case 'transferred':
              ticket.transferredAt = new Date();
              break;
          }
        }
      }
    },
    indexes: [
      {
        unique: true,
        fields: ['ticket_code']
      },
      {
        fields: ['order_item_id']
      },
      {
        fields: ['event_id']
      },
      {
        fields: ['ticket_type_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['holder_email']
      },
      {
        fields: ['verification_hash']
      },
      {
        fields: ['used_at']
      },
      {
        fields: ['transferred_to']
      },
      {
        fields: ['delivery_status']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  // Instance methods
  Ticket.prototype.isValid = function() {
    return this.status === 'active';
  };

  Ticket.prototype.isUsed = function() {
    return this.status === 'used';
  };

  Ticket.prototype.isCancelled = function() {
    return this.status === 'cancelled';
  };

  Ticket.prototype.isRefunded = function() {
    return this.status === 'refunded';
  };

  Ticket.prototype.isTransferred = function() {
    return this.status === 'transferred';
  };

  Ticket.prototype.isExpired = function() {
    return this.status === 'expired';
  };

  Ticket.prototype.canBeUsed = function() {
    return this.isValid() && !this.isExpired();
  };

  Ticket.prototype.canBeTransferred = function() {
    return this.isValid() && !this.isUsed();
  };

  Ticket.prototype.canBeRefunded = function() {
    return this.isValid() && !this.isUsed();
  };

  Ticket.prototype.use = function(userId = null, location = null) {
    if (!this.canBeUsed()) {
      throw new Error('Ticket cannot be used');
    }
    
    this.status = 'used';
    this.usedAt = new Date();
    this.usedBy = userId;
    this.usedLocation = location;
    this.scanCount += 1;
    
    return this.save();
  };

  Ticket.prototype.cancel = function(reason = null, adminId = null) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelledBy = adminId;
    this.cancellationReason = reason;
    
    return this.save();
  };

  Ticket.prototype.refund = function(amount = null, reference = null) {
    this.status = 'refunded';
    this.refundedAt = new Date();
    this.refundAmount = amount;
    this.refundReference = reference;
    
    return this.save();
  };

  Ticket.prototype.transfer = function(newUserId, transferredBy) {
    if (!this.canBeTransferred()) {
      throw new Error('Ticket cannot be transferred');
    }
    
    this.status = 'transferred';
    this.transferredTo = newUserId;
    this.transferredAt = new Date();
    this.transferredBy = transferredBy;
    this.transferCode = generateTransferCode();
    
    return this.save();
  };

  Ticket.prototype.expire = function() {
    this.status = 'expired';
    return this.save();
  };

  Ticket.prototype.updateHolderInfo = function(holderInfo) {
    this.holderName = holderInfo.name;
    this.holderEmail = holderInfo.email;
    this.holderPhone = holderInfo.phone;
    
    return this.save();
  };

  Ticket.prototype.assignSeat = function(seatInfo) {
    this.seatInfo = seatInfo;
    return this.save();
  };

  Ticket.prototype.updateDeliveryStatus = function(status) {
    this.deliveryStatus = status;
    
    if (status === 'delivered') {
      this.deliveredAt = new Date();
    }
    
    return this.save();
  };

  Ticket.prototype.incrementDeliveryAttempts = function() {
    this.deliveryAttempts += 1;
    return this.save();
  };

  Ticket.prototype.markAsVip = function() {
    this.isVip = true;
    return this.save();
  };

  Ticket.prototype.markAsAccessible = function() {
    this.isAccessible = true;
    return this.save();
  };

  Ticket.prototype.addSpecialRequest = function(request) {
    this.specialRequests = this.specialRequests ? 
      `${this.specialRequests}\n${request}` : request;
  };

  // Download token methods
  Ticket.prototype.generateDownloadToken = function() {
    const { generateDownloadToken } = require('./Ticket');
    this.downloadToken = generateDownloadToken();
    this.downloadTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    this.downloadTokenUsed = false;
    return this.save();
  };

  Ticket.prototype.validateDownloadToken = function(token) {
    if (!this.downloadToken || this.downloadToken !== token) {
      return { valid: false, reason: 'Invalid token' };
    }
    
    if (this.downloadTokenUsed) {
      return { valid: false, reason: 'Token already used' };
    }
    
    if (this.downloadTokenExpiresAt && new Date() > this.downloadTokenExpiresAt) {
      return { valid: false, reason: 'Token expired' };
    }
    
    return { valid: true };
  };

  Ticket.prototype.markDownloadTokenAsUsed = function() {
    this.downloadTokenUsed = true;
    return this.save();
  };

  Ticket.prototype.addNote = function(note) {
    this.notes = this.notes ? `${this.notes}\n${note}` : note;
    return this.save();
  };

  Ticket.prototype.addAdminNote = function(note, adminId) {
    this.adminNotes = this.adminNotes ? `${this.adminNotes}\n${note}` : note;
    this.processedBy = adminId;
    return this.save();
  };

  Ticket.prototype.generateUserHash = function() {
    // Generate a hash based on user ID and ticket data for additional security
    const userData = `${this.userId}:${this.ticketCode}:${this.eventId}`;
    return crypto.createHash('sha256').update(userData).digest('hex').substring(0, 16);
  };

  Ticket.prototype.generateQRCode = function() {
    // Check if ticket is already used
    if (this.status === 'used' || this.usedAt) {
      throw new Error('Cannot generate QR code for used ticket');
    }
    
    // Check if QR code already exists
    if (this.qrCodeToken) {
      throw new Error('QR code already exists for this ticket');
    }
    
    // Generate secure QR code data with all required fields
    const qrData = {
      eventId: this.eventId,
      ticketId: this.id,
      ticketCode: this.ticketCode,
      ticketTypeId: this.ticketTypeId,
      userId: this.userId,
      userHash: this.generateUserHash(),
      securityCode: this.securityCode,
      verificationHash: this.verificationHash,
      status: this.status,
      timestamp: new Date().toISOString()
    };
    
    // Create signed JWT token for tamper-proof security
    const jwtSecret = process.env.JWT_SECRET || 'ticket-ghar-secret-key';
    const signedToken = jwt.sign(qrData, jwtSecret, { 
      expiresIn: '1y', // Token expires in 1 year
      issuer: 'ticket-ghar',
      audience: 'ticket-verification'
    });
    
    // Store the signed token (only one QR code per ticket)
    this.qrCodeToken = signedToken;
    
    // Generate QR code URL for API access
    this.qrCodeUrl = `/api/tickets/${this.id}/qr`;
    
    return this.save();
  };

  Ticket.prototype.verifyQRCode = function(qrToken) {
    try {
      // First check if ticket is still valid
      if (this.status !== 'active') {
        console.log(`Ticket ${this.ticketCode} is not active (status: ${this.status})`);
        return false;
      }

      // Check if QR code has already been used
      if (this.usedAt) {
        console.log(`Ticket ${this.ticketCode} has already been used at ${this.usedAt}`);
        return false;
      }

      const jwtSecret = process.env.JWT_SECRET || 'ticket-ghar-secret-key';
      const decoded = jwt.verify(qrToken, jwtSecret, {
        issuer: 'ticket-ghar',
        audience: 'ticket-verification'
      });
      
      // Verify the decoded data matches this ticket
      const isValid = (
        decoded.ticketId === this.id &&
        decoded.ticketCode === this.ticketCode &&
        decoded.eventId === this.eventId &&
        decoded.status === this.status
      );

      if (isValid) {
        // Mark ticket as used immediately after successful verification
        this.status = 'used';
        this.usedAt = new Date();
        this.scanCount = (this.scanCount || 0) + 1;
        return this.save().then(() => true).catch(() => false);
      }

      return false;
    } catch (error) {
      console.error('QR code verification failed:', error);
      return false;
    }
  };

  // New method to check if QR code is still valid (without marking as used)
  Ticket.prototype.isQRCodeValid = function(qrToken) {
    try {
      // Check if ticket is still valid
      if (this.status !== 'active') {
        return false;
      }

      // Check if QR code has already been used
      if (this.usedAt) {
        return false;
      }

      const jwtSecret = process.env.JWT_SECRET || 'ticket-ghar-secret-key';
      const decoded = jwt.verify(qrToken, jwtSecret, {
        issuer: 'ticket-ghar',
        audience: 'ticket-verification'
      });
      
      // Verify the decoded data matches this ticket
      return (
        decoded.ticketId === this.id &&
        decoded.ticketCode === this.ticketCode &&
        decoded.eventId === this.eventId &&
        decoded.status === this.status
      );
    } catch (error) {
      console.error('QR code validation failed:', error);
      return false;
    }
  };

  Ticket.prototype.verify = function(providedCode) {
    const expectedHash = generateVerificationHash(this.ticketCode, providedCode);
    return expectedHash === this.verificationHash;
  };

  Ticket.prototype.getSeatString = function() {
    if (!this.seatInfo) return null;
    
    const { section, row, seat } = this.seatInfo;
    return `Section ${section}, Row ${row}, Seat ${seat}`;
  };

  Ticket.prototype.getFormattedCode = function() {
    // Format ticket code for display (e.g., TKT-1234-5678)
    return this.ticketCode.replace(/(.{3})(.{4})(.{4})/, '$1-$2-$3');
  };

  Ticket.prototype.toPublicJSON = function() {
    // Generate QR code if not already generated
    if (!this.qrCodeToken) {
      this.generateQRCode();
    }
    
    const base = {
      id: this.id,
      ticketCode: this.getFormattedCode(),
      status: this.status,
      holderName: this.holderName,
      holderEmail: this.holderEmail,
      seatInfo: this.seatInfo,
      seatString: this.getSeatString(),
      qrCodeUrl: this.qrCodeUrl,
      qrCodeToken: this.qrCodeToken,
      usedAt: this.usedAt,
      deliveryStatus: this.deliveryStatus,
      deliveredAt: this.deliveredAt,
      isVip: this.isVip,
      isAccessible: this.isAccessible,
      specialRequests: this.specialRequests,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      // Always include event if present
      event: this.event ? (
        typeof this.event === 'object' && this.event !== null && !Array.isArray(this.event)
          ? {
              name: this.event.name,
              venue: this.event.venue,
              startDate: this.event.startDate
            }
          : this.event
      ) : undefined
    };
    return base;
  };

  Ticket.prototype.toQRData = function() {
    // Generate QR code if not already generated
    if (!this.qrCodeToken) {
      this.generateQRCode();
    }
    
    return {
      // Core ticket data
      ticketCode: this.ticketCode,
      eventId: this.eventId,
      ticketId: this.id,
      ticketTypeId: this.ticketTypeId,
      userId: this.userId,
      userHash: this.generateUserHash(),
      
      // Security data
      securityCode: this.securityCode,
      verificationHash: this.verificationHash,
      status: this.status,
      
      // Holder information
      holderName: this.holderName,
      seatInfo: this.seatInfo,
      isVip: this.isVip,
      isAccessible: this.isAccessible,
      
      // Signed token for tamper-proof verification
      signedToken: this.qrCodeToken,
      
      // Timestamp
      timestamp: new Date().toISOString()
    };
  };

  // Class methods
  Ticket.findByCode = function(ticketCode) {
    return this.findOne({ where: { ticketCode } });
  };

  Ticket.findByEvent = function(eventId) {
    return this.findAll({
      where: { eventId },
      order: [['createdAt', 'ASC']]
    });
  };

  Ticket.findByOrderItem = function(orderItemId) {
    return this.findAll({
      where: { orderItemId },
      order: [['createdAt', 'ASC']]
    });
  };

  Ticket.findByUser = function(userId) {
    return this.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
  };

  Ticket.findByHolder = function(holderEmail) {
    return this.findAll({
      where: { holderEmail },
      order: [['createdAt', 'DESC']]
    });
  };

  Ticket.findByStatus = function(status) {
    return this.findAll({
      where: { status },
      order: [['createdAt', 'DESC']]
    });
  };

  Ticket.findUsedTickets = function(eventId = null) {
    const whereClause = { status: 'used' };
    if (eventId) whereClause.eventId = eventId;
    
    return this.findAll({
      where: whereClause,
      order: [['usedAt', 'DESC']]
    });
  };

  Ticket.findValidTickets = function(eventId = null) {
    const whereClause = { status: 'valid' };
    if (eventId) whereClause.eventId = eventId;
    
    return this.findAll({
      where: whereClause,
      order: [['createdAt', 'ASC']]
    });
  };

  Ticket.findExpiredTickets = function() {
    return this.findAll({
      where: { status: 'expired' },
      order: [['createdAt', 'DESC']]
    });
  };

  Ticket.findPendingDelivery = function() {
    return this.findAll({
      where: { deliveryStatus: 'pending' },
      order: [['createdAt', 'ASC']]
    });
  };

  Ticket.findFailedDelivery = function() {
    return this.findAll({
      where: { deliveryStatus: 'failed' },
      order: [['deliveryAttempts', 'DESC']]
    });
  };

  Ticket.getTicketStatistics = async function(eventId = null) {
    const whereClause = eventId ? { eventId } : {};
    
    const stats = await this.findAll({
      where: whereClause,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const result = {
      valid: 0,
      used: 0,
      cancelled: 0,
      refunded: 0,
      transferred: 0,
      expired: 0,
      total: 0
    };

    stats.forEach(stat => {
      result[stat.status] = parseInt(stat.count);
      result.total += parseInt(stat.count);
    });

    return result;
  };

  Ticket.getUsageStatistics = async function(eventId = null) {
    const whereClause = eventId ? { eventId } : {};
    
    const [totalTickets, usedTickets] = await Promise.all([
      this.count({ where: whereClause }),
      this.count({ where: { ...whereClause, status: 'used' } })
    ]);

    const usageRate = totalTickets > 0 ? (usedTickets / totalTickets) * 100 : 0;

    return {
      totalTickets,
      usedTickets,
      usageRate: Math.round(usageRate * 100) / 100
    };
  };

  Ticket.verifyTicketCode = function(ticketCode, securityCode) {
    return this.findOne({
      where: { 
        ticketCode,
        verificationHash: generateVerificationHash(ticketCode, securityCode)
      }
    });
  };

  Ticket.bulkExpire = async function(eventId) {
    const [updatedCount] = await this.update(
      { status: 'expired' },
      { 
        where: { 
          eventId,
          status: 'valid'
        }
      }
    );
    
    return updatedCount;
  };

  // Add refund-related methods
  Ticket.prototype.canRefund = function() {
    if (this.status !== 'active') {
      return { canRefund: false, reason: `Ticket is ${this.status}, cannot refund` };
    }

    const event = this.event;
    if (!event || !event.refundDeadline) {
      return { canRefund: false, reason: 'No refund deadline set for this event' };
    }

    const now = new Date();
    const deadline = new Date(event.refundDeadline);

    if (now > deadline) {
      return { canRefund: false, reason: 'Refund deadline has passed' };
    }

    return { canRefund: true, reason: 'Refund allowed' };
  };

  Ticket.prototype.processRefund = async function(operatorId, reason = null) {
    const refundCheck = this.canRefund();
    if (!refundCheck.canRefund) {
      throw new Error(refundCheck.reason);
    }

    // Update ticket status
    await this.update({
      status: 'refunded',
      refundedAt: new Date(),
      refundedBy: operatorId,
      refundReason: reason
    });

    // Update event's available tickets count
    const event = await this.getEvent();
    if (event) {
      await event.increment('availableTickets');
    }

    return this;
  };

  return Ticket;
};

// Helper functions
function generateTicketCode() {
  return 'TKT-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

function generateSecurityCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function generateVerificationHash(ticketCode, securityCode) {
  return crypto.createHash('sha256')
    .update(`${ticketCode}:${securityCode}`)
    .digest('hex');
}

function generateTransferCode() {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
}

function generateDownloadToken() {
  return crypto.randomBytes(32).toString('hex');
} 