const { Event, User, TicketType, QueueEntry, Order, OrderItem, Ticket } = require('../models');
const { Op } = require('sequelize');

// Create new event with ticket types
exports.createEvent = async (req, res) => {
  try {
    // Check if user exists
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const {
      title,
      description,
      venue,
      address,
      startDate,
      endDate,
      timezone,
      coverImageUrl,
      category,
      tags,
      metadata,
      ticketTypes,
      currency,
      refundDeadline,
      refundPolicy,
      refundTerms
    } = req.body;

    // Validate required fields
    if (!title || !venue || !address || !startDate || !endDate || !category) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['title', 'venue', 'address', 'startDate', 'endDate', 'category']
      });
    }

    // Validate dates
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start <= now) {
      return res.status(400).json({ message: 'Event start time must be in the future' });
    }
    if (end <= start) {
      return res.status(400).json({ message: 'Event end time must be after start time' });
    }

    // Only use image URL
    const imageUrl = coverImageUrl;

    // Prepare event data
    const eventData = {
      name: title,
      description,
      venue,
      address,
      startDate: startDate,
      endDate: endDate,
      timezone: timezone || 'UTC',
      ticketSaleStartTime: ticketTypes && ticketTypes.length > 0 ? ticketTypes[0].saleStartTime : startDate,
      ticketSaleEndTime: ticketTypes && ticketTypes.length > 0 ? ticketTypes[0].saleEndTime : endDate,
      totalTickets: ticketTypes && ticketTypes.length > 0 ? ticketTypes[0].quantityTotal : 100,
      availableTickets: ticketTypes && ticketTypes.length > 0 ? ticketTypes[0].quantityTotal : 100,
      ticketPrice: ticketTypes && ticketTypes.length > 0 ? ticketTypes[0].price : 0,
      currency: currency || 'USD',
      maxTicketsPerUser: ticketTypes && ticketTypes.length > 0 ? ticketTypes[0].maxPerUser : 4,
      imageUrl: imageUrl,
      category,
      tags: tags || [],
      metadata: metadata || {},
      refundDeadline: refundDeadline,
      refundPolicy: refundPolicy,
      refundTerms: refundTerms,
      createdById: req.user.id,
      status: 'draft'
    };

    // Create event - using model field names
    const event = await Event.create(eventData);

    // Create ticket types if provided
    if (ticketTypes && ticketTypes.length > 0) {
      const ticketTypePromises = ticketTypes.map((ticketType, index) => {
        return TicketType.create({
          eventId: event.id,
          name: ticketType.name,
          description: ticketType.description,
          price: ticketType.price,
          quantityTotal: ticketType.quantityTotal,
          maxPerOrder: ticketType.maxPerOrder || 10,
          maxPerUser: ticketType.maxPerUser || 10,
          saleStartTime: ticketType.saleStartTime,
          saleEndTime: ticketType.saleEndTime,
          sortOrder: index,
          status: 'active'
        });
      });

      await Promise.all(ticketTypePromises);
    }

    // Fetch complete event with ticket types
    const completeEvent = await Event.findByPk(event.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email', 'firstName', 'lastName']
        },
        {
          model: TicketType,
          as: 'ticketTypes',
          order: [['sortOrder', 'ASC']]
        }
      ]
    });

    res.status(201).json({
      message: 'Event created successfully',
      event: completeEvent
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      message: 'Failed to create event',
      error: error.message
    });
  }
};

