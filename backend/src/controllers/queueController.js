const { QueueEntry, Event, User, PurchaseSession, sequelize } = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');


// Join queue for an event
exports.joinQueue = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;
    const sessionId = req.sessionID || req.headers['x-session-id'] || uuidv4();

    console.log(`📝 JOIN QUEUE DEBUG - User ${userId} trying to join event ${eventId}`);

    // Check if event exists
    const event = await Event.findByPk(eventId, { transaction });
    if (!event) {
      console.log(`❌ Event ${eventId} not found`);
      await transaction.rollback();
      return res.status(404).json({ message: 'Event not found' });
    }

    console.log(`✅ Event ${eventId} found: ${event.name}, status: ${event.status}`);

    // Check if event is in a valid state for joining queues
    const invalidStatuses = ['cancelled', 'completed'];
    if (invalidStatuses.includes(event.status)) {
      console.log(`❌ Cannot join queue for event ${eventId} with status: ${event.status}`);
      await transaction.rollback();
      return res.status(400).json({ 
        message: `Cannot join queue for ${event.status} event`,
        eventStatus: event.status
      });
    }

    // Check if event has available ticket types
    const { TicketType } = require('../models');
    const availableTicketTypes = await TicketType.findAvailableByEvent(eventId);
    if (availableTicketTypes.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        message: 'No available ticket types for this event'
      });
    }

    console.log(`✅ Event ${eventId} has ${availableTicketTypes.length} available ticket types`);

    // Check if user has already reached their purchase limits for all ticket types
    if (userId) {
      const hasReachedAllLimits = await TicketType.hasUserReachedAllEventLimits(eventId, userId);
      if (hasReachedAllLimits) {
        await transaction.rollback();
        return res.status(400).json({
          message: 'You have already reached the maximum ticket purchase limit for this event',
          errorType: 'PURCHASE_LIMIT_REACHED',
          details: 'You cannot purchase more tickets as you have reached the limit set by the admin'
        });
      }
    }

    // Check if sale has started
    const now = new Date();
    const saleStart = new Date(event.ticketSaleStartTime);
    const saleStarted = now >= saleStart;

    // Only allow joining the queue if the sale has started
    if (!saleStarted) {
      await transaction.rollback();
      return res.status(403).json({
        message: 'You cannot join the queue directly before the sale starts. Please join the waiting room.'
      });
    }

    // Check if user is already in queue for this event (only active entries)
    const existingEntry = await QueueEntry.findOne({
      where: {
        eventId,
        userId,
        status: { [Op.in]: ['waiting', 'active', 'processing'] }
      },
      transaction
    });

    if (existingEntry) {
      console.log(`⏭️ User ${userId} already in queue for event ${eventId}`);
      await transaction.rollback();
      return res.json({
        message: 'Already in queue for this event',
        queue: existingEntry.toPublicJSON()
      });
    }

    // Check if user has expired or abandoned entries and clean them up
    const existingEntries = await QueueEntry.findAll({
      where: {
        eventId,
        userId
      },
      transaction
    });

    if (existingEntries.length > 0) {
      console.log(`🧹 Cleaning up ${existingEntries.length} existing entries for user ${userId} in event ${eventId}`);
      for (const entry of existingEntries) {
        await entry.destroy({ transaction });
      }
    }

    // Get next position in queue (count of active entries + 1)
    const activeEntriesCount = await QueueEntry.count({
      where: { 
        eventId,
        status: { [Op.in]: ['waiting', 'active', 'processing'] }
      },
      transaction
    });
    const nextPosition = activeEntriesCount + 1;

    // Create session data
    const clientInfo = {
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      referrer: req.get('Referrer') || 'direct',
      timestamp: new Date()
    };

    // Create queue entry
    const queueEntry = await QueueEntry.create({
      eventId,
      userId,
      sessionId,
      position: nextPosition,
      status: 'waiting',
      enteredAt: new Date(),
      queueJoinedAt: new Date(),
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      clientInfo,
      source: 'standard'
    }, { transaction });

    console.log(`✅ User ${userId} joined queue for event ${eventId} at position ${nextPosition}`);

    // Send queue joined email notification
    try {
      const emailService = require('../services/emailService');
      const user = await User.findByPk(userId);
      if (user && event) {
        await emailService.sendQueueJoinedNotification(
          user.email,
          event.name,
          queueEntry.position,
          Math.ceil(queueEntry.position / (event.concurrentUsers || 1))
        );
      }
    } catch (emailError) {
      console.error('❌ Error sending queue joined email:', emailError);
      // Don't fail the request if email fails
    }

    await transaction.commit();

    res.json({
      message: 'Successfully joined queue',
      queue: queueEntry.toPublicJSON()
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Join queue error:', error);
    res.status(500).json({
      message: 'Failed to join queue',
      error: error.message
    });
  }
};

