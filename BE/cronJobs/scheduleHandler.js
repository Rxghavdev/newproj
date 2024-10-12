const cron = require('node-cron');
const Booking = require('../models/bookingModel');

cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const bookings = await Booking.find({
      status: 'scheduled',
      scheduledAt: { $lte: now },
    });

    for (const booking of bookings) {
      booking.status = 'pending';
      await booking.save();
      console.log(`Activated booking: ${booking._id}`);
    }
  } catch (error) {
    console.error('Error handling scheduled bookings:', error);
  }
});
