const { QueueEntry, Event, PurchaseSession } = require('../models');
const { Op } = require('sequelize');


class AutomaticQueueProcessor {
  constructor() {
    this.processingEvents = new Set();
    this.processingInterval = null;
  }

  // Start automatic processing for an event
  async startProcessingForEvent(eventId) {
    if (this.processingEvents.has(eventId)) {
      console.log(`🔄 Automatic processing already running for event ${eventId}`);
      return;
    }

    this.processingEvents.add(eventId);
    console.log(`🚀 Starting automatic queue processing for event ${eventId}`);

    // Process queue entries every 30 seconds
    this.processingInterval = setInterval(async () => {
      await this.processNextBatch(eventId);
    }, 30000); // 30 seconds

    // Initial processing
    await this.processNextBatch(eventId);
  }

  // Stop automatic processing for an event
  stopProcessingForEvent(eventId) {
    if (this.processingEvents.has(eventId)) {
      this.processingEvents.delete(eventId);
      console.log(`⏹️ Stopped automatic queue processing for event ${eventId}`);
    }
  }

  // Process next batch of queue entries
  async processNextBatch(eventId) {
    try {
      // Check if event still exists and sale is active
      const event = await Event.findByPk(eventId);
      if (!event) {
        console.log(`❌ Event ${eventId} not found, stopping processing`);
        this.stopProcessingForEvent(eventId);
        return;
      }

      // Check if sale is still active
      const now = new Date();
      const saleStart = new Date(event.ticketSaleStartTime);
      const saleEnd = new Date(event.ticketSaleEndTime);

      if (now < saleStart || now > saleEnd) {
        console.log(`⏸️ Sale not active for event ${eventId}, pausing processing`);
        return;
      }

      // Check if event is sold out
      const { TicketType } = require('../models');
      const availableTicketTypes = await TicketType.findAvailableByEvent(eventId);
      if (availableTicketTypes.length === 0) {
        console.log(`🛑 Event ${eventId} is sold out, stopping processing`);
        this.stopProcessingForEvent(eventId);
        return;
      }

      // Get current processing count
      const currentlyProcessing = await QueueEntry.count({
        where: {
          eventId,
          status: 'active'
        }
      });

      // Calculate how many more users can be processed
      const maxConcurrent = event.concurrentUsers || 1;
      const availableSlots = maxConcurrent - currentlyProcessing;

      if (availableSlots <= 0) {
        console.log(`⏳ Event ${eventId} at max concurrent users (${maxConcurrent}), waiting for slots to open`);
        return;
      }

      // Find waiting entries to process (up to available slots)
      const waitingEntries = await QueueEntry.findAll({
        where: {
          eventId,
          status: 'waiting'
        },
        order: [['isPriority', 'DESC'], ['position', 'ASC']],
        limit: availableSlots
      });

      if (waitingEntries.length === 0) {
        console.log(`⏳ No waiting entries for event ${eventId}`);
        return;
      }

      console.log(`🎯 Processing ${waitingEntries.length} queue entries for event ${eventId} (${currentlyProcessing}/${maxConcurrent} currently processing)`);

      // Process each waiting entry
      for (const entry of waitingEntries) {
        await this.activateQueueEntry(entry);
      }

    } catch (error) {
      console.error(`❌ Error processing queue batch for event ${eventId}:`, error);
    }
  }

  // Activate a single queue entry
  async activateQueueEntry(queueEntry) {
    try {
      console.log(`🎫 Activating queue entry ${queueEntry.id} (position ${queueEntry.position})`);

      // Start processing the entry
      await queueEntry.startProcessing();

      // Create purchase session
      const purchaseSession = await PurchaseSession.create({
        queueEntryId: queueEntry.id,
        userId: queueEntry.userId,
        sessionId: queueEntry.sessionId,
        status: 'active',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 8 * 60 * 1000), // 8 minutes
        slotType: queueEntry.isPriority ? 'vip' : 'standard'
      });

      console.log(`✅ Successfully activated queue entry ${queueEntry.id} with session ${purchaseSession.id}`);

      return purchaseSession;

    } catch (error) {
      console.error(`❌ Error activating queue entry ${queueEntry.id}:`, error);
      throw error;
    }
  }

  // Get processing status for an event
  isProcessingEvent(eventId) {
    return this.processingEvents.has(eventId);
  }

  // Get all events currently being processed
  getProcessingEvents() {
    return Array.from(this.processingEvents);
  }

  // Stop all processing
  stopAllProcessing() {
    this.processingEvents.clear();
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    console.log('🛑 Stopped all automatic queue processing');
  }
}

// Create singleton instance
const automaticQueueProcessor = new AutomaticQueueProcessor();

module.exports = automaticQueueProcessor;