// Get queue status for user
exports.getQueueStatus = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;
    const sessionId = req.sessionID || req.headers['x-session-id'];

    if (!userId && !sessionId) {
      return res.status(400).json({ message: 'User authentication or session ID required' });
    }

    // Build where clause only with defined values
    const where = { eventId };
    if (userId) {
      where.userId = userId;
    } else if (sessionId) {
      where.sessionId = sessionId;
    }

    const queueEntry = await QueueEntry.findOne({
      where,
      order: [['createdAt', 'DESC']]
    });

    if (!queueEntry) {
      return res.status(404).json({ message: 'Not in queue for this event' });
    }

    // Update estimated wait time if still waiting
    if (queueEntry.status === 'waiting') {
      const estimatedWait = await calculateEstimatedWaitTime(eventId, queueEntry.position);
      if (estimatedWait !== queueEntry.estimatedWaitSeconds) {
        await queueEntry.updateEstimatedWait(estimatedWait);
      }
    }

    res.json({
      queueEntry: queueEntry.toPublicJSON()
    });

  } catch (error) {
    console.error('Get queue status error:', error);
    res.status(500).json({
      message: 'Failed to fetch queue status',
      error: error.message
    });
  }
};

// Leave queue
exports.leaveQueue = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;
    const sessionId = req.sessionID || req.headers['x-session-id'];

    // Build where clause only with defined values
    const where = {
      eventId,
              status: { [Op.in]: ['waiting', 'processing', 'active'] }
    };
    if (userId) {
      where.userId = userId;
    } else if (sessionId) {
      where.sessionId = sessionId;
    }

    const queueEntry = await QueueEntry.findOne({ where });

    if (!queueEntry) {
      return res.status(404).json({ message: 'Not in queue for this event' });
    }

    await queueEntry.abandon();

    // Reorder remaining queue positions
    await QueueEntry.reorderPositions(eventId);

    res.json({
      message: 'Successfully left the queue'
    });
  } catch (error) {
    console.error('Leave queue error:', error);
    res.status(500).json({
      message: 'Failed to leave queue',
      error: error.message
    });
  }
};

// Process next queue entry (admin/system function)
exports.processNext = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Check authorization
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.createdById !== req.user.id && 
        event.organizerId !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to manage this event queue' });
    }

    // Find next waiting entry
    const nextEntry = await QueueEntry.findOne({
      where: {
        eventId,
        status: 'waiting'
      },
      order: [['isPriority', 'DESC'], ['position', 'ASC']]
    });

    if (!nextEntry) {
      return res.status(404).json({ message: 'No waiting entries in queue' });
    }

    // Start processing
    await nextEntry.startProcessing();

    // Create purchase session
    const purchaseSession = await PurchaseSession.create({
      queueEntryId: nextEntry.id,
      userId: nextEntry.userId,
      sessionId: nextEntry.sessionId,
      status: 'active',
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 8 * 60 * 1000), // 8 minutes
      slotType: nextEntry.isPriority ? 'vip' : 'standard'
    });

    res.json({
      message: 'Next entry is now processing',
      queueEntry: nextEntry.toPublicJSON(),
      purchaseSession: purchaseSession.toPublicJSON()
    });

  } catch (error) {
    console.error('Process next error:', error);
    res.status(500).json({
      message: 'Failed to process next queue entry',
      error: error.message
    });
  }
};