// Get all events with filtering and pagination
exports.getEvents = async (req, res) => {
  try {
    console.log('📊 GET EVENTS DEBUG:');
    console.log('📊 User:', req.user ? { id: req.user.id, email: req.user.email, role: req.user.role } : 'No user');
    console.log('📊 Query params:', req.query);

    const {
      page = 1,
      limit = 10,
      category,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      includeStats = false
    } = req.query;

    const offset = (page - 1) * limit;
    let where = {};

    // Apply filters
    if (category) {
      where.category = category;
    }
    
    // Handle status filtering based on user role
    if (status) {
      where.status = status;
      console.log('📊 Status filter explicitly set to:', status);
    } else {
      // If no status specified, filter based on user role
      // Non-admin users should only see published events
      if (!req.user || req.user.role !== 'admin') {
        where.status = {
          [Op.in]: ['published', 'sale_started', 'sale_ended', 'completed']
        };
        console.log('📊 Non-admin user: filtering to published events only');
      } else {
        console.log('📊 Admin user: showing all events including drafts');
      }
      // Admins can see all events (no status filter applied)
    }
    
    // Additional safety check: if user explicitly requests draft events but is not admin
    if (status === 'draft' && (!req.user || req.user.role !== 'admin')) {
      where.status = {
        [Op.in]: ['published', 'sale_started', 'sale_ended', 'completed']
      };
      console.log('📊 Non-admin tried to access draft events: blocked');
    }
    
    // Filter out past events for non-admin users (events where both sale ended AND event date passed)
    if (!req.user || req.user.role !== 'admin') {
      const now = new Date();
      // Add to existing where conditions instead of overwriting
      const existingConditions = Object.keys(where).length > 0 ? [where] : [];
      where = {
        [Op.and]: [
          ...existingConditions,
          // Either sale hasn't ended OR event hasn't ended
          {
            [Op.or]: [
              { ticketSaleEndTime: { [Op.gt]: now } }, // Sale hasn't ended
              { endDate: { [Op.gt]: now } } // Event hasn't ended
            ]
          }
        ]
      };
      console.log('📊 Non-admin user: filtering out past events (sale ended AND event ended)');
    }
    
    console.log('📊 Final where clause:', JSON.stringify(where, null, 2));
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { venue: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const include = [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'email', 'firstName', 'lastName']
      },
      {
        model: TicketType,
        as: 'ticketTypes',
        order: [['sortOrder', 'ASC']]
      }
    ];

    if (includeStats === 'true') {
      include.push(
        {
          model: QueueEntry,
          as: 'queueEntries',
          attributes: []
        },
        {
          model: Order,
          as: 'orders',
          attributes: []
        }
      );
    }

    const events = await Event.findAndCountAll({
      where,
      include,
              attributes: {
          include: [
            'id', 'name', 'description', 'venue', 'address', 'startDate', 'endDate',
            'ticketSaleStartTime', 'ticketSaleEndTime', 'totalTickets', 'availableTickets',
            'ticketPrice', 'currency', 'timezone', 'maxTicketsPerUser', 'imageUrl', 'category',
            'tags', 'metadata', 'createdById', 'status', 'createdAt', 'updatedAt',
            'concurrentUsers', 'refundDeadline', 'refundPolicy', 'refundTerms'
          ]
        },
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });

    console.log('📊 Found events:', events.rows.length);
    console.log('📊 Event statuses:', events.rows.map(e => `${e.name}: ${e.status}`));

    // Add computed stats if requested
    if (includeStats === 'true') {
      for (const event of events.rows) {
        const stats = await event.getEventStatistics();
        event.dataValues.statistics = stats;
      }
    }

    res.json({
      events: events.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(events.count / limit),
        totalItems: events.count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      message: 'Failed to fetch events',
      error: error.message
    });
  }
};

// Get single event by ID
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const { includeStats = false } = req.query;

    const event = await Event.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'organizer',
          attributes: ['id', 'email', 'firstName', 'lastName']
        },
        {
          model: TicketType,
          as: 'ticketTypes',
          order: [['sortOrder', 'ASC']]
        }
      ],
      attributes: {
        include: [
          'id', 'name', 'description', 'venue', 'address', 'startDate', 'endDate',
          'ticketSaleStartTime', 'ticketSaleEndTime', 'totalTickets', 'availableTickets',
          'ticketPrice', 'currency', 'timezone', 'maxTicketsPerUser', 'imageUrl', 'category',
          'tags', 'metadata', 'createdById', 'status', 'createdAt', 'updatedAt',
          'concurrentUsers', 'refundDeadline', 'refundPolicy', 'refundTerms'
        ]
      }
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if non-admin user is trying to access a draft event
    if (event.status === 'draft' && (!req.user || req.user.role !== 'admin')) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Add statistics if requested
    if (includeStats === 'true') {
      const stats = await event.getEventStatistics();
      event.dataValues.statistics = stats;
    }

    res.json({ event });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      message: 'Failed to fetch event',
      error: error.message
    });
  }
};

