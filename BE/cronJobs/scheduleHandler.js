const cron = require("node-cron");
const Booking = require("./models/bookingModel");
const moment = require("moment"); 

cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();
    const tenMinutesLater = moment(now).add(10, "minutes").toDate();
    const scheduledBookings = await Booking.find({
      status: "scheduled",
      scheduledAt: { $lte: tenMinutesLater, $gte: now }, 
    });

    for (const booking of scheduledBookings) {
      booking.status = "pending"; // Activate the booking
      await booking.save(); // Save the updated status
      console.log(`Activated booking: ${booking._id}`);
    }
  } catch (error) {
    console.error("Error activating scheduled bookings:", error);
  }
});