// Get queue statistics (admin function)
exports.getQueueStatistics = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Check authorization
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.createdById !== req.user.id && 
        event.organizerId !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view queue statistics' });
    }

    const stats = await QueueEntry.getQueueStatsByEvent(eventId);
    const averageWaitTime = await QueueEntry.getAverageWaitTime(eventId);
    const averageProcessingTime = await QueueEntry.getAverageProcessingTime(eventId);

    // Check if automatic processing is active
    const automaticQueueProcessor = require('../services/automaticQueueProcessor');
    const isAutoProcessing = automaticQueueProcessor.isProcessingEvent(eventId);

    // Transform stats to match frontend expectations
    const queueStats = {
      totalInWaitingRoom: stats.waiting || 0,
      totalInQueue: stats.waiting || 0,
      activeUsers: stats.processing || 0,
      completedSessions: stats.completed || 0,
      avgWaitTime: averageWaitTime || 0,
      autoProcessing: isAutoProcessing
    };

    res.json(queueStats);

  } catch (error) {
    console.error('Get queue statistics error:', error);
    res.status(500).json({
      message: 'Failed to fetch queue statistics',
      error: error.message
    });
  }
};

// Extend processing time for queue entry
exports.extendProcessingTime = async (req, res) => {
  try {
    const { entryId } = req.params;
    const { minutes = 2 } = req.body;

    const queueEntry = await QueueEntry.findByPk(entryId, {
      include: [
        {
          model: Event,
          as: 'event'
        }
      ]
    });

    if (!queueEntry) {
      return res.status(404).json({ message: 'Queue entry not found' });
    }

    // Check authorization
    const event = queueEntry.event;
    if (event.createdById !== req.user.id && 
        event.organizerId !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to manage this queue entry' });
    }

    await queueEntry.extendProcessingTime(minutes);

    res.json({
      message: `Processing time extended by ${minutes} minutes`,
      queueEntry: queueEntry.toPublicJSON()
    });

  } catch (error) {
    console.error('Extend processing time error:', error);
    res.status(500).json({
      message: 'Failed to extend processing time',
      error: error.message
    });
  }
};

// Mark queue entry as priority
exports.markAsPriority = async (req, res) => {
  try {
    const { entryId } = req.params;
    const { reason } = req.body;

    const queueEntry = await QueueEntry.findByPk(entryId, {
      include: [
        {
          model: Event,
          as: 'event'
        }
      ]
    });

    if (!queueEntry) {
      return res.status(404).json({ message: 'Queue entry not found' });
    }

    // Check authorization (only admins can mark as priority)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can mark entries as priority' });
    }

    await queueEntry.markAsPriority(req.user.id, reason);

    // Reorder queue to prioritize this entry
    await QueueEntry.reorderPositions(queueEntry.eventId);

    res.json({
      message: 'Queue entry marked as priority',
      queueEntry: queueEntry.toPublicJSON()
    });

  } catch (error) {
    console.error('Mark as priority error:', error);
    res.status(500).json({
      message: 'Failed to mark as priority',
      error: error.message
    });
  }
};