// Update event
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is admin or the event creator
    if (req.user.role !== 'admin' && event.createdById !== req.user.id) {
      return res.status(403).json({ message: 'Only administrators or event creators can update events' });
    }

    // Only use image URL if provided
    if (updateData.coverImageUrl) {
      updateData.imageUrl = updateData.coverImageUrl;
    }

    // Validate date updates if provided
    if (updateData.startDate || updateData.endDate) {
      const start = new Date(updateData.startDate || event.startDate);
      const end = new Date(updateData.endDate || event.endDate);
      const now = new Date();

      if (start <= now && updateData.startDate) {
        return res.status(400).json({ message: 'Event start time must be in the future' });
      }
      if (end <= start) {
        return res.status(400).json({ message: 'Event end time must be after start time' });
      }
    }

    // Handle queue entries if sale time is being changed
    if (updateData.ticketSaleStartTime) {
      const newSaleStart = new Date(updateData.ticketSaleStartTime);
      const now = new Date();
      
      // If new sale time is in the future, move queue users back to waiting room
      if (newSaleStart > now) {
        console.log(`🔄 Sale time changed to future time: ${newSaleStart}. Moving queue users back to waiting room.`);
        
        // Find all users currently in queue for this event
        const queueUsers = await QueueEntry.findAll({
          where: {
            eventId: id,
            status: { [Op.in]: ['waiting', 'active', 'purchasing'] }
          }
        });

        if (queueUsers.length > 0) {
          console.log(`🔄 Removing ${queueUsers.length} queue users due to sale time change`);
          
          // Remove all queue users since sale time changed
          await QueueEntry.update({
            status: 'left',
            position: null,
            queueAssignedAt: null,
            randomizationScore: null,
            estimatedWaitTime: null,
            activatedAt: null,
            slotType: null
          }, {
            where: {
              eventId: id,
              status: { [Op.in]: ['waiting', 'active', 'purchasing'] }
            }
          });

          console.log(`✅ Successfully removed ${queueUsers.length} users from queue`);
        }
      } else {
        console.log(`⚠️ New sale time is in the past: ${newSaleStart}. Queue users will remain in queue.`);
      }
    }

    // Update event
    const updateResult = await event.update(updateData);

    // Handle ticket type updates if provided
    if (updateData.ticketTypes && Array.isArray(updateData.ticketTypes)) {
      // Delete existing ticket types
      await TicketType.destroy({ where: { eventId: id } });
      
      // Create new ticket types
      const ticketTypePromises = updateData.ticketTypes.map((ticketType, index) => {
        return TicketType.create({
          eventId: id,
          name: ticketType.name,
          description: ticketType.description,
          price: ticketType.price,
          quantityTotal: ticketType.quantityTotal,
          maxPerOrder: ticketType.maxPerOrder || 10,
          maxPerUser: ticketType.maxPerUser || 10,
          saleStartTime: ticketType.saleStartTime,
          saleEndTime: ticketType.saleEndTime,
          sortOrder: index,
          status: 'active'
        });
      });

      await Promise.all(ticketTypePromises);
    }

    // Fetch updated event with associations
    const updatedEvent = await Event.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email', 'firstName', 'lastName']
        },
        {
          model: TicketType,
          as: 'ticketTypes',
          order: [['sortOrder', 'ASC']]
        }
      ]
    });

    res.json({
      message: 'Event updated successfully',
      event: updatedEvent
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      message: 'Failed to update event',
      error: error.message
    });
  }
};

// Delete event
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is admin - only admins can delete events
    if (req.user.role !== 'admin') {
      console.log('🚫 Delete authorization failed - user is not admin:', {
        currentUser: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        required: 'admin'
      });
      return res.status(403).json({ message: 'Only administrators can delete events' });
    }
    
    console.log('✅ Delete authorization passed - user is admin:', {
      currentUser: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role
    });

    // Check if event has any orders
    const orderCount = await Order.count({ where: { eventId: id } });
    if (orderCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete event with existing orders. Cancel or refund orders first.' 
      });
    }

    // Delete related records manually to avoid foreign key constraint issues
    const { QueueEntry, PurchaseSession, TicketType, Ticket, Queue } = require('../models');
    
    console.log(`🗑️ Deleting related records for event ${id}`);
    
    // Delete queue entries
    const queueEntriesDeleted = await QueueEntry.destroy({ where: { eventId: id } });
    console.log(`🗑️ Deleted ${queueEntriesDeleted} queue entries`);
    
    // Delete queue records
    const queueRecordsDeleted = await Queue.destroy({ where: { eventId: id } });
    console.log(`🗑️ Deleted ${queueRecordsDeleted} queue records`);
    
    // Delete purchase sessions
    const purchaseSessionsDeleted = await PurchaseSession.destroy({ where: { eventId: id } });
    console.log(`🗑️ Deleted ${purchaseSessionsDeleted} purchase sessions`);
    
    // Delete tickets
    const ticketsDeleted = await Ticket.destroy({ where: { eventId: id } });
    console.log(`🗑️ Deleted ${ticketsDeleted} tickets`);
    
    // Delete ticket types
    const ticketTypesDeleted = await TicketType.destroy({ where: { eventId: id } });
    console.log(`🗑️ Deleted ${ticketTypesDeleted} ticket types`);

    // Now delete the event
    await event.destroy();
    console.log(`✅ Event ${id} deleted successfully`);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      message: 'Failed to delete event',
      error: error.message
    });
  }
};

