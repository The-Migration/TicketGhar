const { Event } = require('./src/models');

async function listEvents() {
  try {
    console.log('=== LISTING ALL EVENTS ===');
    
    const events = await Event.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    if (events.length === 0) {
      console.log('No events found in database');
      return;
    }
    
    console.log(`Found ${events.length} events:`);
    events.forEach((event, index) => {
      console.log(`\n--- Event ${index + 1} ---`);
      console.log('ID:', event.id);
      console.log('Name:', event.name);
      console.log('Status:', event.status);
      console.log('Sale Start:', event.ticketSaleStartTime);
      console.log('Sale End:', event.ticketSaleEndTime);
      console.log('Created:', event.createdAt);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listEvents().then(() => process.exit(0));
