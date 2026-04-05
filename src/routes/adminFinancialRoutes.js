const express = require("express");
const { param, query } = require("express-validator");

const {
  getAdminFinancialRentalRequests,
  getAdminFinancialSummary,
  getAdminFinancialRentalRequestById,
  getAdminFinancialUserWallet,
  getAdminFinancialAudit
} = require("../controllers/adminFinancialController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const validateRequest = require("../utils/validateRequest");

const router = express.Router();

const allowedFinancialQueryParams = ["status", "paymentStatus", "settlementStatus"];
const allowedRentalStatuses = ["pending", "approved", "active", "return_pending", "completed", "rejected"];
const allowedPaymentStatuses = ["unpaid", "locked", "settled", "refunded"];
const allowedSettlementStatuses = ["pending", "completed", "refunded"];

const adminFinancialRentalRequestQueryValidation = [
  query().custom((value, { req }) => {
    const queryKeys = Object.keys(req.query);
    const unknownFields = queryKeys.filter((key) => !allowedFinancialQueryParams.includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown query param(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  query("status")
    .optional()
    .isIn(allowedRentalStatuses)
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

const userIdValidation = [
  param("userId").isMongoId().withMessage("User id must be a valid MongoDB ObjectId"),
  (req, res, next) => {
    validateRequest(req);
    next();
  }
];

router.get(
  "/rental-requests",
  protect,
  adminOnly,
  adminFinancialRentalRequestQueryValidation,
  getAdminFinancialRentalRequests
);
router.get(
  "/rental-requests/:id",
  protect,
  adminOnly,
  rentalRequestIdValidation,
  getAdminFinancialRentalRequestById
);
router.get("/summary", protect, adminOnly, getAdminFinancialSummary);
router.get("/audit", protect, adminOnly, getAdminFinancialAudit);
router.get("/users/:userId/wallet", protect, adminOnly, userIdValidation, getAdminFinancialUserWallet);

module.exports = router;
