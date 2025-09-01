const { QueueEntry, TicketType, Event } = require('../models');

class QueueLimitChecker {
  constructor() {
    this.checkingInterval = null;
  }

  start() {
    if (this.checkingInterval) {
      console.log('🔄 Queue limit checker already running');
      return;
    }
    console.log('🚀 Starting queue limit checker service');
    this.checkingInterval = setInterval(async () => {
      await this.checkAndRemoveUsersAtLimit();
    }, 60000); // Check every minute
    this.checkAndRemoveUsersAtLimit(); // Initial check
  }

  stop() {
    if (this.checkingInterval) {
      clearInterval(this.checkingInterval);
      this.checkingInterval = null;
      console.log('⏹️ Stopped queue limit checker service');
    }
  }

  async checkAndRemoveUsersAtLimit() {
    try {
      console.log('🔍 Checking for users who have reached ticket limits...');

      // Get all active queue entries
      const activeQueueEntries = await QueueEntry.findAll({
        where: {
          status: ['waiting', 'active', 'processing']
        },
        include: [
          {
            model: Event,
            as: 'event',
            attributes: ['id', 'name', 'status']
          }
        ]
      });

      let removedCount = 0;

      for (const queueEntry of activeQueueEntries) {
        try {
          // Check if user has reached max limit for this event
          const hasReachedLimit = await this.userHasReachedTicketLimit(
            queueEntry.userId, 
            queueEntry.eventId
          );

          if (hasReachedLimit) {
            console.log(`🚫 User ${queueEntry.userId} has reached ticket limit for event ${queueEntry.eventId}`);
            
            // Remove user from queue
            await queueEntry.update({
              status: 'completed',
              completedAt: new Date(),
              adminNotes: 'Automatically removed - maximum tickets purchased'
            });

            removedCount++;
          }
        } catch (error) {
          console.error(`❌ Error checking user ${queueEntry.userId} for event ${queueEntry.eventId}:`, error);
        }
      }

      if (removedCount > 0) {
        console.log(`✅ Removed ${removedCount} users from queues due to ticket limits`);
      } else {
        console.log('✅ No users found at ticket limits');
      }

    } catch (error) {
      console.error('❌ Error in queue limit checker:', error);
    }
  }

  async userHasReachedTicketLimit(userId, eventId) {
    try {
      // Get all ticket types for this event
      const eventTicketTypes = await TicketType.findAll({
        where: { eventId }
      });

      // Check each ticket type to see if user has reached max limit
      for (const ticketType of eventTicketTypes) {
        const canPurchase = await ticketType.canPurchaseWithLimit(1, userId);
        if (!canPurchase.allowed && canPurchase.reason.includes('You can only purchase')) {
          return true; // User has reached limit for at least one ticket type
        }
      }

      return false; // User can still purchase tickets
    } catch (error) {
      console.error(`❌ Error checking ticket limit for user ${userId} in event ${eventId}:`, error);
      return false; // Default to allowing purchase if there's an error
    }
  }

  // Method to check a specific user for a specific event
  async checkSpecificUser(userId, eventId) {
    try {
      const hasReachedLimit = await this.userHasReachedTicketLimit(userId, eventId);
      
      if (hasReachedLimit) {
        // Find and remove the user's queue entry
        const queueEntry = await QueueEntry.findOne({
          where: {
            eventId,
            userId,
            status: ['waiting', 'active', 'processing']
          }
        });

        if (queueEntry) {
          await queueEntry.update({
            status: 'completed',
            completedAt: new Date(),
            adminNotes: 'Removed - maximum tickets purchased'
          });
          
          console.log(`✅ Removed user ${userId} from queue for event ${eventId} - ticket limit reached`);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error(`❌ Error checking specific user ${userId} for event ${eventId}:`, error);
      return false;
    }
  }
}

// Create singleton instance
const queueLimitChecker = new QueueLimitChecker();

module.exports = queueLimitChecker;
