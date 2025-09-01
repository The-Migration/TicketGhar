const { PurchaseSession, QueueEntry } = require('../models');
const { Op } = require('sequelize');


class PurchaseSessionExpiryService {
  constructor() {
    this.processingInterval = null;
  }

  // Start the expiry service
  start() {
    if (this.processingInterval) {
      console.log('🔄 Purchase session expiry service already running');
      return;
    }

    console.log('🚀 Starting purchase session expiry service');
    
    // Check for expired sessions every 30 seconds
    this.processingInterval = setInterval(async () => {
      await this.checkAndExpireSessions();
    }, 30000); // 30 seconds

    // Initial check
    this.checkAndExpireSessions();
  }

  // Stop the expiry service
  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('⏹️ Stopped purchase session expiry service');
    }
  }

  // Check for expired sessions and handle them
  async checkAndExpireSessions() {
    try {
      const now = new Date();

      // Find active purchase sessions that have expired
      const expiredSessions = await PurchaseSession.findAll({
        where: {
          status: 'active',
          expiresAt: {
            [Op.lt]: now
          }
        },
        include: [
          {
            model: QueueEntry,
            as: 'queueEntry',
            include: [
              {
                model: require('../models').Event,
                as: 'event'
              }
            ]
          }
        ]
      });

      console.log(`🔍 Found ${expiredSessions.length} expired purchase sessions`);

      for (const session of expiredSessions) {
        await this.handleExpiredSession(session);
      }

    } catch (error) {
      console.error('❌ Error checking expired purchase sessions:', error);
    }
  }

  // Handle a single expired session
  async handleExpiredSession(session) {
    try {
      console.log(`⏰ Processing expired session ${session.id} for user ${session.userId}`);

      // Mark the purchase session as expired
      await session.update({ status: 'expired' });

      // Find and update the associated queue entry
      if (session.queueEntry) {
        // Check if the user has actually made any purchases
        const { Order } = require('../models');
        const userOrders = await Order.findAll({
          where: {
            userId: session.userId,
            eventId: session.queueEntry.eventId,
            status: { [Op.in]: ['confirmed', 'paid', 'completed'] }
          }
        });

        if (userOrders.length > 0) {
          // User has made purchases, mark as completed
          await session.queueEntry.update({
            status: 'completed',
            completedAt: new Date(),
            adminNotes: 'Purchase session completed - user made purchases'
          });
          console.log(`✅ Marked queue entry ${session.queueEntry.id} as completed (user made purchases)`);
        } else {
          // User hasn't made purchases, mark as expired but keep them in queue for a bit longer
          await session.queueEntry.update({
            status: 'expired',
            processingExpiresAt: new Date(Date.now() + 2 * 60 * 1000) // Give 2 more minutes
          });
          console.log(`⏰ Marked queue entry ${session.queueEntry.id} as expired (no purchases made)`);
        }

        // Send email notification to user about expired session
        try {
          const emailService = require('./emailService');
          const { User, Event } = require('../models');
          
          const [user, event] = await Promise.all([
            User.findByPk(session.userId),
            Event.findByPk(session.queueEntry.eventId)
          ]);
          
          if (user && event) {
            await emailService.sendSessionExpiredNotification(
              user.email,
              event.name,
              'timeout'
            );
            console.log(`📧 Sent session expired notification to ${user.email} for event ${event.name}`);
          }
        } catch (notificationError) {
          console.error('❌ Error sending session expired email notification:', notificationError);
        }
      } else {
        console.log(`⚠️ No queue entry found for expired session ${session.id}`);
      }

      console.log(`✅ Successfully processed expired session ${session.id}`);

    } catch (error) {
      console.error(`❌ Error handling expired session ${session.id}:`, error);
    }
  }

  // Manually expire a specific session (for admin use)
  async expireSession(sessionId) {
    try {
      const session = await PurchaseSession.findByPk(sessionId, {
        include: [
          {
            model: QueueEntry,
            as: 'queueEntry'
          }
        ]
      });

      if (!session) {
        throw new Error('Session not found');
      }

      await this.handleExpiredSession(session);
      return { success: true, message: 'Session expired successfully' };

    } catch (error) {
      console.error('❌ Error manually expiring session:', error);
      throw error;
    }
  }

  // Get service status
  getStatus() {
    return {
      running: !!this.processingInterval
    };
  }

  // Get statistics about expired sessions
  async getExpiryStats() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [recentExpired, hourlyExpired, dailyExpired] = await Promise.all([
        PurchaseSession.count({
          where: {
            status: 'expired',
            updatedAt: {
              [Op.gte]: new Date(now.getTime() - 10 * 60 * 1000) // Last 10 minutes
            }
          }
        }),
        PurchaseSession.count({
          where: {
            status: 'expired',
            updatedAt: {
              [Op.gte]: oneHourAgo
            }
          }
        }),
        PurchaseSession.count({
          where: {
            status: 'expired',
            updatedAt: {
              [Op.gte]: oneDayAgo
            }
          }
        })
      ]);

      return {
        recentExpired,
        hourlyExpired,
        dailyExpired
      };

    } catch (error) {
      console.error('❌ Error getting expiry stats:', error);
      return {
        recentExpired: 0,
        hourlyExpired: 0,
        dailyExpired: 0
      };
    }
  }
}

// Create singleton instance
const purchaseSessionExpiryService = new PurchaseSessionExpiryService();

module.exports = purchaseSessionExpiryService;
