const express = require("express");
const { body, param } = require("express-validator");

const { createReview, getReviewsForUser } = require("../controllers/reviewController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const createReviewValidation = [
  body().custom((value) => {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      throw new Error("Request body must be a valid JSON object");
    }

    const allowedFields = ["requestId", "rating", "comment"];
    const keys = Object.keys(value);
    const unknownFields = keys.filter((key) => !allowedFields.includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown field(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  body("requestId")
    .exists({ checkFalsy: true })
    .withMessage("Request id is required")
    .bail()
    .isMongoId()
    .withMessage("Request id must be a valid MongoDB ObjectId"),
  body("rating")
    .exists({ checkFalsy: true })
    .withMessage("Rating is required")
    .bail()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be an integer between 1 and 5")
    .toInt(),
  body("comment")
    .optional()
    .isString()
    .withMessage("Comment must be a string")
    .trim()
];

const getReviewsForUserValidation = [
  param("userId").isMongoId().withMessage("User id must be a valid MongoDB ObjectId")
];

router.post("/", protect, createReviewValidation, createReview);
router.get("/user/:userId", getReviewsForUserValidation, getReviewsForUser);

module.exports = router;
