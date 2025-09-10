const { sequelize } = require('./src/config/database');
const { Order, Ticket, OrderItem, Event } = require('./src/models');

async function debugOrderStatus() {
  try {
    console.log('🔍 Debugging order status after refunds...\n');

    // Find the specific orders mentioned in the image
    const orderNumbers = ['TG1756454299301', 'TG1756443163115'];
    
    for (const orderNumber of orderNumbers) {
      console.log(`\n📋 Checking Order: ${orderNumber}`);
      
      const order = await Order.findOne({
        where: { orderNumber },
        include: [
          {
            model: OrderItem,
            as: 'orderItems',
            include: [
              {
                model: Ticket,
                as: 'tickets',
                include: [
                  {
                    model: Event,
                    as: 'event'
                  }
                ]
              }
            ]
          }
        ]
      });

      if (!order) {
        console.log(`❌ Order ${orderNumber} not found`);
        continue;
      }

      console.log(`✅ Order found: ${order.id}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Total Amount: ${order.totalAmount}`);
      console.log(`   Order Items: ${order.orderItems.length}`);

      // Check all tickets in this order
      const allTickets = [];
      for (const orderItem of order.orderItems) {
        console.log(`   Order Item ${orderItem.id}: ${orderItem.tickets.length} tickets`);
        for (const ticket of orderItem.tickets) {
          allTickets.push(ticket);
          console.log(`     Ticket ${ticket.ticketCode}: Status = ${ticket.status}, Refunded = ${ticket.refundedAt ? 'Yes' : 'No'}`);
        }
      }

      console.log(`\n   Total tickets in order: ${allTickets.length}`);
      const refundedTickets = allTickets.filter(t => t.status === 'refunded');
      const activeTickets = allTickets.filter(t => t.status === 'active');
      
      console.log(`   Refunded tickets: ${refundedTickets.length}`);
      console.log(`   Active tickets: ${activeTickets.length}`);

      // Check if all tickets are refunded
      const allRefunded = allTickets.every(ticket => ticket.status === 'refunded');
      console.log(`   All tickets refunded: ${allRefunded}`);

      if (allRefunded && order.status !== 'refunded') {
        console.log(`   ⚠️  ISSUE: All tickets are refunded but order status is still '${order.status}'`);
        
        // Try to update the order status
        console.log(`   🔧 Attempting to fix order status...`);
        await order.update({
          status: 'refunded',
          refundedAt: new Date(),
          refundedBy: 'debug-script',
          refundReason: 'All tickets refunded - fixed by debug script'
        });
        console.log(`   ✅ Order status updated to 'refunded'`);
      } else if (allRefunded && order.status === 'refunded') {
        console.log(`   ✅ Order status is correct: 'refunded'`);
      } else {
        console.log(`   ℹ️  Order status is correct: not all tickets are refunded`);
      }
    }

  } catch (error) {
    console.error('❌ Error debugging order status:', error);
  } finally {
    await sequelize.close();
  }
}

debugOrderStatus();
