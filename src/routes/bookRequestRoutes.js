const express = require("express");
const { body, query } = require("express-validator");

const {
  createBookRequest,
  getOwnBookRequests
} = require("../controllers/bookRequestController");
const { protect, optionalProtect } = require("../middleware/authMiddleware");

const router = express.Router();

const allowedBookRequestFields = [
  "requestedTitle",
  "authorOrSubject",
  "semesterOrCourse",
  "collegeName",
  "note"
];

const createBookRequestValidation = [
  body().custom((value) => {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      throw new Error("Request body must be a valid JSON object");
    }

    const keys = Object.keys(value);
    const unknownFields = keys.filter((key) => !allowedBookRequestFields.includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown field(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  body("requestedTitle")
    .exists({ checkFalsy: true })
    .withMessage("Requested title is required")
    .bail()
    .isString()
    .withMessage("Requested title must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Requested title is required"),
  body("authorOrSubject")
    .optional()
    .isString()
    .withMessage("Author or subject must be a string")
    .bail()
    .trim(),
  body("semesterOrCourse")
    .optional()
    .isString()
    .withMessage("Semester or course must be a string")
    .bail()
    .trim(),
  body("collegeName")
    .optional()
    .isString()
    .withMessage("College name must be a string")
    .bail()
    .trim(),
  body("note")
    .optional()
    .isString()
    .withMessage("Note must be a string")
    .bail()
    .trim()
];

const getOwnBookRequestsValidation = [
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

router.post("/", optionalProtect, createBookRequestValidation, createBookRequest);
router.get("/mine", protect, getOwnBookRequestsValidation, getOwnBookRequests);

module.exports = router;
