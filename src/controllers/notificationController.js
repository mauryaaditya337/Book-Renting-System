const Notification = require("../models/Notification");
const asyncHandler = require("../middleware/asyncHandler");

const formatNotification = (notification) => ({
  id: notification._id,
  userId: notification.userId,
  type: notification.type,
  message: notification.message,
  isRead: notification.isRead,
  relatedId: notification.relatedId ? String(notification.relatedId) : "",
  createdAt: notification.createdAt
});

const getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 });

  res.status(200).json({
    notifications: notifications.map(formatNotification)
  });
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!notification) {
    const error = new Error("Notification not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    message: "Notification marked as read",
    notification: formatNotification(notification)
  });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  res.status(200).json({
    message: "All notifications marked as read"
  });
});

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead
};
