const { sequelize } = require('./src/config/database');
const { Ticket, Order, OrderItem, Event } = require('./src/models');
const { Op } = require('sequelize');

async function checkRefundTickets() {
  try {
    console.log('🔍 Checking refund tickets...\n');

    // Find tickets that have refund approval but are not actually refunded
    const tickets = await Ticket.findAll({
      where: {
        refundApprovedAt: { [Op.ne]: null }
      },
      include: [
        {
          model: Event,
          as: 'event'
        },
        {
          model: OrderItem,
          as: 'orderItem',
          include: [
            {
              model: Order,
              as: 'order'
            }
          ]
        }
      ]
    });

    console.log(`Found ${tickets.length} tickets with refund approval:\n`);

    for (const ticket of tickets) {
      console.log(`🎫 Ticket: ${ticket.ticketCode}`);
      console.log(`   Status: ${ticket.status}`);
      console.log(`   Refund Approved At: ${ticket.refundApprovedAt}`);
      console.log(`   Refund Approved By: ${ticket.refundApprovedBy}`);
      console.log(`   Refunded At: ${ticket.refundedAt || 'Not set'}`);
      console.log(`   Refunded By: ${ticket.refundedBy || 'Not set'}`);
      console.log(`   Event: ${ticket.event?.name}`);
      console.log(`   Order: ${ticket.orderItem?.order?.orderNumber}`);
      console.log(`   Order Status: ${ticket.orderItem?.order?.status}`);
      console.log(`   Order Total: ${ticket.orderItem?.order?.totalAmount}`);
      console.log('');

      // If ticket is approved but not refunded, try to process it
      if (ticket.refundApprovedAt && ticket.status !== 'refunded') {
        console.log(`   ⚠️  ISSUE: Ticket is approved but not refunded!`);
        console.log(`   🔧 Attempting to process refund...`);
        
        try {
          await ticket.processRefund(ticket.refundApprovedBy || 'admin', ticket.refundRequestReason);
          console.log(`   ✅ Refund processed successfully!`);
        } catch (error) {
          console.log(`   ❌ Error processing refund: ${error.message}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error checking refund tickets:', error);
  } finally {
    process.exit(0);
  }
}

checkRefundTickets();
