const express = require("express");
const { body, param, query } = require("express-validator");

const {
  getMyWallet,
  creditUserWallet,
  debitUserWallet,
  createWalletRequest,
  getMyWalletRequests,
  getAllWalletRequests,
  approveWalletRequest,
  rejectWalletRequest,
  getMyWalletTransactions,
  getMyLockedRentals,
  getOwnerLockedRentals,
  getAllWalletTransactions
} = require("../controllers/walletController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const validateRequest = require("../utils/validateRequest");

const router = express.Router();

const allowedAdminWalletFields = ["userId", "amount", "description"];
const allowedWalletRequestFields = ["amount", "note"];
const allowedWalletRequestDecisionFields = ["adminNote"];
const allowedTransactionTypes = ["credit", "debit", "lock", "unlock"];
const allowedTransactionStatuses = ["pending", "success", "failed"];

const adminWalletActionValidation = [
  body().custom((value) => {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      throw new Error("Request body must be a valid JSON object");
    }

    const keys = Object.keys(value);
    const unknownFields = keys.filter((key) => !allowedAdminWalletFields.includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown field(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  body("userId").isMongoId().withMessage("User id must be a valid MongoDB ObjectId"),
  body("amount")
    .isFloat({ gt: 0 })
    .withMessage("Amount must be a number greater than 0")
    .toFloat(),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string")
    .bail()
    .trim(),
  (req, res, next) => {
    validateRequest(req);
    next();
  }
];

const createWalletRequestValidation = [
  body().custom((value) => {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      throw new Error("Request body must be a valid JSON object");
    }

    const keys = Object.keys(value);
    const unknownFields = keys.filter((key) => !allowedWalletRequestFields.includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown field(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  body("amount")
    .isFloat({ gt: 0 })
    .withMessage("Amount must be a number greater than 0")
    .toFloat(),
  body("note")
    .optional()
    .isString()
    .withMessage("Note must be a string")
    .bail()
    .trim(),
  (req, res, next) => {
    validateRequest(req);
    next();
  }
];

const walletRequestIdValidation = [
  param("id").isMongoId().withMessage("Wallet request id must be a valid MongoDB ObjectId"),
  (req, res, next) => {
    validateRequest(req);
    next();
  }
];

const walletRequestDecisionValidation = [
  body().custom((value) => {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      throw new Error("Request body must be a valid JSON object");
    }

    const keys = Object.keys(value);
    const unknownFields = keys.filter((key) => !allowedWalletRequestDecisionFields.includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown field(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  body("adminNote")
    .optional()
    .isString()
    .withMessage("Admin note must be a string")
    .bail()
    .trim(),
  (req, res, next) => {
    validateRequest(req);
    next();
  }
];

const adminTransactionQueryValidation = [
  query("userId")
    .optional()
    .isMongoId()
    .withMessage("User id must be a valid MongoDB ObjectId"),
  query("type")
    .optional()
    .isIn(allowedTransactionTypes)
    .withMessage("Type must be one of: credit, debit, lock, unlock"),
  query("status")
    .optional()
    .isIn(allowedTransactionStatuses)
    .withMessage("Status must be one of: pending, success, failed"),
  (req, res, next) => {
    validateRequest(req);
    next();
  }
];

router.get("/me", protect, getMyWallet);
router.get("/transactions/me", protect, getMyWalletTransactions);
router.get("/locked-rentals/me", protect, getMyLockedRentals);
router.get("/locked-rentals/owner", protect, getOwnerLockedRentals);
router.post("/requests", protect, createWalletRequestValidation, createWalletRequest);
router.get("/requests/me", protect, getMyWalletRequests);
router.get("/admin/requests", protect, adminOnly, getAllWalletRequests);
router.get("/admin/transactions", protect, adminOnly, adminTransactionQueryValidation, getAllWalletTransactions);
router.patch(
  "/admin/requests/:id/approve",
  protect,
  adminOnly,
  walletRequestIdValidation,
  walletRequestDecisionValidation,
  approveWalletRequest
);
router.patch(
  "/admin/requests/:id/reject",
  protect,
  adminOnly,
  walletRequestIdValidation,
  walletRequestDecisionValidation,
  rejectWalletRequest
);
router.post("/admin/credit", protect, adminOnly, adminWalletActionValidation, creditUserWallet);
router.post("/admin/debit", protect, adminOnly, adminWalletActionValidation, debitUserWallet);

module.exports = router;
