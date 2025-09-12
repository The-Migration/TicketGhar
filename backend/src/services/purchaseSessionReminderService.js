const { PurchaseSession, QueueEntry } = require('../models');
const { Op } = require('sequelize');


class PurchaseSessionReminderService {
  constructor() {
    this.reminderIntervals = [5]; // Send reminder after 3 minutes (at 5 minutes remaining out of 8 total)
    this.processingInterval = null;
  }

  // Start the reminder service
  start() {
    if (this.processingInterval) {
      console.log('🔄 Purchase session reminder service already running');
      return;
    }

    console.log('🚀 Starting purchase session reminder service');
    
    // Check for sessions that need reminders every 30 seconds
    this.processingInterval = setInterval(async () => {
      await this.checkAndSendReminders();
    }, 30000); // 30 seconds

    // Initial check
    this.checkAndSendReminders();
  }

  // Stop the reminder service
  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('⏹️ Stopped purchase session reminder service');
    }
  }

  // Check for sessions that need reminders and send them
  async checkAndSendReminders() {
    try {
      const now = new Date();

      for (const minutesLeft of this.reminderIntervals) {
        const targetTime = new Date(now.getTime() + minutesLeft * 60 * 1000);
        
        // Find active purchase sessions that expire in exactly X minutes
        const sessionsNeedingReminders = await PurchaseSession.findAll({
          where: {
            status: 'active',
            expiresAt: {
              [Op.between]: [
                new Date(targetTime.getTime() - 30000), // 30 seconds before
                new Date(targetTime.getTime() + 30000)  // 30 seconds after
              ]
            }
          },
          include: [
            {
              model: QueueEntry,
              as: 'queueEntry'
            }
          ]
        });

        for (const session of sessionsNeedingReminders) {
          await this.sendReminderIfNeeded(session, minutesLeft);
        }
      }

    } catch (error) {
      console.error('❌ Error checking purchase session reminders:', error);
    }
  }

  // Send reminder if it hasn't been sent already
  async sendReminderIfNeeded(session, minutesLeft) {
    try {
      // Check if we've already sent a reminder for this session at this time
      const notifications = session.notifications || [];
      const reminderAlreadySent = notifications.some(notification => 
        notification.type === 'purchase_reminder' && 
        notification.minutesLeft === minutesLeft
      );

      if (reminderAlreadySent) {
        return;
      }

      // Check if user has already purchased tickets for this event
      const { Order } = require('../models');
      const existingOrder = await Order.findOne({
        where: {
          userId: session.userId,
          eventId: session.queueEntry.eventId,
          status: { [Op.in]: ['confirmed', 'paid'] }
        }
      });

      if (existingOrder) {
        console.log(`⏭️  Skipping reminder for session ${session.id} - user already purchased tickets for event ${session.queueEntry.eventId}`);
        return;
      }

      // Send the email reminder
      const emailService = require('./emailService');
      const { User, Event } = require('../models');
      
      const [user, event] = await Promise.all([
        User.findByPk(session.userId),
        Event.findByPk(session.queueEntry.eventId)
      ]);
      
      if (user && event) {
        await emailService.sendPurchaseReminderNotification(
          user.email,
          user.firstName || 'User',
          event.name,
          minutesLeft
        );
      }

      // Mark reminder as sent
      await session.update({
        notifications: [
          ...notifications,
          {
            type: 'purchase_reminder',
            minutesLeft,
            sentAt: new Date(),
            method: 'email'
          }
        ]
      });

      console.log(`✅ Sent ${minutesLeft}-minute reminder for session ${session.id}`);

    } catch (error) {
      console.error(`❌ Error sending reminder for session ${session.id}:`, error);
    }
  }

  // Get service status
  getStatus() {
    return {
      running: !!this.processingInterval,
      reminderIntervals: this.reminderIntervals
    };
  }
}

// Create singleton instance
const purchaseSessionReminderService = new PurchaseSessionReminderService();

module.exports = purchaseSessionReminderService;
