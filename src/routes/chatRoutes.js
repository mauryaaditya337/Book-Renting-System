const express = require("express");
const { body, param } = require("express-validator");

const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../utils/validateRequest");
const {
  getChatThreads,
  getChatMessages,
  sendChatMessage
} = require("../controllers/chatController");

const router = express.Router();

const threadIdValidation = [
  param("threadId").isMongoId().withMessage("Thread id must be a valid MongoDB ObjectId")
];

const sendMessageValidation = [
  ...threadIdValidation,
  body().custom((value) => {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      throw new Error("Request body must be a valid JSON object");
    }

    const allowedFields = ["message"];
    const unknownFields = Object.keys(value).filter((key) => !allowedFields.includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown field(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  body("message")
    .exists({ checkFalsy: true })
    .withMessage("Message is required")
    .bail()
    .isString()
    .withMessage("Message must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Message cannot be empty")
];

router.get("/", protect, getChatThreads);
router.get("/:threadId/messages", protect, threadIdValidation, getChatMessages);
router.post("/:threadId/messages", protect, sendMessageValidation, sendChatMessage);

module.exports = router;