// Publish event
exports.publishEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findByPk(id, {
      include: [
        {
          model: TicketType,
          as: 'ticketTypes'
        }
      ]
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check authorization - only admins can publish events
    if (req.user.role !== 'admin') {
      console.log('📢 Publish authorization failed - user is not admin:', {
        currentUser: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        required: 'admin'
      });
      return res.status(403).json({ message: 'Only administrators can publish events' });
    }

    console.log('📢 Publish authorization passed - user is admin');

    // Validate event is ready for publishing
    if (!event.ticketTypes || event.ticketTypes.length === 0) {
      return res.status(400).json({ message: 'Event must have at least one ticket type to be published' });
    }

    // Check if event dates are valid
    const now = new Date();
    if (event.startDate <= now) {
      return res.status(400).json({ message: 'Cannot publish event that has already started' });
    }

    // Update status
    await event.update({ status: 'published' });

    res.json({
      message: 'Event published successfully',
      event
    });
  } catch (error) {
    console.error('Publish event error:', error);
    res.status(500).json({
      message: 'Failed to publish event',
      error: error.message
    });
  }
};

// Cancel event
exports.cancelEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check authorization - only admins can cancel events
    if (req.user.role !== 'admin') {
      console.log('❌ Cancel authorization failed - user is not admin:', {
        currentUser: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        required: 'admin'
      });
      return res.status(403).json({ message: 'Only administrators can cancel events' });
    }

    console.log('❌ Cancel authorization passed - user is admin');

    // Update status
    await event.update({ 
      status: 'cancelled',
      metadata: {
        ...event.metadata,
        cancellationReason: reason,
        cancelledAt: new Date(),
        cancelledBy: req.user.id
      }
    });

    // TODO: Handle refunds for existing orders
    // TODO: Notify users in queue
    // TODO: Send cancellation emails

    res.json({
      message: 'Event cancelled successfully',
      event
    });
  } catch (error) {
    console.error('Cancel event error:', error);
    res.status(500).json({
      message: 'Failed to cancel event',
      error: error.message
    });
  }
};

// Get event statistics
exports.getEventStatistics = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check authorization - only admins can view event statistics
    if (req.user.role !== 'admin') {
      console.log('📊 Statistics authorization failed - user is not admin:', {
        currentUser: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        required: 'admin'
      });
      return res.status(403).json({ message: 'Only administrators can view event statistics' });
    }

    console.log('📊 Statistics authorization passed - user is admin');

    const stats = await event.getEventStatistics();

    res.json({
      eventId: id,
      statistics: stats
    });
  } catch (error) {
    console.error('Get event statistics error:', error);
    res.status(500).json({
      message: 'Failed to fetch event statistics',
      error: error.message
    });
  }
};

