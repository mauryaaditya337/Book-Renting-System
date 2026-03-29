const Notification = require("../models/Notification");

const createNotification = async ({ userId, type, message, relatedId }) => {
  try {
    await Notification.create({
      userId,
      type,
      message,
      relatedId
    });
  } catch (error) {
    console.error("Failed to create notification:", error.message);
  }
};

module.exports = createNotification;
