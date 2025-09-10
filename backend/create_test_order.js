const { Order, OrderItem, Ticket, TicketType, Event, User } = require('./src/models');

async function createTestOrder() {
  try {
    console.log('🔍 Finding user, event, and ticket type...');
    
    const user = await User.findOne({ where: { email: 'zainabakram243@gmail.com' } });
    const event = await Event.findOne({ where: { name: 'final test' } });
    const ticketType = await TicketType.findOne({ where: { eventId: event.id } });
    
    if (!user || !event || !ticketType) {
      console.log('❌ Missing data:', { user: !!user, event: !!event, ticketType: !!ticketType });
      return;
    }
    
    console.log('✅ Found data:', { 
      userId: user.id, 
      eventId: event.id, 
      ticketTypeId: ticketType.id 
    });
    
    // Create a new order with paid status
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const order = await Order.create({
      userId: user.id,
      eventId: event.id,
      totalAmount: 169.50,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'dummy',
      orderNumber: orderNumber,
      customerName: user.firstName + ' ' + user.lastName,
      customerEmail: user.email
    });
    
    console.log('✅ Created order:', order.id);
    
    // Create order item
    const orderItem = await OrderItem.create({
      orderId: order.id,
      ticketTypeId: ticketType.id,
      quantity: 1,
      unitPrice: 169.50,
      totalPrice: 169.50
    });
    
    console.log('✅ Created order item:', orderItem.id);
    
    // Create ticket
    const ticketCode = `TKT-${order.id.slice(-8).toUpperCase()}-1`;
    const ticket = await Ticket.create({
      orderItemId: orderItem.id,
      ticketTypeId: ticketType.id,
      eventId: event.id,
      ticketCode: ticketCode,
      ticketNumber: ticketCode,
      holderName: user.firstName + ' ' + user.lastName,
      holderEmail: user.email,
      status: 'active',
      qrCodeToken: ticketCode
    });
    
    console.log('✅ Created ticket:', ticket.id);
    console.log('🎫 New Order ID for testing:', order.id);
    console.log('🎫 Ticket Code:', ticket.ticketCode);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

createTestOrder();
