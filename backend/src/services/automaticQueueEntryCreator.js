const { QueueEntry, Event, User, PurchaseSession } = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');


class AutomaticQueueEntryCreator {
  constructor() {
    this.processedEvents = new Set();
  }

  // Add all interested users to queue when sale starts
  async addAllUsersToQueue(eventId) {
    try {
      console.log(`🚀 Adding all users to queue for event ${eventId}`);

      // Check if we've already processed this event
      if (this.processedEvents.has(eventId)) {
        console.log(`⏭️ Event ${eventId} already processed, skipping`);
        return;
      }

      // Get the event
      const event = await Event.findByPk(eventId);
      if (!event) {
        console.log(`❌ Event ${eventId} not found`);
        return;
      }

      // Check if event has available tickets
      const { TicketType } = require('../models');
      const availableTicketTypes = await TicketType.findAvailableByEvent(eventId);
      if (availableTicketTypes.length === 0) {
        console.log(`❌ Event ${eventId} has no available ticket types`);
        return;
      }

      // Get all users who might be interested in this event
      // For now, we'll add all users, but in a real system you might want to:
      // 1. Only add users who have shown interest (viewed event, added to wishlist, etc.)
      // 2. Add users who have registered for notifications
      // 3. Add users based on their preferences
      const users = await User.findAll({
        attributes: ['id', 'email', 'firstName', 'lastName', 'role']
      });

      console.log(`👥 Found ${users.length} users to add to queue`);

      // Get the next available position
      const lastQueueEntry = await QueueEntry.findOne({
        where: { eventId },
        order: [['position', 'DESC']]
      });
      let nextPosition = lastQueueEntry ? lastQueueEntry.position + 1 : 1;

      // Create queue entries for all users
      const queueEntries = [];
      for (const user of users) {
        // Check if user already has a queue entry for this event
        const existingEntry = await QueueEntry.findOne({
          where: {
            eventId,
            userId: user.id
          }
        });

        if (existingEntry) {
          console.log(`⏭️ User ${user.email} already has queue entry, skipping`);
          continue;
        }

        // Create session data
        const clientInfo = {
          ipAddress: 'system-generated',
          userAgent: 'Automatic Queue Entry',
          referrer: 'system',
          timestamp: new Date()
        };

        // Create queue entry
        const queueEntry = await QueueEntry.create({
          eventId,
          userId: user.id,
          sessionId: uuidv4(),
          position: nextPosition,
          status: 'waiting',
          enteredAt: new Date(),
          queueJoinedAt: new Date(),
          ipAddress: 'system-generated',
          userAgent: 'Automatic Queue Entry',
          clientInfo,
          source: 'standard'
        });

        queueEntries.push(queueEntry);
        nextPosition++;

        console.log(`✅ Added user ${user.email} to queue at position ${queueEntry.position}`);

        // Send email notification that user has been added to queue
        try {
          const emailService = require('./emailService');
          await emailService.sendQueueJoinedNotification(
            user.email,
            event.name,
            queueEntry.position,
            Math.ceil(queueEntry.position / (event.concurrentUsers || 1))
          );
        } catch (notificationError) {
          console.error(`❌ Error sending queue joined email notification:`, notificationError);
        }
      }

      // Mark this event as processed
      this.processedEvents.add(eventId);

      console.log(`🎉 Successfully added ${queueEntries.length} users to queue for event ${eventId}`);

      return queueEntries;

    } catch (error) {
      console.error(`❌ Error adding users to queue for event ${eventId}:`, error);
      throw error;
    }
  }

  // Check if an event has been processed
  isEventProcessed(eventId) {
    return this.processedEvents.has(eventId);
  }

  // Get all processed events
  getProcessedEvents() {
    return Array.from(this.processedEvents);
  }

  // Reset processed events (for testing)
  resetProcessedEvents() {
    this.processedEvents.clear();
    console.log('🔄 Reset processed events');
  }
}

// Create singleton instance
const automaticQueueEntryCreator = new AutomaticQueueEntryCreator();

module.exports = automaticQueueEntryCreator;
