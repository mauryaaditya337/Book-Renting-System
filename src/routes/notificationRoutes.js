const express = require("express");
const { param } = require("express-validator");

const {
  getMyNotifications,
  markAsRead,
  markAllAsRead
} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../utils/validateRequest");

const router = express.Router();

const validateNotificationId = [
  param("id").isMongoId().withMessage("Notification id must be a valid MongoDB ObjectId"),
  (req, res, next) => {
    validateRequest(req);
    next();
  }
];

router.get("/", protect, getMyNotifications);
router.patch("/read-all", protect, markAllAsRead);
router.patch("/:id/read", protect, validateNotificationId, markAsRead);

module.exports = router;
