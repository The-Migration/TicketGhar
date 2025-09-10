const { Order, OrderItem, Ticket, Event } = require('./src/models');

async function findOrderTickets() {
  try {
    console.log('🔍 Searching for tickets in order TG1756454299301...');
    
    const order = await Order.findOne({
      where: { id: 'TG1756454299301' },
      include: [
        {
          model: OrderItem,
          as: 'orderItems',
          include: [{
            model: Ticket,
            as: 'tickets',
            include: [{
              model: Event,
              as: 'event',
              attributes: ['name', 'startDate']
            }]
          }]
        }
      ]
    });
    
    if (!order) {
      console.log('❌ Order not found');
      return;
    }
    
    console.log(`✅ Order found: ${order.customerName} - ${order.customerEmail}`);
    console.log(`💰 Total: ${order.totalAmount}`);
    console.log(`📅 Date: ${order.createdAt}`);
    console.log('='.repeat(80));
    
    if (order.orderItems && order.orderItems.length > 0) {
      order.orderItems.forEach((item, itemIndex) => {
        console.log(`📦 Order Item ${itemIndex + 1}:`);
        console.log(`   Quantity: ${item.quantity}`);
        console.log(`   Unit Price: ${item.unitPrice}`);
        console.log(`   Total: ${item.totalPrice}`);
        
        if (item.tickets && item.tickets.length > 0) {
          console.log(`   🎫 Tickets:`);
          item.tickets.forEach((ticket, ticketIndex) => {
            console.log(`      ${ticketIndex + 1}. Code: ${ticket.ticketCode}`);
            console.log(`         Status: ${ticket.status}`);
            console.log(`         Holder: ${ticket.holderName || 'N/A'}`);
            console.log(`         Event: ${ticket.event?.name || 'N/A'}`);
            console.log(`         ` + '-'.repeat(30));
          });
        } else {
          console.log(`   ❌ No tickets found for this item`);
        }
        console.log('');
      });
    } else {
      console.log('❌ No order items found');
    }
    
  } catch (error) {
    console.error('❌ Error finding order tickets:', error);
  }
}

// Run the search
findOrderTickets().then(() => {
  console.log('\n✅ Order ticket search completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Search failed:', error);
  process.exit(1);
});
