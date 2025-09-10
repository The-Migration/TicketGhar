const cron = require('node-cron');
const { Event, QueueEntry } = require('../models');
const { Op } = require('sequelize');
const automaticQueueProcessor = require('./automaticQueueProcessor');
const automaticQueueEntryCreator = require('./automaticQueueEntryCreator');

// Runs every minute
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    
    // 1. Update events whose sale has started
    const eventsSaleStarted = await Event.findAll({
      where: {
        ticketSaleStartTime: { [Op.lte]: now },
        ticketSaleEndTime: { [Op.gt]: now },
        status: { [Op.in]: ['active', 'draft'] }
      }
    });

    if (eventsSaleStarted.length > 0) {
      for (const event of eventsSaleStarted) {
        if (event.status !== 'sale_started') {
          event.status = 'sale_started';
          await event.save();
          console.log(`🎫 Event '${event.name}' (${event.id}) sale started: status updated to sale_started`);
          
          // Add all users to queue when sale starts
          try {
            await automaticQueueEntryCreator.addAllUsersToQueue(event.id);
            console.log(`✅ All users added to queue for event '${event.name}' (${event.id})`);
          } catch (error) {
            console.error(`❌ Error adding users to queue for event ${event.id}:`, error);
          }
          
          // Start automatic queue processing for this event
          await automaticQueueProcessor.startProcessingForEvent(event.id);
        }
      }
    }

    // 2. Update events whose sale has ended
    const eventsSaleEnded = await Event.findAll({
      where: {
        ticketSaleEndTime: { [Op.lt]: now },
        status: { [Op.in]: ['active', 'sale_started'] }
      }
    });

    if (eventsSaleEnded.length > 0) {
      for (const event of eventsSaleEnded) {
        if (event.status !== 'sale_ended') {
          event.status = 'sale_ended';
          await event.save();
          console.log(`⏰ Event '${event.name}' (${event.id}) sale ended: status updated to sale_ended`);
          
          // Stop automatic queue processing for this event
          automaticQueueProcessor.stopProcessingForEvent(event.id);
        }
      }
    }

    // 3. Update events whose event has ended (completed)
    const eventsCompleted = await Event.findAll({
      where: {
        endDate: { [Op.lt]: now },
        status: { [Op.notIn]: ['completed', 'cancelled'] }
      }
    });

    if (eventsCompleted.length > 0) {
      for (const event of eventsCompleted) {
        event.status = 'completed';
        await event.save();
        // Delete all queue entries for this event
        await QueueEntry.destroy({ where: { eventId: event.id } });
        console.log(`✅ Event '${event.name}' (${event.id}) completed: queue cleared and status set to completed`);
      }
    }
  } catch (error) {
    console.error('❌ Error updating event statuses:', error);
  }
});

// Export for server.js to import (even if not used)
module.exports = {}; 