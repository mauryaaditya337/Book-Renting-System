const express = require("express");
const { body, query } = require("express-validator");

const { createFeedback, getMyFeedback } = require("../controllers/feedbackController");
const { protect, optionalProtect } = require("../middleware/authMiddleware");

const router = express.Router();

const allowedFeedbackFields = ["type", "message", "page"];
const allowedFeedbackTypes = ["bug", "suggestion", "general"];

const createFeedbackValidation = [
  body().custom((value) => {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      throw new Error("Request body must be a valid JSON object");
    }

    const keys = Object.keys(value);
    const unknownFields = keys.filter((key) => !allowedFeedbackFields.includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown field(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  body("type")
    .optional()
    .isIn(allowedFeedbackTypes)
    .withMessage("Type must be one of: bug, suggestion, general"),
  body("message")
    .exists({ checkFalsy: true })
    .withMessage("Message is required")
    .bail()
    .isString()
    .withMessage("Message must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Message is required"),
  body("page")
    .optional()
    .isString()
    .withMessage("Page must be a string")
    .bail()
    .trim()
];

const getMyFeedbackValidation = [
  query().custom((value, { req }) => {
    const queryKeys = Object.keys(req.query);
    const unknownFields = queryKeys.filter((key) => !["page", "limit"].includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown query param(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be an integer greater than or equal to 1")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be an integer between 1 and 50")
    .toInt()
];

router.post("/", optionalProtect, createFeedbackValidation, createFeedback);
router.get("/mine", protect, getMyFeedbackValidation, getMyFeedback);

module.exports = router;
