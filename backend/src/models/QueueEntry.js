const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const QueueEntry = sequelize.define('QueueEntry', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'events',
        key: 'id'
      },
      onDelete: 'CASCADE',
      field: 'event_id'
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
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'waiting',
      allowNull: false,
      validate: {
        isIn: [['waiting_room', 'waiting', 'active', 'processing', 'completed', 'abandoned', 'expired', 'cancelled', 'left']]
      }
    },
    enteredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'entered_at'
    },
    processingStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'processing_started_at'
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at'
    },
    estimatedWaitSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'estimated_wait_seconds'
    },
    isPriority: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_priority'
    },
    source: {
      type: DataTypes.STRING(20),
      defaultValue: 'standard',
      allowNull: false,
      validate: {
        isIn: [['standard', 'emergency', 'admin', 'vip']]
      }
    },
    clientInfo: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'client_info'
    },
    // Additional fields for enhanced queue management
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
    referrer: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Queue progression tracking
    waitingRoomEnteredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'waiting_room_entered_at'
    },
    queueJoinedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'queue_joined_at'
    },
    processingExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'processing_expires_at'
    },
    // Admin controls
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'admin_notes'
    },
    adminUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'admin_user_id'
    },
    // Notifications
    notificationsSent: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      field: 'notifications_sent'
    },
    lastNotificationAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_notification_at'
    },
    // Performance metrics
    totalWaitTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'total_wait_time'
    },
    processingTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'processing_time'
    },
    // Additional metadata
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'queue_entries',
    timestamps: true,
    hooks: {
      beforeCreate: (queueEntry) => {
        // Set waiting room entered time if not provided
        if (!queueEntry.waitingRoomEnteredAt) {
          queueEntry.waitingRoomEnteredAt = queueEntry.enteredAt;
        }
      },
      beforeUpdate: (queueEntry) => {
        // Calculate total wait time when processing starts
        if (queueEntry.changed('status') && queueEntry.status === 'processing') {
          queueEntry.processingStartedAt = new Date();
          queueEntry.totalWaitTime = Math.floor(
            (queueEntry.processingStartedAt - queueEntry.enteredAt) / 1000
          );
          
          // Set processing expiration (8 minutes as per PRD)
          queueEntry.processingExpiresAt = new Date(
            queueEntry.processingStartedAt.getTime() + 8 * 60 * 1000
          );

          // Send email notification when user's turn to purchase has started
          try {
            const emailService = require('../services/emailService');
            const { Event, User } = require('./index');

            Promise.all([
              Event.findByPk(queueEntry.eventId),
              User.findByPk(queueEntry.userId)
            ]).then(([event, user]) => {
              if (event && user) {
                // Estimate wait time based on position and concurrent users
                const estimatedWaitMinutes = Math.ceil(queueEntry.position / (event.concurrentUsers || 1));

                emailService.sendQueueTurnNotification(
                  user.email,
                  event.name,
                  queueEntry.position,
                  estimatedWaitMinutes
                );
              }
            }).catch(error => {
              console.error('Failed to send queue turn email notification:', error);
            });
          } catch (error) {
            console.error('Failed to send queue turn email notification:', error);
          }
        }
        
        // Calculate processing time when completed
        if (queueEntry.changed('status') && queueEntry.status === 'completed') {
          queueEntry.completedAt = new Date();
          if (queueEntry.processingStartedAt) {
            queueEntry.processingTime = Math.floor(
              (queueEntry.completedAt - queueEntry.processingStartedAt) / 1000
            );
          }
        }


      }
    },
    indexes: [
      {
        unique: true,
        fields: ['event_id', 'user_id']
      },
      {
        fields: ['event_id', 'position']
      },
      {
        fields: ['event_id', 'status']
      },
      {
        fields: ['status', 'processing_expires_at']
      },
      {
        fields: ['session_id']
      },
      {
        fields: ['ip_address']
      },
      {
        fields: ['device_fingerprint']
      },
      {
        fields: ['entered_at']
      },
      {
        fields: ['is_priority']
      },
      {
        fields: ['source']
      }
    ]
  });

  // Instance methods
  QueueEntry.prototype.isWaiting = function() {
    return this.status === 'waiting';
  };

  QueueEntry.prototype.isProcessing = function() {
    return this.status === 'processing';
  };

  QueueEntry.prototype.isCompleted = function() {
    return this.status === 'completed';
  };

  QueueEntry.prototype.isExpired = function() {
    if (!this.processingExpiresAt) return false;
    return new Date() > this.processingExpiresAt;
  };

  QueueEntry.prototype.getWaitTime = function() {
    if (this.totalWaitTime) return this.totalWaitTime;
    
    const endTime = this.processingStartedAt || new Date();
    return Math.floor((endTime - this.enteredAt) / 1000);
  };

  QueueEntry.prototype.getProcessingTime = function() {
    if (this.processingTime) return this.processingTime;
    
    if (!this.processingStartedAt) return 0;
    
    const endTime = this.completedAt || new Date();
    return Math.floor((endTime - this.processingStartedAt) / 1000);
  };

  QueueEntry.prototype.getRemainingProcessingTime = function() {
    if (!this.processingExpiresAt) return 0;
    
    const remaining = Math.floor((this.processingExpiresAt - new Date()) / 1000);
    return Math.max(0, remaining);
  };

  QueueEntry.prototype.startProcessing = function() {
    this.status = 'processing';
    this.processingStartedAt = new Date();
    this.processingExpiresAt = new Date(Date.now() + 8 * 60 * 1000); // 8 minutes
    return this.save();
  };

  QueueEntry.prototype.complete = function() {
    this.status = 'completed';
    this.completedAt = new Date();
    return this.save();
  };

  QueueEntry.prototype.abandon = function() {
    this.status = 'abandoned';
    return this.save();
  };

  QueueEntry.prototype.expire = function() {
    this.status = 'expired';
    return this.save();
  };

  QueueEntry.prototype.cancel = function() {
    this.status = 'cancelled';
    return this.save();
  };

  QueueEntry.prototype.extendProcessingTime = function(minutes = 2) {
    if (this.status !== 'processing') {
      throw new Error('Can only extend processing time for entries in processing status');
    }
    
    this.processingExpiresAt = new Date(
      this.processingExpiresAt.getTime() + minutes * 60 * 1000
    );
    return this.save();
  };

  QueueEntry.prototype.updatePosition = function(newPosition) {
    this.position = newPosition;
    return this.save();
  };

  QueueEntry.prototype.updateEstimatedWait = function(seconds) {
    this.estimatedWaitSeconds = seconds;
    return this.save();
  };

  QueueEntry.prototype.addNotification = function(type, message) {
    const notification = {
      type,
      message,
      timestamp: new Date(),
      id: require('crypto').randomUUID()
    };
    
    this.notificationsSent = [...(this.notificationsSent || []), notification];
    this.lastNotificationAt = new Date();
    return this.save();
  };

  QueueEntry.prototype.markAsPriority = function(adminUserId, reason) {
    this.isPriority = true;
    this.adminUserId = adminUserId;
    this.adminNotes = reason;
    return this.save();
  };

  QueueEntry.prototype.removePriority = function() {
    this.isPriority = false;
    return this.save();
  };

  QueueEntry.prototype.updateClientInfo = function(clientInfo) {
    this.clientInfo = {
      ...this.clientInfo,
      ...clientInfo,
      lastUpdated: new Date()
    };
    return this.save();
  };

  QueueEntry.prototype.getEstimatedWaitString = function() {
    if (!this.estimatedWaitSeconds) return null;
    
    const minutes = Math.floor(this.estimatedWaitSeconds / 60);
    const seconds = this.estimatedWaitSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  QueueEntry.prototype.toPublicJSON = function() {
    return {
      id: this.id,
      position: this.position,
      status: this.status,
      enteredAt: this.enteredAt,
      estimatedWaitSeconds: this.estimatedWaitSeconds,
      estimatedWaitString: this.getEstimatedWaitString(),
      isPriority: this.isPriority,
      source: this.source,
      processingExpiresAt: this.processingExpiresAt,
      remainingProcessingTime: this.getRemainingProcessingTime(),
      waitTime: this.getWaitTime(),
      processingTime: this.getProcessingTime()
    };
  };

  // Class methods
  QueueEntry.findByEvent = function(eventId) {
    return this.findAll({
      where: { eventId },
      order: [['position', 'ASC']]
    });
  };

  QueueEntry.findWaitingByEvent = function(eventId) {
    return this.findAll({
      where: { 
        eventId,
        status: 'waiting'
      },
      order: [['isPriority', 'DESC'], ['position', 'ASC']]
    });
  };

  QueueEntry.findProcessingByEvent = function(eventId) {
    return this.findAll({
      where: { 
        eventId,
        status: 'processing'
      },
      order: [['processingStartedAt', 'ASC']]
    });
  };

  QueueEntry.findExpiredEntries = function() {
    return this.findAll({
      where: {
        status: 'processing',
        processingExpiresAt: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      }
    });
  };

  QueueEntry.findByUser = function(userId) {
    return this.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
  };

  QueueEntry.findBySession = function(sessionId) {
    return this.findOne({
      where: { sessionId },
      order: [['createdAt', 'DESC']]
    });
  };

  QueueEntry.findByDeviceFingerprint = function(fingerprint) {
    return this.findAll({
      where: { deviceFingerprint: fingerprint },
      order: [['createdAt', 'DESC']]
    });
  };

  QueueEntry.getQueueStatsByEvent = async function(eventId) {
    const stats = await this.findAll({
      where: { eventId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const result = {
      waiting: 0,
      processing: 0,
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

  QueueEntry.getAverageWaitTime = async function(eventId) {
    const result = await this.findOne({
      where: { 
        eventId,
        totalWaitTime: {
          [sequelize.Sequelize.Op.ne]: null
        }
      },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('total_wait_time')), 'averageWaitTime']
      ],
      raw: true
    });

    return Math.round(parseFloat(result.averageWaitTime) || 0);
  };

  QueueEntry.getAverageProcessingTime = async function(eventId) {
    const result = await this.findOne({
      where: { 
        eventId,
        processingTime: {
          [sequelize.Sequelize.Op.ne]: null
        }
      },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('processing_time')), 'averageProcessingTime']
      ],
      raw: true
    });

    return Math.round(parseFloat(result.averageProcessingTime) || 0);
  };

  QueueEntry.getNextPosition = async function(eventId) {
    const result = await this.findOne({
      where: { 
        eventId,
        status: { [sequelize.Sequelize.Op.in]: ['waiting', 'active', 'processing'] }
      },
      attributes: [
        [sequelize.fn('MAX', sequelize.col('position')), 'maxPosition']
      ],
      raw: true
    });

    return (parseInt(result.maxPosition) || 0) + 1;
  };

  QueueEntry.reorderPositions = async function(eventId) {
    const entries = await this.findAll({
      where: { 
        eventId,
        status: 'waiting'
      },
      order: [['isPriority', 'DESC'], ['enteredAt', 'ASC']]
    });

    const updates = entries.map((entry, index) => {
      return entry.update({ position: index + 1 });
    });

    await Promise.all(updates);
    return entries.length;
  };

  return QueueEntry;
}; 