// Get events by user (created events)
exports.getUserEvents = async (req, res) => {
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
      return res.status(403).json({ message: 'Not authorized to view these events' });
    }

    const offset = (page - 1) * limit;
    const where = {
      [Op.or]: [
        { createdById: userId },
        { organizerId: userId }
      ]
    };

    if (status) {
      where.status = status;
    }

    const events = await Event.findAndCountAll({
      where,
      include: [
        {
          model: TicketType,
          as: 'ticketTypes',
          order: [['sortOrder', 'ASC']]
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      events: events.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(events.count / limit),
        totalItems: events.count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get user events error:', error);
    res.status(500).json({
      message: 'Failed to fetch user events',
      error: error.message
    });
  }
};

// Search events
exports.searchEvents = async (req, res) => {
  try {
    const { query, category, location, startDate, endDate, limit = 20 } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const where = {
      status: 'published',
      [Op.or]: [
        { title: { [Op.iLike]: `%${query}%` } },
        { description: { [Op.iLike]: `%${query}%` } },
        { venue: { [Op.iLike]: `%${query}%` } },
        { category: { [Op.iLike]: `%${query}%` } }
      ]
    };

    if (category) {
      where.category = category;
    }
    if (location) {
      where[Op.or].push({ address: { [Op.iLike]: `%${location}%` } });
    }
    if (startDate && endDate) {
      where.startDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const events = await Event.findAll({
      where,
      include: [
        {
          model: TicketType,
          as: 'ticketTypes',
          where: { status: 'active' },
          required: false
        }
      ],
      order: [['startDate', 'ASC']],
      limit: parseInt(limit)
    });

    res.json({
      query,
      results: events,
      count: events.length
    });
  } catch (error) {
    console.error('Search events error:', error);
    res.status(500).json({
      message: 'Failed to search events',
      error: error.message
    });
  }
}; 

// Get event attendees
exports.getEventAttendees = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check authorization - only admins can view event attendees
    if (req.user.role !== 'admin') {
      console.log('👥 Attendees authorization failed - user is not admin:', {
        currentUser: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        required: 'admin'
      });
      return res.status(403).json({ message: 'Only administrators can view event attendees' });
    }

    console.log('👥 Attendees authorization passed - user is admin');

    // Get all tickets for this event with order information
    const tickets = await Ticket.findAll({
      where: { eventId: id },
      include: [
        {
          model: OrderItem,
          as: 'orderItem',
          include: [
            {
              model: Order,
              as: 'order',
              attributes: ['id', 'status', 'totalAmount', 'completedAt', 'customerEmail', 'customerName']
            }
          ]
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'email', 'firstName', 'lastName']
        }
      ]
    });

    // Filter for valid tickets from paid orders
    const validTickets = tickets.filter(ticket => {
      const order = ticket.orderItem?.order;
              return ticket.status === 'active' && 
             order && 
             order.status === 'paid';
    });

    // Convert tickets to attendee format
    const attendees = validTickets.map(ticket => {
      const order = ticket.orderItem?.order;
      const owner = ticket.owner;
      
              // Build name with proper fallbacks
        let name = 'Unknown';
        if (ticket.holderName && ticket.holderName !== 'null null') {
          name = ticket.holderName;
        } else if (owner?.firstName && owner?.lastName && owner.firstName !== 'null' && owner.lastName !== 'null') {
          name = `${owner.firstName} ${owner.lastName}`;
        } else if (owner?.firstName && owner.firstName !== 'null') {
          name = owner.firstName;
        } else if (owner?.lastName && owner.lastName !== 'null') {
          name = owner.lastName;
        } else if (order?.customerName && order.customerName !== 'null null') {
          name = order.customerName;
        } else {
          // Use email as fallback
          name = ticket.holderEmail || owner?.email || order?.customerEmail || 'Unknown';
        }
      
      // Build email with proper fallbacks
      let email = 'Unknown';
      if (ticket.holderEmail) {
        email = ticket.holderEmail;
      } else if (owner?.email) {
        email = owner.email;
      } else if (order?.customerEmail) {
        email = order.customerEmail;
      }
      
      return {
        id: ticket.id,
        name: name,
        email: email,
        phone: ticket.holderPhone || 'N/A',
        ticketNumber: ticket.ticketCode,
        ticketPrice: parseFloat(ticket.orderItem?.unitPrice || '0'),
        purchaseDate: order?.completedAt || ticket.createdAt,
        status: ticket.status,
        orderId: order?.id || 'N/A',
        orderStatus: order?.status || 'N/A',
        usedAt: ticket.usedAt,
        scanCount: ticket.scanCount
      };
    });

    res.json({
      eventId: id,
      eventName: event.name,
      attendees: attendees,
      totalAttendees: attendees.length,
      totalTickets: validTickets.length
    });
  } catch (error) {
    console.error('Get event attendees error:', error);
    res.status(500).json({
      message: 'Failed to fetch event attendees',
      error: error.message
    });
  }
};

// Get ticket types for a specific event
exports.getEventTicketTypes = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if event exists
    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Get ticket types for this event
    const ticketTypes = await TicketType.findAll({
      where: { 
        eventId: id,
        status: 'active'
      },
      order: [['sortOrder', 'ASC']]
    });

    res.json({
      eventId: id,
      eventName: event.name,
      ticketTypes: ticketTypes
    });
  } catch (error) {
    console.error('Get event ticket types error:', error);
    res.status(500).json({
      message: 'Failed to fetch event ticket types',
      error: error.message
    });
  }
};

