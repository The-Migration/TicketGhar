const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Event = sequelize.define('Event', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 200]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    venue: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 200]
      }
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true,
        isAfter: new Date().toISOString()
      },
      field: 'start_date'
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true,
        isAfterStartDate(value) {
          if (value <= this.startDate) {
            throw new Error('End date must be after start date');
          }
        }
      },
      field: 'end_date'
    },
    ticketSaleStartTime: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true
      }
    },
    ticketSaleEndTime: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true,
        isAfterSaleStart(value) {
          if (value <= this.ticketSaleStartTime) {
            throw new Error('Sale end time must be after sale start time');
          }
        }
      }
    },
    totalTickets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 100000
      }
    },
    availableTickets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    ticketPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
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
    timezone: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'UTC',
      validate: {
        len: [1, 50]
      }
    },
    maxTicketsPerUser: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 4,
      validate: {
        min: 1,
        max: 10
      }
    },
    concurrentUsers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 50
      },
      field: 'concurrent_users'
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'draft',
      allowNull: false
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 50]
      }
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: '[]'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: '{}'
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    // Refund Policy Fields
    refundDeadline: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true,
        isBeforeEventStart(value) {
          if (value && this.startDate && value >= this.startDate) {
            throw new Error('Refund deadline must be before event start date');
          }
        }
      },
      field: 'refund_deadline'
    },
    refundPolicy: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: 'Refunds are available until the refund deadline. After refund, original tickets become invalid and cannot be used for entry.',
      field: 'refund_policy'
    },
    refundTerms: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: '{"allowsRefunds":true,"refundPercentage":100,"processingFee":0,"requiresReason":false,"invalidatesTickets":true}',
      field: 'refund_terms'
    }
  }, {
    tableName: 'events',
    timestamps: true,
    hooks: {
      beforeCreate: (event) => {
        if (!event.availableTickets) {
          event.availableTickets = event.totalTickets;
        }
        // Set default refund deadline to 48 hours before event if not specified
        if (!event.refundDeadline && event.startDate) {
          event.refundDeadline = new Date(event.startDate.getTime() - 48 * 60 * 60 * 1000);
        }
      }
    }
  });

  // Instance methods
  Event.prototype.canPurchaseTickets = function() {
    const now = new Date();
    return (
      this.status === 'sale_started' &&
      now >= this.ticketSaleStartTime &&
      now <= this.ticketSaleEndTime &&
      this.availableTickets > 0
    );
  };

  Event.prototype.reserveTickets = function(quantity) {
    if (this.availableTickets >= quantity) {
      this.availableTickets -= quantity;
      return true;
    }
    return false;
  };

  Event.prototype.releaseTickets = function(quantity) {
    this.availableTickets = Math.min(this.totalTickets, this.availableTickets + quantity);
  };

  // Check if refunds are still allowed for this event
  Event.prototype.canRefund = function() {
    if (!this.refundTerms?.allowsRefunds) {
      return false;
    }
    
    const now = new Date();
    return this.refundDeadline && now <= this.refundDeadline;
  };

  // Get refund deadline as formatted string
  Event.prototype.getRefundDeadlineFormatted = function() {
    if (!this.refundDeadline) {
      return null;
    }
    
    return this.refundDeadline.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get refund deadline as relative time string
  Event.prototype.getRefundDeadlineRelative = function() {
    if (!this.refundDeadline) {
      return null;
    }
    
    const now = new Date();
    const deadline = new Date(this.refundDeadline);
    const diffMs = deadline.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return 'Refund deadline passed';
    }
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`;
    } else {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} remaining`;
    }
  };

  // Get refund deadline formatted in event timezone
  Event.prototype.getRefundDeadlineInEventTimezone = function() {
    if (!this.refundDeadline) {
      return null;
    }
    
    try {
      const deadline = new Date(this.refundDeadline);
      const timezone = this.timezone || 'UTC';
      
      return deadline.toLocaleString('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch (error) {
      // Fallback to UTC if timezone is invalid
      const deadline = new Date(this.refundDeadline);
      return deadline.toLocaleString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    }
  };

  // Get refund deadline formatted in customer's local timezone
  Event.prototype.getRefundDeadlineInLocalTimezone = function() {
    if (!this.refundDeadline) {
      return null;
    }
    
    const deadline = new Date(this.refundDeadline);
    
    return deadline.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  // Calculate refund deadline based on event start time and timezone
  Event.prototype.calculateRefundDeadline = function() {
    if (!this.startDate) {
      return null;
    }
    
    const eventStartDate = new Date(this.startDate);
    const timezone = this.timezone || 'UTC';
    
    // Calculate 48 hours before event start
    const refundDeadline = new Date(eventStartDate.getTime() - (48 * 60 * 60 * 1000));
    
    return refundDeadline;
  };

  // Check if refunds are still allowed with timezone awareness
  Event.prototype.canRefundWithTimezone = function() {
    if (!this.refundTerms?.allowsRefunds) {
      return false;
    }
    
    if (!this.refundDeadline) {
      return false;
    }
    
    const now = new Date();
    const deadline = new Date(this.refundDeadline);
    
    return now <= deadline;
  };

  // Get comprehensive event statistics
  Event.prototype.getEventStatistics = async function() {
    const { Ticket, Order, OrderItem } = require('./index');
    const { Op } = require('sequelize');

    try {
      // Get all tickets for this event
      const allTickets = await Ticket.findAll({
        where: { eventId: this.id },
        include: [
          {
            model: OrderItem,
            as: 'orderItem',
            include: [
              {
                model: Order,
                as: 'order',
                attributes: ['id', 'status', 'totalAmount', 'completedAt']
              }
            ]
          }
        ]
      });

      // Calculate tickets sold (active, valid, or used tickets from paid orders)
      const ticketsSold = allTickets.filter(ticket => {
        const order = ticket.orderItem?.order;
        return (ticket.status === 'active' || ticket.status === 'valid' || ticket.status === 'used') && 
               order && 
               order.status === 'paid';
      }).length;

      // Calculate attendees (tickets that have been used/scanned)
      const attendees = allTickets.filter(ticket => 
        ticket.status === 'used' || ticket.scanCount > 0
      ).length;

      // Calculate total revenue from paid orders
      const paidOrders = allTickets
        .filter(ticket => {
          const order = ticket.orderItem?.order;
          return order && order.status === 'paid';
        })
        .map(ticket => ticket.orderItem?.order)
        .filter((order, index, arr) => 
          arr.findIndex(o => o.id === order.id) === index
        ); // Remove duplicates

      const totalRevenue = paidOrders.reduce((sum, order) => 
        sum + parseFloat(order.totalAmount), 0
      );

      // Calculate queue statistics
      const queueEntries = await this.getQueueEntries();
      const queueStats = {
        total: queueEntries.length,
        waiting: queueEntries.filter(entry => entry.status === 'waiting').length,
        processing: queueEntries.filter(entry => entry.status === 'processing').length,
        completed: queueEntries.filter(entry => entry.status === 'completed').length,
        expired: queueEntries.filter(entry => entry.status === 'expired').length
      };

      // Calculate ticket type breakdown
      const ticketTypeStats = {};
      const ticketTypes = await this.getTicketTypes();
      
      for (const ticketType of ticketTypes) {
        const typeTickets = allTickets.filter(ticket => 
          ticket.ticketTypeId === ticketType.id
        );
        
        ticketTypeStats[ticketType.name] = {
          total: typeTickets.length,
          sold: typeTickets.filter(ticket => {
            const order = ticket.orderItem?.order;
            return (ticket.status === 'active' || ticket.status === 'valid' || ticket.status === 'used') && order && order.status === 'paid';
          }).length,
          used: typeTickets.filter(ticket => 
            ticket.status === 'used' || ticket.scanCount > 0
          ).length
        };
      }

      return {
        eventId: this.id,
        eventName: this.name,
        totalTickets: this.totalTickets,
        availableTickets: this.availableTickets,
        ticketsSold,
        attendees,
        totalRevenue,
        currency: this.currency,
        queueStats,
        ticketTypeStats,
        calculatedAt: new Date()
      };
    } catch (error) {
      console.error('Error calculating event statistics:', error);
      return {
        eventId: this.id,
        eventName: this.name,
        ticketsSold: 0,
        attendees: 0,
        totalRevenue: 0,
        error: error.message
      };
    }
  };

  return Event;
}; 