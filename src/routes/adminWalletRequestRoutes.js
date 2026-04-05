const express = require("express");
const { param } = require("express-validator");

const { getAdminWalletRequestById } = require("../controllers/adminWalletRequestController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const validateRequest = require("../utils/validateRequest");

const router = express.Router();

const walletRequestIdValidation = [
  param("id").isMongoId().withMessage("Wallet request id must be a valid MongoDB ObjectId"),
  (req, res, next) => {
    validateRequest(req);
    next();
  }
];

router.get("/:id", protect, adminOnly, walletRequestIdValidation, getAdminWalletRequestById);

module.exports = router;