// Get ticket type statistics for a specific event
exports.getEventTicketTypeStatistics = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if event exists
    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check authorization
    if (event.createdById !== req.user.id && 
        event.organizerId !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view statistics' });
    }

    // Get ticket types for this event
    const ticketTypes = await TicketType.findAll({
      where: { 
        eventId: id
      },
      order: [['sortOrder', 'ASC']]
    });

    // Get statistics for each ticket type
    const ticketTypeStats = await Promise.all(
      ticketTypes.map(async (ticketType) => {
        const stats = await OrderItem.getItemStatistics(ticketType.id);
        
        return {
          ticketTypeId: ticketType.id,
          ticketTypeName: ticketType.name,
          ticketTypePrice: ticketType.price,
          totalQuantity: ticketType.quantityTotal,
          availableQuantity: ticketType.getAvailableQuantity(),
          statistics: stats
        };
      })
    );

    res.json({
      eventId: id,
      eventName: event.name,
      ticketTypeStatistics: ticketTypeStats
    });
  } catch (error) {
    console.error('Get event ticket type statistics error:', error);
    res.status(500).json({
      message: 'Failed to fetch event ticket type statistics',
      error: error.message
    });
  }
}; 

// Get user's remaining ticket allowance for an event
exports.getUserTicketAllowance = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    // Check if event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Get user's remaining allowance for all ticket types in this event
    const { TicketType } = require('../models');
    const allowance = await TicketType.getUserEventRemainingAllowance(eventId, userId);
    
    // Get ticket types with their limits
    const ticketTypes = await TicketType.findAll({
      where: { eventId },
      attributes: ['id', 'name', 'maxPerUser', 'price']
    });

    // Combine ticket type info with allowance
    const result = ticketTypes.map(type => ({
      id: type.id,
      name: type.name,
      maxPerUser: type.maxPerUser,
      price: type.price,
      remainingAllowance: allowance[type.id] || 0,
      canPurchase: allowance[type.id] > 0
    }));

    res.json({
      eventId,
      userId,
      ticketAllowance: result,
      hasReachedAllLimits: Object.values(allowance).every(remaining => remaining === 0)
    });

  } catch (error) {
    console.error('Get user ticket allowance error:', error);
    res.status(500).json({
      message: 'Failed to get ticket allowance',
      error: error.message
    });
  }
}; 

// Update concurrent users setting for an event
exports.updateConcurrentUsers = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { concurrentUsers } = req.body;

    // Validate input
    if (!concurrentUsers || concurrentUsers < 1 || concurrentUsers > 50) {
      return res.status(400).json({
        message: 'Concurrent users must be between 1 and 50'
      });
    }

    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    // Update the concurrent users setting
    await event.update({ concurrentUsers });

    console.log(`🔧 Admin updated concurrent users for event ${eventId} to ${concurrentUsers}`);

    res.json({
      message: 'Concurrent users setting updated successfully',
      event: {
        id: event.id,
        name: event.name,
        concurrentUsers: event.concurrentUsers
      }
    });

  } catch (error) {
    console.error('Error updating concurrent users:', error);
    res.status(500).json({
      message: 'Error updating concurrent users setting'
    });
  }
};

// Get queue processing status for an event
exports.getQueueProcessingStatus = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    // Get current processing count
    const currentlyProcessing = await QueueEntry.count({
      where: {
        eventId,
        status: 'active'
      }
    });

    // Get waiting count
    const waitingCount = await QueueEntry.count({
      where: {
        eventId,
        status: 'waiting'
      }
    });

    // Get completed count
    const completedCount = await QueueEntry.count({
      where: {
        eventId,
        status: 'completed'
      }
    });

    res.json({
      event: {
        id: event.id,
        name: event.name,
        concurrentUsers: event.concurrentUsers
      },
      queueStatus: {
        currentlyProcessing,
        waitingCount,
        completedCount,
        maxConcurrent: event.concurrentUsers,
        availableSlots: Math.max(0, event.concurrentUsers - currentlyProcessing)
      }
    });

  } catch (error) {
    console.error('Error getting queue processing status:', error);
    res.status(500).json({
      message: 'Error getting queue processing status'
    });
  }
}; 