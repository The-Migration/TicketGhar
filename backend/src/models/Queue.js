const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Queue = sequelize.define('Queue', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'events',
        key: 'id'
      }
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    status: {
      type: DataTypes.ENUM('waiting', 'active', 'purchasing', 'completed', 'expired', 'left', 'cancelled'),
      defaultValue: 'waiting',
      allowNull: false
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },

    queueAssignedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    activatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    estimatedWaitTime: {
      type: DataTypes.INTEGER, // in minutes
      allowNull: true
    },
    randomizationScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Random score assigned when waiting room users are converted to queue'
    },
    slotType: {
      type: DataTypes.ENUM('standard', 'emergency'),
      defaultValue: 'standard',
      allowNull: false
    },
    notificationsSent: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'queues',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'event_id']
      },
      {
        fields: ['event_id', 'position']
      },
      {
        fields: ['event_id', 'status']
      },
      {
        fields: ['status', 'expires_at']
      }
    ]
  });

  // Instance methods

  Queue.prototype.convertToQueue = function(position, randomizationScore) {
    this.status = 'waiting';
    this.position = position;
    this.queueAssignedAt = new Date();
    this.randomizationScore = randomizationScore;
    return this.save();
  };

  Queue.prototype.activate = function(slotType = 'standard') {
    this.status = 'active';
    this.slotType = slotType;
    this.activatedAt = new Date();
    // 8 minutes for purchase as per PRD
    this.expiresAt = new Date(Date.now() + 8 * 60 * 1000); 
    return this.save();
  };

  Queue.prototype.extend = function(minutes = 2) {
    if (this.status === 'active') {
      this.expiresAt = new Date(this.expiresAt.getTime() + minutes * 60 * 1000);
      return this.save();
    }
    return Promise.resolve(this);
  };

  Queue.prototype.isExpired = function() {
    return this.expiresAt && new Date() > this.expiresAt;
  };

  Queue.prototype.leave = function() {
    this.status = 'left';
    return this.save();
  };

  Queue.prototype.complete = function() {
    this.status = 'completed';
    return this.save();
  };

  Queue.prototype.expire = function() {
    this.status = 'expired';
    return this.save();
  };

  Queue.prototype.cancel = function() {
    this.status = 'cancelled';
    return this.save();
  };



  Queue.prototype.isInQueue = function() {
    return ['waiting', 'active', 'purchasing'].includes(this.status);
  };

  Queue.prototype.canBeActivated = function() {
    return this.status === 'waiting';
  };

  return Queue;
}; 