const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Event = sequelize.define('Event', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    organizerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'organizer_id'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    venue: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255]
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
      allowNull: true,
      validate: {
        isDate: true,
        isAfterStartDate(value) {
          if (value && value <= this.startDate) {
            throw new Error('End date must be after start date');
          }
        }
      },
      field: 'end_date'
    },
    timezone: {
      type: DataTypes.STRING(50),
      defaultValue: 'UTC',
      allowNull: false
    },
    coverImageUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isUrl: true
      },
      field: 'cover_image_url'
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'draft',
      allowNull: false,
      validate: {
        isIn: [['draft', 'published', 'cancelled', 'completed', 'postponed']]
      }
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: [1, 50]
      }
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    // Additional fields for comprehensive schema
    slug: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      validate: {
        is: /^[a-z0-9-]+$/
      }
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_public'
    },
    requiresApproval: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'requires_approval'
    },
    ageRestriction: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 99
      },
      field: 'age_restriction'
    },
    dresscode: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    // Event settings
    settings: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        allowPhotography: true,
        allowRecording: false,
        allowRefunds: true,
        refundPolicy: 'standard',
        transferPolicy: 'allowed',
        cancellationPolicy: 'standard'
      }
    },
    // SEO and marketing
    seoTitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'seo_title'
    },
    seoDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'seo_description'
    },
    seoKeywords: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      field: 'seo_keywords'
    },
    // Statistics
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'view_count'
    },
    shareCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'share_count'
    },
    favoriteCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'favorite_count'
    },
    // Legacy fields (to be removed after migration)
    totalTickets: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'total_tickets'
    },
    availableTickets: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'available_tickets'
    },
    ticketPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'ticket_price'
    },
    maxTicketsPerUser: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'max_tickets_per_user'
    },
    ticketSaleStartTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ticket_sale_start_time'
    },
    ticketSaleEndTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ticket_sale_end_time'
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by_id'
    }
  }, {
    tableName: 'events',
    timestamps: true,
    hooks: {
      beforeCreate: (event) => {
        // Generate slug from title if not provided
        if (!event.slug) {
          event.slug = event.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
        }
        
        // Set organizer_id from createdById if not set
        if (!event.organizerId && event.createdById) {
          event.organizerId = event.createdById;
        }
      },
      beforeUpdate: (event) => {
        // Update slug if title changed
        if (event.changed('title') && !event.changed('slug')) {
          event.slug = event.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
        }
      }
    },
    indexes: [
      {
        unique: true,
        fields: ['slug']
      },
      {
        fields: ['organizer_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['category']
      },
      {
        fields: ['start_date']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['view_count']
      },
      {
        fields: ['is_public']
      }
    ]
  });

  // Instance methods
  Event.prototype.isPublished = function() {
    return this.status === 'published';
  };

  Event.prototype.isCancelled = function() {
    return this.status === 'cancelled';
  };

  Event.prototype.isCompleted = function() {
    return this.status === 'completed';
  };

  Event.prototype.isUpcoming = function() {
    return new Date() < this.startDate;
  };

  Event.prototype.isOngoing = function() {
    const now = new Date();
    return now >= this.startDate && (!this.endDate || now <= this.endDate);
  };

  Event.prototype.isPast = function() {
    const endDate = this.endDate || this.startDate;
    return new Date() > endDate;
  };

  Event.prototype.canPurchaseTickets = function() {
    return this.isPublished() && this.isUpcoming() && !this.isCancelled();
  };

  Event.prototype.incrementViewCount = function() {
    this.viewCount += 1;
    return this.save();
  };

  Event.prototype.incrementShareCount = function() {
    this.shareCount += 1;
    return this.save();
  };

  Event.prototype.incrementFavoriteCount = function() {
    this.favoriteCount += 1;
    return this.save();
  };

  Event.prototype.decrementFavoriteCount = function() {
    this.favoriteCount = Math.max(0, this.favoriteCount - 1);
    return this.save();
  };

  Event.prototype.publish = function() {
    this.status = 'published';
    return this.save();
  };

  Event.prototype.cancel = function(reason) {
    this.status = 'cancelled';
    this.metadata = {
      ...this.metadata,
      cancellationReason: reason,
      cancelledAt: new Date()
    };
    return this.save();
  };

  Event.prototype.complete = function() {
    this.status = 'completed';
    this.metadata = {
      ...this.metadata,
      completedAt: new Date()
    };
    return this.save();
  };

  Event.prototype.postpone = function(newDate, reason) {
    this.status = 'postponed';
    this.metadata = {
      ...this.metadata,
      originalStartDate: this.startDate,
      postponementReason: reason,
      postponedAt: new Date()
    };
    this.startDate = newDate;
    return this.save();
  };

  Event.prototype.updateSettings = function(newSettings) {
    this.settings = {
      ...this.settings,
      ...newSettings
    };
    return this.save();
  };

  Event.prototype.getDuration = function() {
    if (!this.endDate) return null;
    return this.endDate.getTime() - this.startDate.getTime();
  };

  Event.prototype.getDurationString = function() {
    const duration = this.getDuration();
    if (!duration) return null;
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  Event.prototype.getUrl = function() {
    return `/events/${this.slug || this.id}`;
  };

  Event.prototype.getAbsoluteUrl = function() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}${this.getUrl()}`;
  };

  Event.prototype.toPublicJSON = function() {
    const values = Object.assign({}, this.get());
    
    // Remove sensitive/internal fields
    delete values.metadata;
    delete values.settings;
    delete values.seoKeywords;
    
    return values;
  };

  Event.prototype.toSEOJSON = function() {
    return {
      title: this.seoTitle || this.title,
      description: this.seoDescription || this.description,
      keywords: this.seoKeywords || [],
      url: this.getAbsoluteUrl(),
      image: this.coverImageUrl,
      startDate: this.startDate,
      endDate: this.endDate,
      venue: this.venue,
      address: this.address
    };
  };

  // Class methods
  Event.findPublished = function() {
    return this.findAll({ where: { status: 'published' } });
  };

  Event.findUpcoming = function() {
    return this.findAll({
      where: {
        status: 'published',
        startDate: {
          [sequelize.Sequelize.Op.gt]: new Date()
        }
      },
      order: [['startDate', 'ASC']]
    });
  };

  Event.findByCategory = function(category) {
    return this.findAll({
      where: { 
        category,
        status: 'published'
      }
    });
  };

  Event.findByOrganizer = function(organizerId) {
    return this.findAll({
      where: { organizerId },
      order: [['createdAt', 'DESC']]
    });
  };

  Event.findBySlug = function(slug) {
    return this.findOne({ where: { slug } });
  };

  Event.search = function(query) {
    return this.findAll({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { title: { [sequelize.Sequelize.Op.iLike]: `%${query}%` } },
          { description: { [sequelize.Sequelize.Op.iLike]: `%${query}%` } },
          { venue: { [sequelize.Sequelize.Op.iLike]: `%${query}%` } },
          { category: { [sequelize.Sequelize.Op.iLike]: `%${query}%` } }
        ],
        status: 'published'
      }
    });
  };

  Event.getPopular = function(limit = 10) {
    return this.findAll({
      where: { status: 'published' },
      order: [['viewCount', 'DESC'], ['favoriteCount', 'DESC']],
      limit
    });
  };

  Event.getStatistics = async function() {
    const [total, published, draft, cancelled, completed] = await Promise.all([
      this.count(),
      this.count({ where: { status: 'published' } }),
      this.count({ where: { status: 'draft' } }),
      this.count({ where: { status: 'cancelled' } }),
      this.count({ where: { status: 'completed' } })
    ]);

    return {
      total,
      published,
      draft,
      cancelled,
      completed
    };
  };

  return Event;
}; 