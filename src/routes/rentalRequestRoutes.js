const express = require("express");
const { body, param, query } = require("express-validator");

const {
  createRentalRequest,
  getIncomingRentalRequests,
  getOutgoingRentalRequests,
  getOwnRentalRequestForBook,
  getOwnerActiveRentalRequests,
  getRenterActiveRentalRequests,
  approveRentalRequest,
  rejectRentalRequest,
  cancelRentalRequest,
  ownerCancelRentalRequest,
  expireStaleRentalRequests,
  startRentalRequest,
  initiateRentalReturn,
  confirmRentalReturn
} = require("../controllers/rentalRequestController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const allowedRentalRequestFields = ["book", "startDate", "endDate"];
const allowedRentalRequestQueryParams = ["status", "page", "limit"];
const allowedRentalRequestStatuses = ["pending", "approved", "active", "return_pending", "completed", "rejected", "cancelled", "expired"];
const allowedOwnerActiveRentalStatuses = ["approved", "active", "return_pending"];
const allowedRenterActiveRentalStatuses = ["active", "return_pending"];

const normalizeDate = (value) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const createRentalRequestValidation = [
  body().custom((value) => {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      throw new Error("Request body must be a valid JSON object");
    }

    const keys = Object.keys(value);
    const unknownFields = keys.filter((key) => !allowedRentalRequestFields.includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown field(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  body("book")
    .exists({ checkFalsy: true })
    .withMessage("Book is required")
    .bail()
    .isMongoId()
    .withMessage("Book must be a valid MongoDB ObjectId"),
  body("startDate")
    .exists({ checkFalsy: true })
    .withMessage("Start date is required")
    .bail()
    .isISO8601()
    .withMessage("Start date must be a valid date")
    .bail()
    .custom((value) => {
      const startDate = normalizeDate(value);
      const today = normalizeDate(new Date());

      if (startDate < today) {
        throw new Error("Start date must be today or later");
      }

      return true;
    })
    .toDate(),
  body("endDate")
    .exists({ checkFalsy: true })
    .withMessage("End date is required")
    .bail()
    .isISO8601()
    .withMessage("End date must be a valid date")
    .bail()
    .custom((value, { req }) => {
      const startDate = normalizeDate(req.body.startDate);
      const endDate = normalizeDate(value);

      if (endDate <= startDate) {
        throw new Error("End date must be later than start date");
      }

      return true;
    })
    .toDate()
];

const getIncomingRentalRequestsValidation = [
  query().custom((value, { req }) => {
    const queryKeys = Object.keys(req.query);
    const unknownFields = queryKeys.filter((key) => !allowedRentalRequestQueryParams.includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown query param(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  query("status")
    .optional()
    .isIn(allowedRentalRequestStatuses)
    .withMessage("Status must be one of: pending, approved, active, return_pending, completed, rejected, cancelled, expired"),
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

const rentalRequestActionValidation = [
  param("id").isMongoId().withMessage("Rental request id must be a valid MongoDB ObjectId")
];

const rejectRentalRequestValidation = [
  ...rentalRequestActionValidation,
  body().custom((value) => {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      throw new Error("Request body must be a valid JSON object");
    }

    const keys = Object.keys(value);
    const unknownFields = keys.filter((key) => key !== "rejectionReason");

    if (unknownFields.length > 0) {
      throw new Error(`Unknown field(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  body("rejectionReason")
    .exists({ checkFalsy: true })
    .withMessage("Rejection reason is required")
    .bail()
    .isString()
    .withMessage("Rejection reason must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Rejection reason is required")
];

const rentalRequestBookValidation = [
  param("bookId").isMongoId().withMessage("Book id must be a valid MongoDB ObjectId")
];

const getOwnerActiveRentalRequestsValidation = [
  query().custom((value, { req }) => {
    const queryKeys = Object.keys(req.query);
    const unknownFields = queryKeys.filter((key) => !allowedRentalRequestQueryParams.includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown query param(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  query("status")
    .optional()
    .isIn(allowedOwnerActiveRentalStatuses)
    .withMessage("Status must be one of: approved, active, return_pending"),
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

const getRenterActiveRentalRequestsValidation = [
  query().custom((value, { req }) => {
    const queryKeys = Object.keys(req.query);
    const unknownFields = queryKeys.filter((key) => !allowedRentalRequestQueryParams.includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown query param(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  query("status")
    .optional()
    .isIn(allowedRenterActiveRentalStatuses)
    .withMessage("Status must be one of: active, return_pending"),
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

router.get("/incoming", protect, getIncomingRentalRequestsValidation, getIncomingRentalRequests);
router.get("/outgoing", protect, getIncomingRentalRequestsValidation, getOutgoingRentalRequests);
router.get("/book/:bookId", protect, rentalRequestBookValidation, getOwnRentalRequestForBook);
router.get("/active/owner", protect, getOwnerActiveRentalRequestsValidation, getOwnerActiveRentalRequests);
router.get("/active/renter", protect, getRenterActiveRentalRequestsValidation, getRenterActiveRentalRequests);
router.put("/:id/approve", protect, rentalRequestActionValidation, approveRentalRequest);
router.put("/:id/reject", protect, rejectRentalRequestValidation, rejectRentalRequest);
router.post("/:id/cancel", protect, rentalRequestActionValidation, cancelRentalRequest);
router.post("/:id/owner-cancel", protect, rentalRequestActionValidation, ownerCancelRentalRequest);
router.patch("/:id/start-rent", protect, rentalRequestActionValidation, startRentalRequest);
router.patch("/:id/initiate-return", protect, rentalRequestActionValidation, initiateRentalReturn);
router.patch("/:id/confirm-return", protect, rentalRequestActionValidation, confirmRentalReturn);
router.post("/expire-stale", protect, expireStaleRentalRequests);
router.post("/", protect, createRentalRequestValidation, createRentalRequest);

module.exports = router;
