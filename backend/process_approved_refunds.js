const { sequelize } = require('./src/config/database');
const { Ticket, Order, OrderItem, Event } = require('./src/models');
const { Op } = require('sequelize');

async function processApprovedRefunds() {
  try {
    console.log('🔧 Processing approved refunds with admin override...\n');

    // Find tickets that have refund approval but are not actually refunded
    const tickets = await Ticket.findAll({
      where: {
        refundApprovedAt: { [Op.ne]: null },
        status: { [Op.in]: ['valid', 'active'] }
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

    console.log(`Found ${tickets.length} approved tickets to process:\n`);

    for (const ticket of tickets) {
      console.log(`🎫 Processing Ticket: ${ticket.ticketCode}`);
      console.log(`   Current Status: ${ticket.status}`);
      console.log(`   Event: ${ticket.event?.name}`);
      console.log(`   Order: ${ticket.orderItem?.order?.orderNumber}`);
      console.log(`   Order Status: ${ticket.orderItem?.order?.status}`);
      console.log(`   Order Total: ${ticket.orderItem?.order?.totalAmount}`);

      try {
        // Get the order item to calculate refund amount
        const orderItem = ticket.orderItem;
        if (!orderItem) {
          console.log(`   ❌ No order item found for ticket`);
          continue;
        }

        const refundAmountPerTicket = parseFloat(orderItem.unitPrice);
        console.log(`   💰 Refund Amount: ${refundAmountPerTicket}`);

        // Admin override - process refund regardless of normal restrictions
        await ticket.update({
          status: 'refunded',
          refundedAt: new Date(),
          refundedBy: ticket.refundApprovedBy || 'admin',
          refundReason: ticket.refundRequestReason || 'Admin approved refund',
          adminOverride: true,
          overrideReason: 'Processing previously approved refund',
          adminNotes: `${ticket.adminNotes || ''}\nProcessed approved refund via admin override`
        });

        console.log(`   ✅ Ticket status updated to 'refunded'`);

        // Update event's available tickets count
        const event = ticket.event;
        if (event) {
          await event.increment('availableTickets');
          console.log(`   ✅ Event available tickets incremented`);
        }

        // Update order's total amount to reflect refund
        const order = orderItem.order;
        if (order && order.status === 'paid') {
          const newTotalAmount = parseFloat(order.totalAmount) - refundAmountPerTicket;
          await order.update({
            totalAmount: Math.max(0, newTotalAmount)
          });
          console.log(`   ✅ Order total updated: ${order.totalAmount} → ${newTotalAmount}`);

          // Check if all tickets in the order are now refunded
          const allTickets = await order.getTickets();
          const allRefunded = allTickets.every(t => t.status === 'refunded');
          
          if (allRefunded) {
            await order.update({
              status: 'refunded',
              refundedAt: new Date(),
              refundedBy: ticket.refundApprovedBy || 'admin',
              refundReason: 'All tickets refunded via admin override'
            });
            console.log(`   ✅ Order status updated to 'refunded'`);
          } else {
            console.log(`   ℹ️  Order still has active tickets, status remains 'paid'`);
          }
        }

        console.log(`   🎉 Refund processed successfully!\n`);

      } catch (error) {
        console.log(`   ❌ Error processing refund: ${error.message}\n`);
      }
    }

    console.log('✅ All approved refunds processed!');

  } catch (error) {
    console.error('❌ Error processing approved refunds:', error);
  } finally {
    process.exit(0);
  }
}

processApprovedRefunds();
