const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PurchaseSession = sequelize.define('PurchaseSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    queueEntryId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'queue_entries',
        key: 'id'
      },
      field: 'queue_entry_id'
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
    sessionId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'session_id'
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'active',
      allowNull: false,
      validate: {
        isIn: [['active', 'completed', 'abandoned', 'expired', 'cancelled']]
      }
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'started_at'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at'
    },
    slotType: {
      type: DataTypes.STRING(20),
      defaultValue: 'standard',
      allowNull: false,
      validate: {
        isIn: [['standard', 'emergency', 'vip', 'admin']]
      },
      field: 'slot_type'
    },
    // Purchase details
    eventId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'events',
        key: 'id'
      },
      field: 'event_id'
    },
    selectedTickets: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      field: 'selected_tickets'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'total_amount'
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
      allowNull: false
    },
    // Payment tracking
    paymentIntentId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'payment_intent_id'
    },
    paymentStatus: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['pending', 'processing', 'succeeded', 'failed', 'cancelled']]
      },
      field: 'payment_status'
    },
    // Customer information
    customerInfo: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'customer_info'
    },
    billingAddress: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'billing_address'
    },
    // Session tracking
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent'
    },
    deviceFingerprint: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'device_fingerprint'
    },
    // Activity tracking
    lastActivity: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_activity'
    },
    stepProgress: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 5
      },
      field: 'step_progress'
    },
    stepData: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      field: 'step_data'
    },
    // Warnings and notifications
    warnings: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    notifications: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    // Extension tracking
    extensionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'extension_count'
    },
    maxExtensions: {
      type: DataTypes.INTEGER,
      defaultValue: 2,
      field: 'max_extensions'
    },
    // Admin tracking
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'admin_notes'
    },
    createdByAdmin: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'created_by_admin'
    },
    // Additional metadata
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'purchase_sessions',
    timestamps: true,
    hooks: {
      beforeCreate: (session) => {
        // Set default expiration time (8 minutes)
        if (!session.expiresAt) {
          session.expiresAt = new Date(Date.now() + 8 * 60 * 1000);
        }
        
        // Set last activity
        session.lastActivity = new Date();
      },
      beforeUpdate: (session) => {
        // Update last activity on any change
        session.lastActivity = new Date();
        
        // Mark as completed if status changes to completed
        if (session.changed('status') && session.status === 'completed') {
          session.completedAt = new Date();
        }
      }
    },
    indexes: [
      {
        unique: true,
        fields: ['session_id']
      },
      {
        fields: ['queue_entry_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['event_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['expires_at']
      },
      {
        fields: ['started_at']
      },
      {
        fields: ['last_activity']
      },
      {
        fields: ['payment_intent_id']
      },
      {
        fields: ['device_fingerprint']
      }
    ]
  });

  // Instance methods
  PurchaseSession.prototype.isActive = function() {
    return this.status === 'active';
  };

  PurchaseSession.prototype.isExpired = function() {
    return new Date() > this.expiresAt;
  };

  PurchaseSession.prototype.isCompleted = function() {
    return this.status === 'completed';
  };

  PurchaseSession.prototype.getRemainingTime = function() {
    const remaining = Math.floor((this.expiresAt - new Date()) / 1000);
    return Math.max(0, remaining);
  };

  PurchaseSession.prototype.getRemainingTimeString = function() {
    const remaining = this.getRemainingTime();
    
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  PurchaseSession.prototype.extend = function(minutes = 2) {
    if (this.extensionCount >= this.maxExtensions) {
      throw new Error('Maximum extensions reached');
    }
    
    if (this.status !== 'active') {
      throw new Error('Can only extend active sessions');
    }
    
    this.expiresAt = new Date(this.expiresAt.getTime() + minutes * 60 * 1000);
    this.extensionCount += 1;
    this.lastActivity = new Date();
    
    return this.save();
  };

  PurchaseSession.prototype.updateActivity = function() {
    this.lastActivity = new Date();
    return this.save();
  };

  PurchaseSession.prototype.updateProgress = function(step, data = {}) {
    this.stepProgress = step;
    this.stepData = {
      ...this.stepData,
      [`step_${step}`]: {
        ...data,
        timestamp: new Date()
      }
    };
    this.lastActivity = new Date();
    
    return this.save();
  };

  PurchaseSession.prototype.addSelectedTickets = function(tickets) {
    this.selectedTickets = tickets;
    this.totalAmount = tickets.reduce((sum, ticket) => {
      return sum + (ticket.price * ticket.quantity);
    }, 0);
    this.lastActivity = new Date();
    
    return this.save();
  };

  PurchaseSession.prototype.updateCustomerInfo = function(customerInfo) {
    this.customerInfo = {
      ...this.customerInfo,
      ...customerInfo
    };
    this.lastActivity = new Date();
    
    return this.save();
  };

  PurchaseSession.prototype.updateBillingAddress = function(billingAddress) {
    this.billingAddress = billingAddress;
    this.lastActivity = new Date();
    
    return this.save();
  };

  PurchaseSession.prototype.setPaymentIntent = function(paymentIntentId) {
    this.paymentIntentId = paymentIntentId;
    this.paymentStatus = 'pending';
    this.lastActivity = new Date();
    
    return this.save();
  };

  PurchaseSession.prototype.updatePaymentStatus = function(status) {
    this.paymentStatus = status;
    this.lastActivity = new Date();
    
    // Complete session if payment succeeded
    if (status === 'succeeded') {
      this.status = 'completed';
      this.completedAt = new Date();
    }
    
    return this.save();
  };

  PurchaseSession.prototype.abandon = function() {
    this.status = 'abandoned';
    return this.save();
  };

  PurchaseSession.prototype.cancel = function() {
    this.status = 'cancelled';
    return this.save();
  };

  PurchaseSession.prototype.expire = function() {
    this.status = 'expired';
    return this.save();
  };

  PurchaseSession.prototype.complete = function() {
    this.status = 'completed';
    this.completedAt = new Date();
    return this.save();
  };

  PurchaseSession.prototype.addWarning = function(type, message) {
    const warning = {
      type,
      message,
      timestamp: new Date(),
      id: require('crypto').randomUUID()
    };
    
    this.warnings = [...(this.warnings || []), warning];
    return this.save();
  };

  PurchaseSession.prototype.addNotification = function(type, message) {
    const notification = {
      type,
      message,
      timestamp: new Date(),
      id: require('crypto').randomUUID()
    };
    
    this.notifications = [...(this.notifications || []), notification];
    return this.save();
  };

  PurchaseSession.prototype.clearWarnings = function() {
    this.warnings = [];
    return this.save();
  };

  PurchaseSession.prototype.getTotalQuantity = function() {
    if (!this.selectedTickets) return 0;
    return this.selectedTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
  };

  PurchaseSession.prototype.getSessionDuration = function() {
    const endTime = this.completedAt || new Date();
    return Math.floor((endTime - this.startedAt) / 1000);
  };

  PurchaseSession.prototype.toPublicJSON = function() {
    return {
      id: this.id,
      sessionId: this.sessionId,
      status: this.status,
      startedAt: this.startedAt,
      expiresAt: this.expiresAt,
      remainingTime: this.getRemainingTime(),
      remainingTimeString: this.getRemainingTimeString(),
      stepProgress: this.stepProgress,
      selectedTickets: this.selectedTickets,
      totalAmount: this.totalAmount,
      currency: this.currency,
      paymentStatus: this.paymentStatus,
      extensionCount: this.extensionCount,
      maxExtensions: this.maxExtensions,
      warnings: this.warnings,
      notifications: this.notifications,
      slotType: this.slotType
    };
  };

  // Class methods
  PurchaseSession.findBySessionId = function(sessionId) {
    return this.findOne({ where: { sessionId } });
  };

  PurchaseSession.findActiveByUser = function(userId) {
    return this.findAll({
      where: {
        userId,
        status: 'active'
      },
      order: [['startedAt', 'DESC']]
    });
  };

  PurchaseSession.findExpiredSessions = function() {
    return this.findAll({
      where: {
        status: 'active',
        expiresAt: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      }
    });
  };

  PurchaseSession.findByEvent = function(eventId) {
    return this.findAll({
      where: { eventId },
      order: [['startedAt', 'DESC']]
    });
  };

  PurchaseSession.findByDeviceFingerprint = function(fingerprint) {
    return this.findAll({
      where: { deviceFingerprint: fingerprint },
      order: [['startedAt', 'DESC']]
    });
  };

  PurchaseSession.getSessionStats = async function(eventId = null) {
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
      active: 0,
      completed: 0,
      abandoned: 0,
      expired: 0,
      cancelled: 0,
      total: 0
    };

    stats.forEach(stat => {
      result[stat.status] = parseInt(stat.count);
      result.total += parseInt(stat.count);
    });

    return result;
  };

  PurchaseSession.getAverageSessionDuration = async function(eventId = null) {
    const whereClause = eventId ? { eventId } : {};
    
    const result = await this.findAll({
      where: {
        ...whereClause,
        status: 'completed'
      },
      attributes: [
        [sequelize.fn('AVG', 
          sequelize.literal('EXTRACT(EPOCH FROM (completed_at - started_at))')), 
          'averageDuration']
      ],
      raw: true
    });

    return Math.round(parseFloat(result[0].averageDuration) || 0);
  };

  PurchaseSession.getConversionRate = async function(eventId = null) {
    const stats = await this.getSessionStats(eventId);
    
    if (stats.total === 0) return 0;
    
    return Math.round((stats.completed / stats.total) * 100);
  };

  PurchaseSession.cleanupExpiredSessions = async function() {
    const expiredSessions = await this.findExpiredSessions();
    
    const updates = expiredSessions.map(async session => {
      // Mark the session as expired
      await session.expire();
      
      // Also expire the associated queue entry if it exists and is still processing
      if (session.queueEntryId) {
        const { QueueEntry } = require('./index');
        const queueEntry = await QueueEntry.findByPk(session.queueEntryId);
        if (queueEntry && queueEntry.status === 'processing') {
          await queueEntry.expire();
        }
      }
    });
    
    await Promise.all(updates);
    return expiredSessions.length;
  };

  return PurchaseSession;
}; 