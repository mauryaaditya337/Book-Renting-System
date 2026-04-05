const express = require("express");
const { param, query } = require("express-validator");

const { getAdminRentals, getAdminRentalById } = require("../controllers/adminRentalController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const validateRequest = require("../utils/validateRequest");

const router = express.Router();

const allowedQueryParams = ["search", "status", "paymentStatus", "settlementStatus"];
const allowedStatuses = ["pending", "approved", "active", "return_pending", "completed", "rejected"];
const allowedPaymentStatuses = ["unpaid", "locked", "settled", "refunded"];
const allowedSettlementStatuses = ["pending", "completed", "refunded"];

const adminRentalsQueryValidation = [
  query().custom((value, { req }) => {
    const queryKeys = Object.keys(req.query);
    const unknownFields = queryKeys.filter((key) => !allowedQueryParams.includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown query param(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  query("search")
    .optional()
    .isString()
    .withMessage("Search must be a string")
    .bail()
    .trim(),
  query("status")
    .optional()
    .isIn(allowedStatuses)
    .withMessage("Status must be one of: pending, approved, active, return_pending, completed, rejected"),
  query("paymentStatus")
    .optional()
    .isIn(allowedPaymentStatuses)
    .withMessage("Payment status must be one of: unpaid, locked, settled, refunded"),
  query("settlementStatus")
    .optional()
    .isIn(allowedSettlementStatuses)
    .withMessage("Settlement status must be one of: pending, completed, refunded"),
  (req, res, next) => {
    validateRequest(req);
    next();
  }
];

const rentalRequestIdValidation = [
  param("id").isMongoId().withMessage("Rental request id must be a valid MongoDB ObjectId"),
  (req, res, next) => {
    validateRequest(req);
    next();
  }
];

router.get("/", protect, adminOnly, adminRentalsQueryValidation, getAdminRentals);
router.get("/:id", protect, adminOnly, rentalRequestIdValidation, getAdminRentalById);

module.exports = router;