// Get queue entries for event (admin function)
exports.getQueueEntries = async (req, res) => {
  try {
    const { eventId } = req.params;
    const {
      status,
      page = 1,
      limit = 50,
      sortBy = 'position',
      sortOrder = 'ASC'
    } = req.query;

    // Check authorization
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.createdById !== req.user.id && 
        event.organizerId !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view queue entries' });
    }

    const offset = (page - 1) * limit;
    const where = { 
      eventId,
      status: {
        [Op.notIn]: ['completed', 'abandoned', 'expired', 'cancelled', 'left']
      }
    };

    if (status) {
      where.status = status;
    }

    const queueEntries = await QueueEntry.findAndCountAll({
      where,
      include: [
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
      queueEntries: queueEntries.rows.map(entry => entry.toPublicJSON()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(queueEntries.count / limit),
        totalItems: queueEntries.count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get queue entries error:', error);
    res.status(500).json({
      message: 'Failed to fetch queue entries',
      error: error.message
    });
  }
};

// Update queue entry status (admin function)
exports.updateQueueEntryStatus = async (req, res) => {
  try {
    const { entryId } = req.params;
    const { status, reason } = req.body;

    const queueEntry = await QueueEntry.findByPk(entryId, {
      include: [
        {
          model: Event,
          as: 'event'
        }
      ]
    });

    if (!queueEntry) {
      return res.status(404).json({ message: 'Queue entry not found' });
    }

    // Check authorization
    const event = queueEntry.event;
    if (event.createdById !== req.user.id && 
        event.organizerId !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to manage this queue entry' });
    }

    // Update status based on the requested status
    switch (status) {
      case 'processing':
        await queueEntry.startProcessing();
        break;
      case 'completed':
        await queueEntry.complete();
        break;
      case 'abandoned':
        await queueEntry.abandon();
        break;
      case 'expired':
        await queueEntry.expire();
        break;
      case 'cancelled':
        await queueEntry.cancel();
        break;
      default:
        return res.status(400).json({ message: 'Invalid status' });
    }

    // Add admin note if reason provided
    if (reason) {
      await queueEntry.addNotification('admin_action', `Status changed to ${status}: ${reason}`);
    }

    res.json({
      message: `Queue entry status updated to ${status}`,
      queueEntry: queueEntry.toPublicJSON()
    });

  } catch (error) {
    console.error('Update queue entry status error:', error);
    res.status(500).json({
      message: 'Failed to update queue entry status',
      error: error.message
    });
  }
};

// Get user's queues
exports.getUserQueues = async (req, res) => {
  try {
    const userId = req.user.id;

    const userQueues = await QueueEntry.findAll({
      where: {
        userId,
        status: { [Op.in]: ['waiting', 'active', 'processing', 'purchasing', 'expired'] }
      },
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'status', 'startDate']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const queues = userQueues.map(queue => ({
      id: queue.id,
      userId: queue.userId,
      eventId: queue.eventId,
      position: queue.position,
      status: queue.status,
      joinedAt: queue.enteredAt,
      estimatedWaitTime: queue.estimatedWaitSeconds ? Math.round(queue.estimatedWaitSeconds / 60) : null,
      event: queue.event ? {
        id: queue.event.id,
        name: queue.event.name,
        status: queue.event.status,
        startDate: queue.event.startDate
      } : null
    }));

    // Debug log: print all statuses being returned
    console.log('getUserQueues: returning statuses:', queues.map(q => q.status));

    res.json({
      queues
    });

  } catch (error) {
    console.error('Get user queues error:', error);
    res.status(500).json({
      message: 'Failed to fetch user queues',
      error: error.message
    });
  }
};

// Cleanup expired queue entries (system function)
exports.cleanupExpiredEntries = async (req, res) => {
  try {
    const expiredEntries = await QueueEntry.findExpiredEntries();
    
    const cleanupResults = await Promise.all(
      expiredEntries.map(entry => entry.expire())
    );

    res.json({
      message: `Cleaned up ${expiredEntries.length} expired queue entries`,
      cleanedEntries: expiredEntries.length
    });

  } catch (error) {
    console.error('Cleanup expired entries error:', error);
    res.status(500).json({
      message: 'Failed to cleanup expired entries',
      error: error.message
    });
  }
};

// Helper function to calculate estimated wait time
async function calculateEstimatedWaitTime(eventId, position) {
  try {
    const averageProcessingTime = await QueueEntry.getAverageProcessingTime(eventId);
    const processingRate = averageProcessingTime > 0 ? (60 / averageProcessingTime) : 1; // entries per minute
    
    return Math.max(60, Math.round((position - 1) * (60 / processingRate))); // minimum 1 minute
  } catch (error) {
    console.error('Error calculating estimated wait time:', error);
    return 60 * position; // fallback: 1 minute per position
  }
} 